import os
import sqlite3
import re
import json
import base64
import requests
from datetime import datetime
from mcp.server.fastmcp import FastMCP
from openai import OpenAI

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None  # python-dotenv chưa cài

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'brain.db')

# --- LOAD .env theo thứ tự ưu tiên ---
def _bootstrap_env():
    """Load .env từ nhiều vị trí: skill → root project → home."""
    if os.getenv("OPENAI_API_KEY"):
        return  # Đã có, không cần load

    candidates = [
        os.path.join(BASE_DIR, "my-skills", "tao-creative-fb", ".env"),
        os.path.join(BASE_DIR, ".env"),
        os.path.expanduser("~/.env"),
        "/etc/maison-gourmet.env",  # fallback cho VPS
    ]

    for path in candidates:
        if os.path.exists(path):
            if load_dotenv:
                load_dotenv(path, override=False)
            else:
                # Manual parse nếu python-dotenv chưa cài
                with open(path, encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ.setdefault(k.strip(), v.strip())
            print(f"[MCP] Loaded env t\u1eeb: {path}")
            break
    else:
        print("[MCP] CANH BAO: Khong tim thay file .env! OPENAI_API_KEY se bi thieu.")

_bootstrap_env()

# OpenAI & Facebook config (sau khi đã load .env)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
FB_PAGE_ID     = os.getenv("FB_PAGE_ID", "")
FB_PAGE_TOKEN  = os.getenv("FB_PAGE_TOKEN", "")

if not OPENAI_API_KEY:
    print("[MCP] WARNING: OPENAI_API_KEY CHUA DUOC SET!")
else:
    print(f"[MCP] OPENAI_API_KEY loaded (starts with: {OPENAI_API_KEY[:12]}...)")
if not FB_PAGE_TOKEN:
    print("[MCP] WARNING: FB_PAGE_TOKEN CHUA DUOC SET!")

# Khoi tao FastMCP native, bind 0.0.0.0:3001
mcp = FastMCP("Maison Gourmet Business Tools", host="0.0.0.0", port=3001, streamable_http_path="/mcp")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# --- TOOLS ---

@mcp.tool()
def view_orders_summary(period: str = "today") -> str:
    """Xem báo cáo TÓM TẮT (chỉ có số lượng và tổng tiền) đơn hàng (today, yesterday, this_week). KHÔNG dùng tool này nếu cần xem chi tiết từng đơn hàng."""
    conn = get_db()
    cur = conn.cursor()
    
    date_filter = "date(order_date) = date('now', 'localtime')"
    if period == "yesterday":
        date_filter = "date(order_date) = date('now', 'localtime', '-1 day')"
    elif period == "this_week":
        date_filter = "date(order_date) >= date('now', 'localtime', 'weekday 0', '-7 days')"
    
    cur.execute(f"SELECT status, COUNT(*) as count, SUM(amount) as total FROM orders WHERE {date_filter} GROUP BY status")
    rows = cur.fetchall()
    
    if not rows:
        return f"Khong co don hang nao trong khoang thoi gian: {period}."
    
    report = [f"BAO CAO DON HANG ({period.upper()}):"]
    grand_total = 0
    for r in rows:
        report.append(f"- {r['status'].capitalize()}: {r['count']} don | {int(r['total']):,} VND")
        grand_total += r['total']
    
    report.append(f"\nTONG DOANH THU: {int(grand_total):,} VND")
    conn.close()
    return "\n".join(report)

@mcp.tool()
def confirm_payment(order_code: str) -> str:
    """Xác nhận thanh toán cho mã đơn hàng (ví dụ: MGM-1234)."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT customer_name FROM orders WHERE order_code = ?", (order_code,))
    order = cur.fetchone()
    
    if not order:
        return f"Khong tim thay don {order_code}."
    
    cur.execute("UPDATE orders SET status = 'completed', updated_at = datetime('now', 'localtime') WHERE order_code = ?", (order_code,))
    conn.commit()
    conn.close()
    return f"Da xac nhan thanh toan don {order_code} ({order['customer_name']})."

@mcp.tool()
def update_stock(product_name: str, new_quantity: int) -> str:
    """Cập nhật kho sản phẩm."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM products WHERE name LIKE ? LIMIT 1", (f"%{product_name}%",))
    p = cur.fetchone()
    
    if not p:
        return f"Khong tim thay san pham '{product_name}'."
    
    cur.execute("UPDATE products SET quantity = ?, updated_at = datetime('now', 'localtime') WHERE id = ?", (new_quantity, p['id']))
    conn.commit()
    conn.close()
    return f"Da cap nhat kho {p['name']} thanh {new_quantity}."

