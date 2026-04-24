from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ── Database path: luôn dùng brain.db ở root project ─────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'brain.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # trả dict-like rows
    conn.execute("PRAGMA journal_mode=WAL")  # cho phép đọc đồng thời
    return conn

def init_db():
    """Đảm bảo các bảng tồn tại khi server khởi động."""
    conn = get_db()
    cur = conn.cursor()
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS products (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            price       REAL NOT NULL DEFAULT 0,
            description TEXT,
            quantity    INTEGER NOT NULL DEFAULT 0,
            category    TEXT DEFAULT 'Quà tặng',
            image       TEXT,
            status      TEXT DEFAULT 'active',
            created_at  TEXT DEFAULT (datetime('now','localtime')),
            updated_at  TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS customers (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT NOT NULL,
            phone         TEXT,
            zalo          TEXT,
            email         TEXT,
            address       TEXT,
            source        TEXT DEFAULT 'website',
            notes         TEXT,
            registered_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at    TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS orders (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            order_code     TEXT NOT NULL,
            customer_id    INTEGER,
            customer_name  TEXT NOT NULL,
            customer_phone TEXT,
            product_id     INTEGER,
            product_name   TEXT NOT NULL,
            quantity       INTEGER NOT NULL DEFAULT 1,
            amount         REAL NOT NULL DEFAULT 0,
            payment_method TEXT DEFAULT 'Bank',
            status         TEXT NOT NULL DEFAULT 'pending',
            notes          TEXT,
            order_date     TEXT DEFAULT (datetime('now','localtime')),
            updated_at     TEXT DEFAULT (datetime('now','localtime'))
        );
    """)
    conn.commit()
    conn.close()

# ── HEALTH ───────────────────────────────────────────────────────────────────
@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({"status": "Maison Gourmet API is online", "time": datetime.now().isoformat()})

# ── PRODUCTS ──────────────────────────────────────────────────────────────────
@app.route('/api/products', methods=['GET', 'POST', 'OPTIONS'])
def manage_products():
    if request.method == 'OPTIONS':
        return '', 200

    conn = get_db()
    cur = conn.cursor()

    if request.method == 'GET':
        cur.execute("SELECT * FROM products ORDER BY id DESC")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return jsonify(rows)

    if request.method == 'POST':
        data = request.json
        cur.execute("""
            INSERT INTO products (name, category, price, quantity, status, image)
            VALUES (?, ?, ?, ?, 'active', 'product_set.png')
        """, (data['name'], data['category'], data['price'], data['quantity']))
        new_id = cur.lastrowid
        conn.commit()
        conn.close()
        return jsonify({"success": True, "id": new_id}), 201

@app.route('/api/products/<int:prod_id>', methods=['PUT', 'OPTIONS'])
def update_product(prod_id):
    if request.method == 'OPTIONS':
        return '', 200

    data = request.json
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        UPDATE products
        SET name=?, category=?, price=?, quantity=?,
            updated_at=datetime('now','localtime')
        WHERE id=?
    """, (data['name'], data['category'], data['price'], data['quantity'], prod_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# ── CUSTOMERS ─────────────────────────────────────────────────────────────────
@app.route('/api/customers', methods=['GET', 'POST', 'OPTIONS'])
def manage_customers():
    if request.method == 'OPTIONS':
        return '', 200

    conn = get_db()
    cur = conn.cursor()

    if request.method == 'GET':
        cur.execute("SELECT * FROM customers ORDER BY id DESC")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return jsonify(rows)

    if request.method == 'POST':
        data = request.json
        cur.execute("""
            INSERT INTO customers (name, phone, email, address, source)
            VALUES (?, ?, ?, ?, 'manual_entry')
        """, (data['name'], data['phone'], data['email'], data.get('address', '')))
        new_id = cur.lastrowid
        conn.commit()
        conn.close()
        return jsonify({"success": True, "id": new_id}), 201

@app.route('/api/customers/<int:cust_id>', methods=['PUT', 'OPTIONS'])
def update_customer(cust_id):
    if request.method == 'OPTIONS':
        return '', 200

    data = request.json
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        UPDATE customers
        SET name=?, phone=?, email=?, address=?,
            updated_at=datetime('now','localtime')
        WHERE id=?
    """, (data['name'], data['phone'], data['email'], data.get('address', ''), cust_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# ── WAITLIST ──────────────────────────────────────────────────────────────────
@app.route('/api/waitlist', methods=['POST', 'OPTIONS'])
def manage_waitlist():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.json
    print(f"Received waitlist: {data['email']}")

    # 1. Lưu vào database
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO customers (name, phone, email, source)
            VALUES (?, ?, ?, 'waitlist')
        """, (data['name'], data['phone'], data['email']))
        conn.commit()
        conn.close()
    except Exception as e:
        print("Database insert failed (possibly duplicate):", e)

    # 2. Gửi email sequence
    try:
        from api.email_scheduler import schedule_waitlist_emails
    except ImportError:
        from email_scheduler import schedule_waitlist_emails

    is_test = '+test' in data.get('email', '')
    schedule_waitlist_emails(data['email'], test_mode=is_test)

    return jsonify({"success": True, "message": "Waitlist received and sequence started"}), 200

# ── ORDERS ────────────────────────────────────────────────────────────────────
@app.route('/api/orders', methods=['GET', 'POST', 'OPTIONS'])
def manage_orders():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        conn = get_db()
        cur = conn.cursor()

        if request.method == 'GET':
            cur.execute("SELECT * FROM orders ORDER BY id DESC")
            rows = [dict(r) for r in cur.fetchall()]
            print(f"Fetched {len(rows)} orders from DB")
            response = make_response(jsonify(rows))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            conn.close()
            return response

        if request.method == 'POST':
            data = request.json
            print(f"Processing POST /api/orders for: {data.get('customer_name')}")
            order_code = data.get('order_code') or f"MGM-{datetime.now().strftime('%m%d%H%M')}"
            status = data.get('status', 'pending')
            payment_method = data.get('payment_method', 'Bank')

            cur.execute("""
                INSERT INTO orders
                    (order_code, customer_name, customer_phone, product_name,
                     amount, status, payment_method, quantity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                order_code,
                data['customer_name'],
                data.get('customer_phone', ''),
                data['product_name'],
                data['amount'],
                status,
                payment_method,
                data.get('quantity', 1)
            ))
            new_id = cur.lastrowid
            conn.commit()
            conn.close()

            # Gửi email xác nhận nếu có
            cust_email = data.get('customer_email')
            if cust_email:
                try:
                    from api.resend_service import send_email
                except ImportError:
                    from resend_service import send_email

                subject = f"Xác nhận đơn hàng Maison Gourmet (Mã: {order_code})"
                html = f"""
                <div style='font-family:sans-serif; line-height:1.6; color:#333'>
                    <p>Chào {data['customer_name']},</p>
                    <p>Cảm ơn bạn đã chốt đơn tại Maison Gourmet. Dưới đây là thông tin đơn hàng:</p>
                    <ul>
                        <li><strong>Mã đơn:</strong> {order_code}</li>
                        <li><strong>Sản phẩm:</strong> {data['product_name']}</li>
                        <li><strong>Thành tiền:</strong> {int(data['amount']):,} VNĐ</li>
                    </ul>
                    <p><strong>Hướng dẫn nhận hàng:</strong> Bên mình sẽ đóng gói cẩn thận và gọi xác nhận gửi đi trong ngày.</p>
                    <p>Nhận được quà ưng ý thì feedback lại cho ae Maison nhé!</p>
                </div>
                """
                send_email(cust_email, subject, html)

            return jsonify({"success": True, "order_code": order_code, "id": new_id}), 201

    except Exception as e:
        print(f"ERROR in manage_orders: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# ── SEPAY WEBHOOK ─────────────────────────────────────────────────────────────
@app.route('/api/webhook/sepay', methods=['POST'])
def sepay_webhook():
    data = request.json
    content = data.get('v2_transaction_content', '') or data.get('content', '')

    if not content:
        return jsonify({"success": False, "message": "No content"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT order_code FROM orders WHERE status='pending'")
    pending_orders = [row['order_code'] for row in cur.fetchall()]

    found_order = None
    for code in pending_orders:
        if code in content:
            found_order = code
            break

    if found_order:
        cur.execute("""
            UPDATE orders SET status='completed',
            updated_at=datetime('now','localtime')
            WHERE order_code=?
        """, (found_order,))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": f"Order {found_order} completed"}), 200

    conn.close()
    return jsonify({"success": True, "message": "No matching order found"}), 200

# ── MAIN ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 3000))
    print(f"Starting Maison Gourmet API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
