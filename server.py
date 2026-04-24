"""
server.py — Entry point cho VPS production.

Chạy:
    gunicorn --bind 0.0.0.0:$PORT --workers 2 server:app
Hoặc dev:
    python server.py
"""
import os
from dotenv import load_dotenv

# Load .env nếu có (dev / VPS)
load_dotenv()

from api.index import app, init_db

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 3000))
    print(f"Maison Gourmet API dang chay tai http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
