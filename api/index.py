from flask import Flask, request, jsonify
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
    # Format: "postgres://user:password@host:port/dbname"
    conn_str = os.environ.get('DATABASE_URL')
    if not conn_str:
        raise Exception("DATABASE_URL environment variable is not set")
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
            cur.close()
            conn.close()
            return jsonify(orders)
            
        if request.method == 'POST':
            data = request.json
            order_code = data.get('order_code') or f"MGM-{datetime.now().strftime('%m%d%H%M')}"
            status = data.get('status', 'pending')
            payment_method = data.get('payment_method', 'Bank')
            
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
