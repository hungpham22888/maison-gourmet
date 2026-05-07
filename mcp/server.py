import os
import sqlite3
import re
import json
import base64
import shutil
import glob
import subprocess
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

# --- WEB EDITING CONFIG ---
EDITABLE_FILES = {
    'index.html', 'style.css', 'script.js',
    'admin.html', 'admin.js', 'admin.css',
    'checkout.html', 'checkout.js',
    'khao-sat-trung-thu.html'
}
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
os.makedirs(BACKUP_DIR, exist_ok=True)
MAX_READ_LINES = 200  # Giới hạn số dòng đọc mỗi lần
MAX_EDIT_CHARS = 2000  # Giới hạn kích thước replace_text tối đa
ALLOWED_EXTENSIONS = {'.html', '.css', '.js'}  # Phần mở rộng cho file mới

def _validate_web_filename(filename: str, allow_new: bool = False) -> str | None:
    """Validate filename: chống directory traversal, chỉ cho phép file trong whitelist.
    allow_new=True cho phép file chưa có trong whitelist nếu có extension hợp lệ."""
    # Chống traversal: loại bỏ path separators
    clean = os.path.basename(filename.strip())
    if clean != filename.strip():
        return None  # Có chứa path separator -> bị chặn
    if clean not in EDITABLE_FILES:
        if not allow_new:
            return None
        # Cho phép tạo file mới nếu extension hợp lệ
        _, ext = os.path.splitext(clean)
        if ext.lower() not in ALLOWED_EXTENSIONS:
            return None
    filepath = os.path.join(BASE_DIR, clean)
    # Double-check: resolved path phải nằm trong BASE_DIR
    real_path = os.path.realpath(filepath)
    if not real_path.startswith(os.path.realpath(BASE_DIR)):
        return None
    return real_path

def _auto_git_deploy(filename: str, action: str) -> str:
    """Tự động git add, commit, push sau khi thay đổi file web."""
    try:
        git_cmds = [
            ["git", "add", filename],
            ["git", "commit", "-m", f"[MCP Auto] {action}: {filename}"],
            ["git", "push", "origin", "main"]
        ]
        results = []
        for cmd in git_cmds:
            r = subprocess.run(cmd, cwd=BASE_DIR, capture_output=True, text=True, timeout=30)
            if r.returncode != 0 and "nothing to commit" not in r.stdout + r.stderr:
                results.append(f"Git warn: {' '.join(cmd)} -> {r.stderr.strip()[:100]}")
        if results:
            return "\n" + "\n".join(results)
        return "\n🚀 Auto-deploy: Git push thanh cong!"
    except Exception as e:
        return f"\n⚠️ Git deploy loi: {str(e)}"

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

# --- BUSINESS TOOLS ---
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

# --- WEB CODE EDITING TOOLS ---

@mcp.tool()
def list_web_files() -> str:
    """Liệt kê tất cả file web có thể chỉnh sửa (HTML, CSS, JS).
    Trả về danh sách file kèm kích thước và thời gian sửa đổi cuối."""
    results = []
    for fname in sorted(EDITABLE_FILES):
        fpath = os.path.join(BASE_DIR, fname)
        if os.path.exists(fpath):
            stat = os.stat(fpath)
            size_kb = round(stat.st_size / 1024, 1)
            modified = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M")
            # Đếm số dòng
            with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                line_count = sum(1 for _ in f)
            # Kiểm tra backup
            backup_pattern = os.path.join(BACKUP_DIR, f"{fname}.*.bak")
            has_backup = "✅" if glob.glob(backup_pattern) else "—"
            results.append(f"📄 {fname} | {size_kb}KB | {line_count} dòng | Sửa: {modified} | Backup: {has_backup}")
        else:
            results.append(f"⚠️ {fname} | KHÔNG TÌM THẤY")
    header = f"=== DANH SÁCH FILE WEB ({len(results)} files) ===\n"
    return header + "\n".join(results)

@mcp.tool()
def read_web_file(filename: str, start_line: int = 1, end_line: int = 0) -> str:
    """Đọc nội dung file web.
    filename: Tên file (vd: index.html, style.css, script.js).
    start_line: Dòng bắt đầu (mặc định 1).
    end_line: Dòng kết thúc (mặc định 0 = đọc MAX_READ_LINES dòng từ start_line)."""
    filepath = _validate_web_filename(filename)
    if not filepath:
        allowed = ", ".join(sorted(EDITABLE_FILES))
        return f"Lỗi: File '{filename}' không hợp lệ. Chỉ được đọc: {allowed}"
    if not os.path.exists(filepath):
        return f"Lỗi: File '{filename}' không tồn tại trên server."
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            all_lines = f.readlines()
        total = len(all_lines)
        # Xử lý range
        start = max(1, start_line)
        if end_line <= 0:
            end = min(start + MAX_READ_LINES - 1, total)
        else:
            end = min(end_line, total)
        # Giới hạn tối đa
        if (end - start + 1) > MAX_READ_LINES:
            end = start + MAX_READ_LINES - 1
        selected = all_lines[start - 1:end]
        # Format với số dòng
        numbered = []
        for i, line in enumerate(selected, start=start):
            numbered.append(f"{i:4d} | {line.rstrip()}")
        header = f"📄 {filename} (dòng {start}-{end} / tổng {total} dòng)\n"
        header += "=" * 50 + "\n"
        return header + "\n".join(numbered)
    except Exception as e:
        return f"Lỗi đọc file: {str(e)}"

