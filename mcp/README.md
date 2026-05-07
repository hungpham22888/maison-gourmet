# MCP Server - Maison Gourmet

Server cung cấp các công cụ (tools) cho AI Agent để tương tác trực tiếp với dữ liệu website.

## Cài đặt
```bash
pip install -r requirements.txt
```

## Chạy Server
```bash
python server.py
```

## Cấu hình Systemd (VPS)
Tạo file `/etc/systemd/system/mcp-server.service`:
```ini
[Unit]
Description=Maison Gourmet MCP Server
After=network.target

[Service]
User=root
WorkingDirectory=/opt/maison-gourmet/mcp
ExecStart=/opt/maison-gourmet/venv/bin/python server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Tools Exposed

### Business Tools
- `view_orders_summary(period)` – Xem báo cáo đơn hàng (today/yesterday/this_week)
- `confirm_payment(order_code)` – Xác nhận thanh toán đơn hàng
- `generate_fb_image(prompt, quality)` – Tạo ảnh bằng AI cho Facebook
- `generate_fb_caption(mode, idea)` – Viết caption Facebook bằng AI
- `post_to_facebook_page(image_source, caption)` – Đăng bài lên Facebook Page

### Web Code Editing Tools
- `list_web_files()` – Liệt kê tất cả file web có thể chỉnh sửa
- `read_web_file(filename, start_line, end_line)` – Đọc nội dung file web (tối đa 200 dòng/lần)
- `edit_web_file(filename, search_text, replace_text)` – Chỉnh sửa file web (tự động backup)
- `restore_web_file(filename)` – Khôi phục file web từ backup gần nhất

### Editable Files
```
index.html, style.css, script.js
admin.html, admin.js, admin.css
checkout.html, checkout.js
khao-sat-trung-thu.html
```

### Security
- Whitelist: Chỉ cho phép sửa file web cụ thể
- Anti-traversal: Chặn path traversal (../../../etc/passwd)
- Auto-backup: Tạo backup tự động trước mỗi lần sửa (lưu tại `backups/`)

