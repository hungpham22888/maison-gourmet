# Deploy Notes — Maison Gourmet

## Tech Stack
- **Backend**: Python 3 + Flask + Gunicorn
- **Database**: SQLite (`brain.db` — file local trên VPS, KHÔNG có trên GitHub)
- **Email**: Resend API
- **Payment**: Sepay Webhook
- **Frontend**: HTML + CSS + JavaScript (static files)

## Biến môi trường cần set trên VPS
Tạo file `/opt/maison-gourmet/.env` với nội dung:

```
RESEND_API_KEY=<lấy từ resend.com dashboard>
PORT=3000
```

## Lệnh chạy server

### Dev / test nhanh
```bash
python server.py
```

### Production (Gunicorn — recommended)
```bash
gunicorn --bind 0.0.0.0:3000 --workers 2 server:app
```

## Cổng đang lắng nghe
- `PORT` env var → mặc định **3000**
- Gunicorn bind: `0.0.0.0:3000`
- Nginx/Caddy reverse proxy từ port 80/443 vào 3000

## Cấu trúc thư mục quan trọng
```
/opt/maison-gourmet/
├── server.py          ← entry point
├── api/
│   ├── index.py       ← Flask routes (SQLite)
│   ├── email_scheduler.py
│   └── resend_service.py
├── brain.db           ← DATABASE (upload bằng scp, KHÔNG pull từ git)
├── .env               ← secrets (tạo tay trên VPS)
├── requirements.txt
└── index.html, style.css, script.js, ...
```

## Lệnh deploy đầy đủ (tóm tắt)
```bash
# 1. Clone repo
git clone https://github.com/hungpham22888/maison-gourmet.git /opt/maison-gourmet
cd /opt/maison-gourmet

# 2. Cài dependencies
pip3 install -r requirements.txt

# 3. Tạo .env
nano .env  # điền RESEND_API_KEY và PORT=3000

# 4. Upload brain.db từ máy local (chạy trên máy của bạn)
scp brain.db root@<VPS_IP>:/opt/maison-gourmet/brain.db

# 5. Tạo systemd service (xem bên dưới)
# 6. Start service
systemctl enable maison-gourmet && systemctl start maison-gourmet
```

## Systemd service template
Tạo `/etc/systemd/system/maison-gourmet.service`:

```ini
[Unit]
Description=Maison Gourmet Website
After=network.target

[Service]
User=root
WorkingDirectory=/opt/maison-gourmet
EnvironmentFile=/opt/maison-gourmet/.env
ExecStart=/usr/bin/gunicorn --bind 0.0.0.0:3000 --workers 2 server:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Endpoints API
| Method | URL | Mô tả |
|--------|-----|--------|
| GET | /api/status | Health check |
| GET/POST | /api/products | Danh sách / thêm sản phẩm |
| PUT | /api/products/:id | Cập nhật sản phẩm |
| GET/POST | /api/customers | Danh sách / thêm khách hàng |
| PUT | /api/customers/:id | Cập nhật khách hàng |
| GET/POST | /api/orders | Danh sách / tạo đơn hàng |
| POST | /api/waitlist | Đăng ký waitlist + email sequence |
| POST | /api/webhook/sepay | Webhook nhận thanh toán Sepay |