@mcp.tool()
def edit_website(element_id: str, new_text: str) -> str:
    """Chỉnh sửa text trên giao diện website. element_id có thể là 'hero_title' (Tiêu đề chính) hoặc 'hero_desc' (Mô tả)."""
    index_path = os.path.join(BASE_DIR, 'index.html')
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if element_id == 'hero_title':
            content = re.sub(r'(<h1 class="hero-title">).*?(</h1>)', r'\1\n' + new_text + r'\n\2', content, flags=re.DOTALL)
        elif element_id == 'hero_desc':
            content = re.sub(r'(<p class="hero-description">).*?(</p>)', r'\1\n' + new_text + r'\n\2', content, flags=re.DOTALL)
        else:
            return f"Element ID '{element_id}' khong duoc ho tro."
            
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        return f"Da cap nhat {element_id} thanh cong tren website."
    except Exception as e:
        return f"Loi cap nhat web: {str(e)}"

@mcp.tool()
def create_promotion(discount_percent: int, is_active: bool) -> str:
    """Bật/tắt chương trình Flash Sale trên website và chỉnh phần trăm giảm giá."""
    index_path = os.path.join(BASE_DIR, 'index.html')
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if is_active:
            content = re.sub(r'<div class="flash-sale-banner" id="flash-sale-banner" style=".*?">', '<div class="flash-sale-banner" id="flash-sale-banner" style="display: flex;">', content)
            content = re.sub(r'<span>FLASH SALE GIẢM .*? – CHỈ CÒN:</span>', f'<span>FLASH SALE GIẢM {discount_percent}% – CHỈ CÒN:</span>', content)
            res = f"Da BAT Flash Sale {discount_percent}% tren website."
        else:
            content = re.sub(r'<div class="flash-sale-banner" id="flash-sale-banner" style=".*?">', '<div class="flash-sale-banner" id="flash-sale-banner" style="display: none;">', content)
            res = "Da TAT Flash Sale tren website."
            
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        return res
    except Exception as e:
        return f"Loi tao khuyen mai: {str(e)}"