@mcp.tool()
def edit_web_file(filename: str, search_text: str, replace_text: str) -> str:
    """Chỉnh sửa file web bằng cách tìm và thay thế text.
    filename: Tên file cần sửa (vd: index.html).
    search_text: Đoạn text cần tìm (phải chính xác).
    replace_text: Đoạn text thay thế (tối đa 2000 ký tự).
    Tự động tạo backup trước khi sửa và push lên Git."""
    filepath = _validate_web_filename(filename)
    if not filepath:
        allowed = ", ".join(sorted(EDITABLE_FILES))
        return f"Lỗi: File '{filename}' không hợp lệ. Chỉ được sửa: {allowed}"
    if not os.path.exists(filepath):
        return f"Lỗi: File '{filename}' không tồn tại trên server."
    if not search_text or not search_text.strip():
        return "Lỗi: search_text không được để trống."
    if len(replace_text) > MAX_EDIT_CHARS:
        return f"Lỗi: replace_text quá dài ({len(replace_text)} ký tự). Giới hạn tối đa {MAX_EDIT_CHARS} ký tự. Hãy chia nhỏ thay đổi."
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        # Kiểm tra search_text có tồn tại
        count = content.count(search_text)
        if count == 0:
            return f"Lỗi: Không tìm thấy đoạn text trong {filename}. Hãy dùng read_web_file để xem nội dung chính xác."
        if count > 1:
            return f"Cảnh báo: Tìm thấy {count} vị trí khớp trong {filename}. Để an toàn, hãy dùng search_text dài hơn/chính xác hơn để chỉ khớp 1 vị trí duy nhất."
        # Tạo backup trước khi sửa
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{filename}.{timestamp}.bak"
        backup_path = os.path.join(BACKUP_DIR, backup_name)
        shutil.copy2(filepath, backup_path)
        # Thực hiện thay thế
        new_content = content.replace(search_text, replace_text, 1)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        # Tạo diff preview
        search_preview = search_text[:100] + ("..." if len(search_text) > 100 else "")
        replace_preview = replace_text[:100] + ("..." if len(replace_text) > 100 else "")
        # Auto git deploy
        git_result = _auto_git_deploy(filename, "edit")
        return (
            f"✅ Đã sửa file {filename} thành công!\n\n"
            f"📋 Thay đổi:\n"
            f"  ❌ CŨ: {search_preview}\n"
            f"  ✅ MỚI: {replace_preview}\n\n"
            f"💾 Backup: {backup_name}\n"
            f"🔄 Dùng restore_web_file('{filename}') để hoàn tác nếu cần."
            f"{git_result}"
        )
    except Exception as e:
        return f"Lỗi khi sửa file: {str(e)}"

@mcp.tool()
def create_web_file(filename: str, content: str) -> str:
    """Tạo file web mới (HTML, CSS, JS).
    filename: Tên file mới (vd: landing-page.html, promo.css).
    content: Nội dung file (tối đa 2000 ký tự).
    File mới sẽ được tự động thêm vào whitelist và push lên Git."""
    if len(content) > MAX_EDIT_CHARS:
        return f"Lỗi: Nội dung quá dài ({len(content)} ký tự). Giới hạn tối đa {MAX_EDIT_CHARS} ký tự. Hãy tạo file cơ bản trước, sau đó dùng edit_web_file để thêm nội dung."
    filepath = _validate_web_filename(filename, allow_new=True)
    if not filepath:
        exts = ", ".join(sorted(ALLOWED_EXTENSIONS))
        return f"Lỗi: File '{filename}' không hợp lệ. Chỉ cho phép tạo file có đuôi: {exts}. Tên file không được chứa đường dẫn."
    if os.path.exists(filepath):
        return f"Lỗi: File '{filename}' đã tồn tại. Dùng edit_web_file để chỉnh sửa."
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        # Thêm vào whitelist để có thể edit sau này
        EDITABLE_FILES.add(filename.strip())
        # Auto git deploy
        git_result = _auto_git_deploy(filename, "create")
        return (
            f"✅ Đã tạo file {filename} thành công!\n"
            f"📄 Kích thước: {len(content)} ký tự\n"
            f"📝 File đã được thêm vào danh sách có thể chỉnh sửa.\n"
            f"💡 Dùng edit_web_file('{filename}', ...) để chỉnh sửa tiếp."
            f"{git_result}"
        )
    except Exception as e:
        return f"Lỗi tạo file: {str(e)}"

@mcp.tool()
def restore_web_file(filename: str) -> str:
    """Khôi phục file web về phiên bản backup gần nhất.
    filename: Tên file cần khôi phục (vd: index.html)."""
    filepath = _validate_web_filename(filename)
    if not filepath:
        allowed = ", ".join(sorted(EDITABLE_FILES))
        return f"Lỗi: File '{filename}' không hợp lệ. Chỉ được khôi phục: {allowed}"
    try:
        # Tìm backup mới nhất
        backup_pattern = os.path.join(BACKUP_DIR, f"{filename}.*.bak")
        backups = sorted(glob.glob(backup_pattern), reverse=True)
        if not backups:
            return f"Lỗi: Không tìm thấy backup nào cho {filename}."
        latest_backup = backups[0]
        backup_name = os.path.basename(latest_backup)
        # Khôi phục
        shutil.copy2(latest_backup, filepath)
        # Liệt kê các backup còn lại
        backup_list = "\n".join([f"  • {os.path.basename(b)}" for b in backups[:5]])
        # Auto git deploy
        git_result = _auto_git_deploy(filename, "restore")
        return (
            f"✅ Đã khôi phục {filename} từ backup: {backup_name}\n\n"
            f"📦 Các backup hiện có ({len(backups)} bản):\n{backup_list}"
            f"{git_result}"
        )
    except Exception as e:
        return f"Lỗi khôi phục: {str(e)}"

if __name__ == "__main__":
    mcp.run("sse")
