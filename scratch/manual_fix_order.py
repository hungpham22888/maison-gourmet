import sqlite3
import sys
from datetime import datetime

# Set encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

def fix_order():
    conn = sqlite3.connect('brain.db')
    cursor = conn.cursor()
    
    order_code = 'MG04115375'
    customer_name = 'Khách hàng Test 2k'
    product_name = 'Set Quà Demo (Test 2k)'
    amount = 2000
    status = 'completed'
    payment_method = 'Bank'
    order_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    try:
        cursor.execute('''
            INSERT INTO orders (order_code, customer_name, product_name, amount, status, payment_method, order_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (order_code, customer_name, product_name, amount, status, payment_method, order_date))
        conn.commit()
        print(f">>> Successfully inserted pending order {order_code} into database.")
    except Exception as e:
        print(f"Error inserting order: {e}")
    
    # Also trigger a sync so the frontend sees it
    import subprocess
    subprocess.run(["python", "scratch/sync_admin.py"])
    conn.close()

if __name__ == "__main__":
    fix_order()
