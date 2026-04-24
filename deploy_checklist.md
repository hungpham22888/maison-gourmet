# Báo Cáo Kiểm Tra Kỹ Thuật & Checklist Deploy VPS Linux

## 1. Ngôn ngữ và Framework đang sử dụng
- **Frontend (Giao diện):** HTML, CSS, JavaScript thuần (Vanilla JS), không dùng framework build phức tạp như React/Next.js. Được setup để serve static.
- **Backend (API):** Python sử dụng framework **Flask**. Kết nối database bằng `psycopg2` (dùng PostgreSQL / Supabase).
- **Cấu hình hiện tại:** Dự án đang được cấu hình để deploy lên nền tảng đám mây Vercel (`vercel.json`), nhưng hoàn toàn có thể chạy trên VPS độc lập.

## 2. File cần bổ sung để chạy trên VPS
Do VPS không giống Vercel (không tự động quản lý server), bạn sẽ cần thêm:
- File `.env`: Để chứa các biến môi trường thay vì text thuần.
- Thêm thư viện `gunicorn` và `python-dotenv` vào file `requirements.txt` (Dùng để chạy server production Flask, thay vì chạy debug mode `app.run()`).
- File `gunicorn.service` (nếu dùng systemd) hoặc cấu hình `ecosystem.config.js` (nếu dùng PM2) để giữ cho backend Python chạy nền 24/7.
- Cấu hình Nginx (`nginx.conf` cơ bản) để làm server tĩnh cho giao diện và chuyển hướng (proxy_pass) phần `/api` sang server Python.

## 3. Cảnh báo Bảo mật (API Key bị lộ)
⚠️ **NGUY HIỂM:** File `resend_config.txt` đang chứa trực tiếp API Key thật của Resend (`re_2jqEwGB4_...`).
- Nếu bạn push thư mục này lên GitHub/GitLab public, người khác có thể dùng API key này để gửi spam email.
- **Giải pháp:** Cần xóa file này và chuyển API Key đó vào biến môi trường trong file `.env`. Trong `api/resend_service.py` hiện đã có code hỗ trợ lấy từ `os.environ` nên chỉ cần khai báo biến là chạy mượt.

## 4. Checklist cần thực hiện trước và trong lúc deploy
- [x] Xóa bỏ file chứa khóa bảo mật `resend_config.txt` và chuyển khóa này vào file `.env`.
- [x] Tạo file `.env.example` (bản mẫu của `.env` không chứa key thật) để lưu trữ cấu trúc.
- [x] Bổ sung `.env` và `__pycache__` vào file `.gitignore` để không bị push nhầm lên git.
- [x] Bổ sung `gunicorn` và `python-dotenv` vào `requirements.txt`.
- [x] Tạo file `README.md` có hướng dẫn cài đặt cơ bản trên VPS (cách cài Nginx, cách chạy dịch vụ).
- [ ] Mở sẵn port 80 (HTTP) và 443 (HTTPS) trên firewall của VPS Linux.
- [ ] Đảm bảo Biến môi trường Database (`DATABASE_URL` Supabase) được config đúng khi chạy trên server.
