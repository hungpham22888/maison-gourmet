import os
import sqlite3
import re
import json
import base64
import requests
from datetime import datetime
from mcp.server.fastmcp import FastMCP
from openai import OpenAI
from starlette.staticfiles import StaticFiles

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'brain.db')

def _bootstrap_env():
    if os.getenv("OPENAI_API_KEY"): return
    candidates = [
        os.path.join(BASE_DIR, "my-skills", "tao-creative-fb", ".env"),
        os.path.join(BASE_DIR, ".env"),
        os.path.expanduser("~/.env"),
        "/etc/maison-gourmet.env",
    ]
    for path in candidates:
        if os.path.exists(path):
            if load_dotenv: load_dotenv(path, override=False)
            else:
                with open(path, encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ.setdefault(k.strip(), v.strip())
            break

_bootstrap_env()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
FB_PAGE_ID     = os.getenv("FB_PAGE_ID", "")
FB_PAGE_TOKEN  = os.getenv("FB_PAGE_TOKEN", "")

mcp = FastMCP("Maison Gourmet Business Tools", host="0.0.0.0", port=3001, streamable_http_path="/mcp")

MCP_DIR    = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(MCP_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)
VPS_PUBLIC_URL = os.getenv("VPS_PUBLIC_URL", "https://maisonpremium.vn/mcp-static")

@mcp.custom_route("/static/{filename}", methods=["GET"])
async def serve_static(request):
    from starlette.responses import FileResponse, Response
    filename = request.path_params["filename"]
    filepath = os.path.join(STATIC_DIR, filename)
    if os.path.exists(filepath): return FileResponse(filepath)
    return Response("Not found", status_code=404)

def get_db():
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row
    return conn

# --- TOOLS ---
@mcp.tool()
def view_orders_summary(period: str = "today") -> str:
    conn = get_db(); cur = conn.cursor()
    date_filter = "date(order_date) = date('now', 'localtime')"
    if period == "yesterday": date_filter = "date(order_date) = date('now', 'localtime', '-1 day')"
    elif period == "this_week": date_filter = "date(order_date) >= date('now', 'localtime', 'weekday 0', '-7 days')"
    cur.execute(f"SELECT status, COUNT(*) as count, SUM(amount) as total FROM orders WHERE {date_filter} GROUP BY status")
    rows = cur.fetchall()
    if not rows: return f"Khong co don hang nao trong khoang thoi gian: {period}."
    report = [f"BAO CAO DON HANG ({period.upper()}):"]
    grand_total = 0
    for r in rows:
        report.append(f"- {r['status'].capitalize()}: {r['count']} don | {int(r['total']):,} VND")
        grand_total += r['total']
    report.append(f"\nTONG DOANH THU: {int(grand_total):,} VND")
    conn.close(); return "\n".join(report)

@mcp.tool()
def confirm_payment(order_code: str) -> str:
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT customer_name FROM orders WHERE order_code = ?", (order_code,))
    order = cur.fetchone()
    if not order: return f"Khong tim thay don {order_code}."
    cur.execute("UPDATE orders SET status = 'completed' WHERE order_code = ?", (order_code,))
    conn.commit(); conn.close()
    return f"Da xac nhan thanh toan don {order_code}."

@mcp.tool()
def generate_fb_image(prompt: str, quality: str = "low") -> str:
    """Tạo ảnh và trả về PUBLIC URL để dùng với post_to_facebook_page."""
    if not OPENAI_API_KEY: return "Lỗi: Thẻ OpenAI chưa cấu hình."
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.images.generate(model="gpt-image-1", prompt=prompt, n=1, size="1024x1024", quality=quality)
        b64_data = response.data[0].b64_json
        filename = f"fb_image_{int(datetime.now().timestamp())}.png"
        img_path = os.path.join(STATIC_DIR, filename)
        with open(img_path, "wb") as f: f.write(base64.b64decode(b64_data))
        return f"{VPS_PUBLIC_URL}/{filename}"
    except Exception as e: return f"Lỗi tạo ảnh: {str(e)}"

@mcp.tool()
def generate_fb_caption(mode: str, idea: str) -> str:
    """Viết caption Facebook."""
    if not OPENAI_API_KEY: return "Lỗi: Thẻ OpenAI chưa cấu hình."
    sys_prompt = f"Bạn là Content Creator của Maison Gourmet. Viết bài {mode} khoảng 100 từ về: {idea}. Tone: Gần gũi."
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role":"system","content":sys_prompt}])
        return response.choices[0].message.content.strip()
    except Exception as e: return f"Lỗi viết bài: {str(e)}"

@mcp.tool()
def post_to_facebook_page(image_source: str, caption: str) -> str:
    """
    Đăng bài lên Facebook. 
    image_source: Phải là URL ảnh hoặc đường dẫn file local.
    caption: Nội dung bài đăng.
    """
    if not FB_PAGE_ID or not FB_PAGE_TOKEN: return "Lỗi: Thiếu ID/Token Facebook."
    try:
        fb_url = f"https://graph.facebook.com/v21.0/{FB_PAGE_ID}/photos"
        # KHÔNG gửi tham số 'url' để ép Facebook dùng file upload
        payload = {"caption": caption, "access_token": FB_PAGE_TOKEN}
        
        # Tìm file local từ URL/Path
        filename = image_source.split("/")[-1].split("?")[0]
        local_path = None
        for p in [os.path.join(STATIC_DIR, filename), image_source.strip()]:
            if os.path.exists(p) and os.path.isfile(p):
                local_path = p; break
        
        if not local_path:
            # Nếu là link ngoài, tải về tạm thời
            if image_source.startswith("http"):
                r = requests.get(image_source, timeout=30)
                if r.status_code == 200:
                    local_path = os.path.join(STATIC_DIR, f"tmp_{filename}")
                    with open(local_path, "wb") as f: f.write(r.content)
        
        if local_path and os.path.exists(local_path):
            with open(local_path, "rb") as fimg:
                files = {"source": (os.path.basename(local_path), fimg, "image/png")}
                response = requests.post(fb_url, data=payload, files=files, timeout=60)
        else:
            return f"Lỗi: Không tìm thấy ảnh tại {image_source}"

        res = response.json()
        if response.status_code == 200:
            return f"Thành công! ID: {res.get('id')}"
        return f"Facebook báo lỗi: {res.get('error', {}).get('message')}"
    except Exception as e: return f"Lỗi hệ thống: {str(e)}"

if __name__ == "__main__":
    mcp.run("sse")