@mcp.tool()
def check_orders() -> str:
    """Kiểm tra và lấy chi tiết các đơn hàng mới chưa thông báo."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, order_code, customer_name, customer_phone, customer_address, amount, product_name, quantity, payment_method, notes FROM orders WHERE is_notified = 0")
    rows = cur.fetchall()
    if not rows:
        conn.close()
        return "Không có đơn hàng mới."
    ids = []
    report = ["CÓ ĐƠN HÀNG MỚI:"]
    for r in rows:
        ids.append(r['id'])
        report.append(
            f"- Đơn {r['order_code']}:\n"
            f"  + Khách: {r['customer_name']} ({r['customer_phone']})\n"
            f"  + SP: {r['product_name']} (SL: {r['quantity']})\n"
            f"  + Tiền: {int(r['amount']):,} VND\n"
            f"  + Thanh toán: {r['payment_method']}\n"
            f"  + Ghi chú: {r['notes'] or 'Không'}"
        )
    cur.execute(f"UPDATE orders SET is_notified = 1 WHERE id IN ({','.join(['?']*len(ids))})", ids)
    conn.commit()
    conn.close()
    return "\n".join(report)


@mcp.tool()
def get_daily_report() -> str:
    """Tổng hợp báo cáo ngày hôm qua (doanh thu, số đơn, số khách)."""
    conn = get_db()
    cur = conn.cursor()
    
    date_filter = "date(order_date) = date('now', 'localtime', '-1 day')"
    
    # Lay tong so don, tong doanh thu, va so luong khach hang doc nhat
    cur.execute(f"SELECT COUNT(id) as total_orders, SUM(amount) as total_revenue, COUNT(DISTINCT COALESCE(customer_phone, customer_name)) as total_customers FROM orders WHERE {date_filter} AND status != 'cancelled'")
    row = cur.fetchone()
    
    if not row or not row['total_orders']:
        conn.close()
        return "Hom qua khong co don hang nao thanh cong."
        
    report = [
        "BAO CAO HOM QUA:",
        f"- Tong so don hang: {row['total_orders']}",
        f"- So luong khach hang: {row['total_customers']}",
        f"- Tong doanh thu: {int(row['total_revenue'] if row['total_revenue'] else 0):,} VND"
    ]
    
    conn.close()
    return "\n".join(report)

@mcp.tool()
def add_product(name: str, price: float, description: str, quantity: int, category: str, image: str = "product_set.png") -> str:
    """Thêm một sản phẩm mới vào cơ sở dữ liệu. Cần cung cấp tên, giá, mô tả, số lượng, danh mục, và hình ảnh."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO products (name, price, description, quantity, category, image, status)
        VALUES (?, ?, ?, ?, ?, ?, 'active')
    ''', (name, price, description, quantity, category, image))
    conn.commit()
    conn.close()
    return f"Da them san pham '{name}' voi gia {int(price):,} VND thanh cong."

@mcp.tool()
def edit_product(product_id: int, name: str = None, price: float = None, description: str = None, quantity: int = None, category: str = None) -> str:
    """Chỉnh sửa thông tin sản phẩm dựa trên product_id. Bỏ trống các trường không muốn thay đổi."""
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    p = cur.fetchone()
    if not p:
        conn.close()
        return f"Khong tim thay san pham co ID {product_id}."
        
    new_name = name if name is not None else p['name']
    new_price = price if price is not None else p['price']
    new_desc = description if description is not None else p['description']
    new_qty = quantity if quantity is not None else p['quantity']
    new_cat = category if category is not None else p['category']
    
    cur.execute('''
        UPDATE products 
        SET name=?, price=?, description=?, quantity=?, category=?, updated_at=datetime('now','localtime')
        WHERE id=?
    ''', (new_name, new_price, new_desc, new_qty, new_cat, product_id))
    conn.commit()
    conn.close()
    return f"Da cap nhat san pham ID {product_id} ('{new_name}') thanh cong."

@mcp.tool()
def complete_order(order_code: str) -> str:
    """Đánh dấu một đơn hàng là đã hoàn thành (completed) và đã giao hàng."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT customer_name FROM orders WHERE order_code = ?", (order_code,))
    order = cur.fetchone()
    
    if not order:
        conn.close()
        return f"Khong tim thay don hang {order_code}."
    
    cur.execute("UPDATE orders SET status = 'completed', updated_at = datetime('now', 'localtime') WHERE order_code = ?", (order_code,))
    conn.commit()
    conn.close()
    return f"Da danh dau don hang {order_code} cua khach {order['customer_name']} la HOAN THANH."

# ─────────────────────────────────────────────────
# FACEBOOK CONTENT TOOLS (Skill: tao-creative-fb)
# ─────────────────────────────────────────────────

@mcp.tool()
def generate_fb_image(prompt: str, quality: str = "low") -> str:
    """
    Tạo ảnh cho bài đăng Facebook bằng OpenAI gpt-image-1.
    - quality='low'    → tiết kiệm chi phí, dùng cho organic post
    - quality='medium' → chất lượng cao hơn, dùng cho creative ads
    Trả về base64 PNG đã được encode, hoặc thông báo lỗi nếu thất bại.
    """
    if not OPENAI_API_KEY:
        return (
            "Lỗi: OPENAI_API_KEY chưa được cấu hình. "
            "Trên VPS, chạy: export OPENAI_API_KEY='sk-...' "
            "hoặc thêm vào /etc/maison-gourmet.env rồi restart MCP server."
        )

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        # gpt-image-1 luon tra ve b64_json mac dinh, KHONG truyen response_format
        response = client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            n=1,
            size="1024x1024",
            quality=quality,
        )
        # b64_json la field mac dinh cua gpt-image-1
        b64_data = response.data[0].b64_json
        if not b64_data:
            return "Loi: API tra ve du lieu rong."

        # Luu PNG vao thu muc assets cua skill
        import time as _time
        ts = int(_time.time())
        save_dir = os.path.join(BASE_DIR, "my-skills", "tao-creative-fb", "assets")
        os.makedirs(save_dir, exist_ok=True)
        img_path = os.path.join(save_dir, f"fb_image_{ts}.png")
        with open(img_path, "wb") as fout:
            fout.write(base64.b64decode(b64_data))

        return f"Tao anh thanh cong! Duong dan: {img_path}"

    except Exception as e:
        return f"Loi tao anh: {str(e)}"


@mcp.tool()
def generate_fb_caption(mode: str, idea: str) -> str:
    """
    Viết caption/ad copy cho bài đăng Facebook bằng GPT-4.
    - mode='organic' → bài đăng hàng ngày (soft CTA, gần gũi, 80-150 từ)
    - mode='ads'     → ad copy chạy quảng cáo (hook mạnh, hard CTA, 80-150 từ)
    - idea: ý tưởng hoặc angle muốn triển khai
    Trả về nội dung caption đã viết.
    """
    if not OPENAI_API_KEY:
        return "Lỗi: OPENAI_API_KEY chưa được cấu hình trong .env của skill."

    brand_voice = (
        "Tone: Gần gũi, vui vẻ, không dùng từ hoa mỹ, hay dùng câu ngắn. "
        "Tránh dùng: synergy, leverage, tối ưu hóa trải nghiệm, corporate. "
        "Phong cách: Câu văn ngắn gọn, trực diện. Dùng tiếng Việt đời thường."
    )

    if mode == "organic":
        system_prompt = (
            f"Bạn là Content Creator của Maison Gourmet.\n"
            f"Viết một bài đăng Facebook dựa trên ý tưởng được cung cấp.\n"
            f"Yêu cầu: 80-150 từ. Cấu trúc: Hook thu hút + Body ngắn gọn + Soft CTA.\n"
            f"Brand Voice: {brand_voice}"
        )
    else:
        system_prompt = (
            f"Bạn là Copywriter chạy quảng cáo của Maison Gourmet.\n"
            f"Viết một Ad Copy dựa trên angle và sản phẩm được cung cấp.\n"
            f"Yêu cầu: 80-150 từ. Cấu trúc: Hook cực mạnh + USP nổi bật + Hard CTA.\n"
            f"Brand Voice: {brand_voice}"
        )

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": f"Ý tưởng/Angle: {idea}"}
            ],
            temperature=0.7
        )
        caption = response.choices[0].message.content.strip()
        return f"Caption đã viết xong:\n\n{caption}"

    except Exception as e:
        return f"Lỗi viết caption: {str(e)}"


@mcp.tool()
def post_to_facebook_page(image_url: str, caption: str) -> str:
    """
    Đăng ảnh + caption lên Facebook Page của Maison Gourmet.
    - image_url: Chấp nhận cả URL công khai (http...) HOẶC đường dẫn file nội bộ trên server (/opt/maison...)
    - caption: nội dung bài đăng
    """
    if not FB_PAGE_ID or not FB_PAGE_TOKEN:
        return "Lỗi: FB_PAGE_ID hoặc FB_PAGE_TOKEN chưa được cấu hình."

    try:
        fb_url = f"https://graph.facebook.com/v21.0/{FB_PAGE_ID}/photos"
        payload = {
            "caption":      caption,
            "access_token": FB_PAGE_TOKEN
        }
        
        # Kiem tra xem image_url la file local hay URL web
        # Neu bat dau bang / hoac C: thi la local path
        is_local = image_url.startswith("/") or (len(image_url) > 2 and image_url[1] == ":")
        
        if is_local:
            if not os.path.exists(image_url):
                return f"Lỗi: Không tìm thấy file ảnh tại đường dẫn: {image_url}"
            
            with open(image_url, "rb") as fimg:
                files = {"source": (os.path.basename(image_url), fimg, "image/png")}
                response = requests.post(fb_url, data=payload, files=files, timeout=60)
        else:
            # Truong hop la URL web cong khai
            payload["url"] = image_url
            response = requests.post(fb_url, data=payload, timeout=60)

        result = response.json()

        if response.status_code == 200 and ("id" in result or "post_id" in result):
            post_id = result.get("id") or result.get("post_id")
            return f"Đăng bài thành công! Post ID: {post_id} | Link: https://www.facebook.com/{post_id}"
        else:
            err = result.get("error", {})
            return f"Đăng bài thất bại từ phía Facebook: {err.get('message', 'Unknown error')} (Code: {err.get('code')})"

    except Exception as e:
        return f"Lỗi hệ thống khi đăng bài: {str(e)}"


if __name__ == "__main__":
    print("Maison Gourmet MCP Server starting on 0.0.0.0:3001 using sse")
    mcp.run("sse")
