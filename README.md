# Hướng dẫn Deploy Maison Gourmet lên VPS Linux

Dự án này bao gồm Frontend (HTML/CSS/JS thuần) và Backend API (Python Flask). Để chạy trên VPS Linux (Ubuntu/Debian), hãy làm theo các bước sau:

## 1. Yêu cầu hệ thống
- Môi trường: Ubuntu 20.04 hoặc 22.04.
- Đã cài đặt `python3`, `pip`, và `nginx`.

## 2. Cài đặt Python & Thư viện
Mở Terminal trên VPS và chạy các lệnh:
```bash
# Cập nhật hệ thống
sudo apt update
sudo apt install python3 python3-pip python3-venv nginx -y

# Clone hoặc copy mã nguồn dự án vào thư mục (ví dụ: /var/www/maison-gourmet)
# Chuyển vào thư mục dự án
cd /var/www/maison-gourmet

# Tạo môi trường ảo Python
python3 -m venv venv
source venv/bin/activate

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt
```

## 3. Cấu hình Biến Môi Trường (Environment Variables)
Sao chép file mẫu `.env.example` thành `.env` để cấu hình:
```bash
cp .env.example .env
nano .env
```
Cập nhật nội dung trong `.env`:
- `DATABASE_URL`: Đường link kết nối đến Supabase (PostgreSQL).
- `RESEND_API_KEY`: API Key của Resend.

## 4. Chạy Backend với Gunicorn
Bạn cần cấu hình Systemd để chạy Gunicorn liên tục ở background.
Tạo file service:
```bash
sudo nano /etc/systemd/system/maison_gourmet.service
```
Nội dung file service:
```ini
[Unit]
Description=Gunicorn daemon for Maison Gourmet API
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=/var/www/maison-gourmet
Environment="PATH=/var/www/maison-gourmet/venv/bin"
# Nạp .env file
EnvironmentFile=/var/www/maison-gourmet/.env
ExecStart=/var/www/maison-gourmet/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:5000 api.index:app

[Install]
WantedBy=multi-user.target
```
Sau đó kích hoạt và khởi động lại service:
```bash
sudo systemctl daemon-reload
sudo systemctl start maison_gourmet
sudo systemctl enable maison_gourmet
```

## 5. Cầu hình Nginx (Frontend & Webhook/API Proxy)
Xóa file mặc định và tạo file mới:
```bash
sudo rm /etc/nginx/sites-enabled/default
sudo nano /etc/nginx/sites-available/maison-gourmet
```
Nội dung file cấu hình Nginx:
```nginx
server {
    listen 80;
    server_name your_domain_or_IP;

    # Serve static frontend web
    root /var/www/maison-gourmet;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Proxy phần call api vào server Gunicorn của Python đang chạy ở port 5000
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Kích hoạt cấu hình Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/maison-gourmet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 6. Hoàn thành
Bây giờ trang web đã có thể truy cập qua địa chỉ IP của VPS hoặc tên miền. Webhook từ SePay và Email từ Resend cũng sẽ hoạt động hoàn toàn tự động phía sau server.
