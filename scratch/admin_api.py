from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import subprocess
import os
from datetime import datetime

import sys

# Set encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

app = Flask(__name__)
# Enable CORS globally for all routes
CORS(app) 

DB_PATH = r'c:\Users\phamh\Desktop\AI Agent\maison-gourmet\brain.db'
SYNC_SCRIPT = r'c:\Users\phamh\Desktop\AI Agent\maison-gourmet\scratch\sync_admin.py'

def run_sync():
    print("🔄 Triggering Admin Data Sync...")
    subprocess.run(["python", SYNC_SCRIPT])

@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.json
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO products (name, category, price, quantity, status, image)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (data['name'], data['category'], data['price'], data['quantity'], 'active', 'product_set.png'))
        conn.commit()
        conn.close()
        run_sync()
        return jsonify({"success": True}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/customers', methods=['POST'])
def add_customer():
    data = request.json
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO customers (name, phone, email, address, source, registered_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (data['name'], data['phone'], data['email'], data.get('address', ''), 'manual_entry', datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()
        conn.close()
        run_sync()
        return jsonify({"success": True}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/orders', methods=['POST'])
def add_order():
    data = request.json
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Support both manual admin entry and web checkout entry
        order_code = data.get('order_code')
        if not order_code:
            order_code = f"MGM-{datetime.now().strftime('%m%d%H%M')}"
            
        status = data.get('status', 'completed') # Default to completed for admin manual entry
        payment_method = data.get('payment_method', 'manual')
        
        cursor.execute('''
            INSERT INTO orders (order_code, customer_name, product_name, amount, status, payment_method, order_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (order_code, data['customer_name'], data['product_name'], data['amount'], status, payment_method, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()
        conn.close()
        run_sync()
        return jsonify({"success": True, "order_code": order_code}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/products/<int:prod_id>', methods=['PUT'])
def update_product(prod_id):
    data = request.json
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE products 
            SET name = ?, category = ?, price = ?, quantity = ?
            WHERE id = ?
        ''', (data['name'], data['category'], data['price'], data['quantity'], prod_id))
        conn.commit()
        conn.close()
        run_sync()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/customers/<int:cust_id>', methods=['PUT'])
def update_customer(cust_id):
    data = request.json
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE customers 
            SET name = ?, phone = ?, email = ?, address = ?
            WHERE id = ?
        ''', (data['name'], data['phone'], data['email'], data.get('address', ''), cust_id))
        conn.commit()
        conn.close()
        run_sync()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    data = request.json
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE orders 
            SET customer_name = ?, product_name = ?, amount = ?, status = ?
            WHERE id = ?
        ''', (data['customer_name'], data['product_name'], data['amount'], data['status'], order_id))
        conn.commit()
        conn.close()
        run_sync()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

if __name__ == '__main__':
    print(">>> Admin CRUD API is running on http://127.0.0.1:5000")
    app.run(port=5000, debug=False)
