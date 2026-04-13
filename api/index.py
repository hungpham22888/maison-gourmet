from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Database connection helper
def get_db_connection():
    # In Vercel, this will be set via Environment Variables
    conn_str = os.environ.get('DATABASE_URL')
    if not conn_str:
        print("CRITICAL: DATABASE_URL environment variable is NOT set")
        raise Exception("DATABASE_URL environment variable is not set")
    print(f"Connecting to DB...")
    return psycopg2.connect(conn_str, cursor_factory=RealDictCursor)

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({"status": "Maison Gourmet API is online", "time": datetime.now().isoformat()})

# PRODUCTS
@app.route('/api/products', methods=['GET', 'POST', 'OPTIONS'])
def manage_products():
    if request.method == 'OPTIONS':
        return '', 200
        
    conn = get_db_connection()
    cur = conn.cursor()
    
    if request.method == 'GET':
        cur.execute("SELECT * FROM products ORDER BY id DESC")
        products = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(products)
        
    if request.method == 'POST':
        data = request.json
        cur.execute('''
            INSERT INTO products (name, category, price, quantity, status, image)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (data['name'], data['category'], data['price'], data['quantity'], 'active', 'product_set.png'))
        new_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "id": new_id}), 201

@app.route('/api/products/<int:prod_id>', methods=['PUT', 'OPTIONS'])
def update_product(prod_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        UPDATE products 
        SET name = %s, category = %s, price = %s, quantity = %s, updated_at = NOW()
        WHERE id = %s
    ''', (data['name'], data['category'], data['price'], data['quantity'], prod_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True})

# CUSTOMERS
@app.route('/api/customers', methods=['GET', 'POST', 'OPTIONS'])
def manage_customers():
    if request.method == 'OPTIONS':
        return '', 200
        
    conn = get_db_connection()
    cur = conn.cursor()
    
    if request.method == 'GET':
        cur.execute("SELECT * FROM customers ORDER BY id DESC")
        customers = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(customers)
        
    if request.method == 'POST':
        data = request.json
        cur.execute('''
            INSERT INTO customers (name, phone, email, address, source)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        ''', (data['name'], data['phone'], data['email'], data.get('address', ''), 'manual_entry'))
        new_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "id": new_id}), 201

@app.route('/api/customers/<int:cust_id>', methods=['PUT', 'OPTIONS'])
def update_customer(cust_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        UPDATE customers 
        SET name = %s, phone = %s, email = %s, address = %s, updated_at = NOW()
        WHERE id = %s
    ''', (data['name'], data['phone'], data['email'], data.get('address', ''), cust_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True})

# WAITLIST PROCESSOR
@app.route('/api/waitlist', methods=['POST', 'OPTIONS'])
def manage_waitlist():
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.json
    print(f"Received waitlist: {data['email']}")
    
    # 1. Save to database
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO customers (name, phone, email, source)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        ''', (data['name'], data['phone'], data['email'], 'waitlist'))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print("Database insert failed (possibly duplicate phone/email):", e)
        # Continuing even if db save failed because we still want to trigger emails

    # 2. Trigger Emails 
    try:
        from api.email_scheduler import schedule_waitlist_emails
    except ImportError:
        from email_scheduler import schedule_waitlist_emails
        
    is_test = '+test' in data.get('email', '')
    schedule_waitlist_emails(data['email'], test_mode=is_test)

    return jsonify({"success": True, "message": "Waitlist received and sequence started"}), 200

# ORDERS
@app.route('/api/orders', methods=['GET', 'POST', 'OPTIONS'])
def manage_orders():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if request.method == 'GET':
            cur.execute("SELECT * FROM orders ORDER BY id DESC")
            orders = cur.fetchall()
            print(f"Fetched {len(orders)} orders from DB")
            response = make_response(jsonify(orders))
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            cur.close()
            conn.close()
            return response
            
        if request.method == 'POST':
            data = request.json
            print(f"Processing POST /api/orders for customer: {data.get('customer_name')}")
            order_code = data.get('order_code') or f"MGM-{datetime.now().strftime('%m%d%H%M')}"
            status = data.get('status', 'pending')
            payment_method = data.get('payment_method', 'Bank')
            
            print(f"Executing INSERT for order {order_code}")
            cur.execute('''
                INSERT INTO orders (order_code, customer_name, product_name, amount, status, payment_method, quantity, order_date, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id
            ''', (
                order_code, 
                data['customer_name'], 
                data['product_name'], 
                data['amount'], 
                status, 
                payment_method,
                data.get('quantity', 1)
            ))
            new_id = cur.fetchone()['id']
            conn.commit()
            
            # Send confirmation email if email was provided
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
                    <p>Cảm ơn bạn đã chốt đơn tại Maison Gourmet. Dưới đây là thông tin đơn hàng của bạn:</p>
                    <ul>
                        <li><strong>Mã đơn:</strong> {order_code}</li>
                        <li><strong>Sản phẩm:</strong> {data['product_name']}</li>
                        <li><strong>Thành tiền:</strong> {int(data['amount']):,} VNĐ</li>
                    </ul>
                    <p><strong>Hướng dẫn nhận hàng:</strong> Bên mình sẽ đóng gói cẩn thận và gọi xác nhận gửi đi trong ngày. Bạn nhớ nghe máy thủ kho giúp mình nhé.</p>
                    <p>Nhận được quà ưng ý thì feedback lại cho ae Maison có động lực làm việc nhé.</p>
                    <p>Cảm ơn bạn!</p>
                </div>
                """
                send_email(cust_email, subject, html)

            cur.close()
            conn.close()
            return jsonify({"success": True, "order_code": order_code, "id": new_id}), 201
    except Exception as e:
        print(f"ERROR in manage_orders: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# WEBHOOK for SEPAY
@app.route('/api/webhook/sepay', methods=['POST'])
def sepay_webhook():
    data = request.json
    # Sepay Webhook documentation: https://docs.sepay.vn/tich-hop-webhook.html
    # We look for the order code in the transaction content
    content = data.get('v2_transaction_content', '') or data.get('content', '')
    
    if not content:
        return jsonify({"success": False, "message": "No content"}), 400
        
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Check if any pending order code exists in content
    cur.execute("SELECT order_code FROM orders WHERE status = 'pending'")
    pending_orders = [row['order_code'] for row in cur.fetchall()]
    
    found_order = None
    for code in pending_orders:
        if code in content:
            found_order = code
            break
            
    if found_order:
        cur.execute("UPDATE orders SET status = 'completed', updated_at = NOW() WHERE order_code = %s", (found_order,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "message": f"Order {found_order} completed"}), 200
    
    cur.close()
    conn.close()
    return jsonify({"success": True, "message": "No matching order found"}), 200

if __name__ == '__main__':
    app.run(port=5000)
