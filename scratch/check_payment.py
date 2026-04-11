import sqlite3
import requests
import json
import sys
from datetime import datetime

# Set encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

# CONFIG
API_TOKEN = 'spsk_live_LtRB1q9WGEVGapGFMMPeSG12xTaJ1c2t'
DB_PATH = r'c:\Users\phamh\Desktop\AI Agent\maison-gourmet\brain.db'

def check_sepay_payments():
    print(f"🔄 Đang kết nối tới Sepay API để kiểm tra giao dịch...")
    
    url = "https://userapi.sepay.vn/v2/transactions"
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        transactions = result.get('transactions', [])
        print(f"📊 Tìm thấy {len(transactions)} giao dịch gần đây.")
        
        if not transactions:
            return

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        processed_count = 0
        
        for tx in transactions:
            content = tx.get('transaction_content', '')
            amount = float(tx.get('amount_in', 0))
            
            # Check if it matches our Order ID format (e.g., MG0411...)
            if content.startswith('MG'):
                order_code = content.strip()
                print(f"🔍 Phát hiện mã đơn hàng: {order_code} - Số tiền: {amount:,.0f}đ")
                
                # Check if order already exists
                cursor.execute("SELECT id, status FROM orders WHERE order_code = ?", (order_code,))
                order = cursor.fetchone()
                
                if order:
                    if order[1] != 'completed':
                        cursor.execute("UPDATE orders SET status = 'completed', updated_at = ? WHERE order_code = ?", 
                                     (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), order_code))
                        print(f"   ✅ Đã cập nhật trạng thái đơn hàng {order_code} thành HOÀN THÀNH.")
                        processed_count += 1
                    else:
                        print(f"   ℹ️ Đơn hàng {order_code} đã được xử lý trước đó.")
                else:
                    # Auto-capture new order from transaction if it doesn't exist in DB yet
                    # (Helpful because static site doesn't write to DB)
                    print(f"   ✨ Phát hiện đơn hàng mới từ Sepay! Đang tự động tạo record...")
                    
                    # We don't have all details (customer name etc) from Sepay, 
                    # but we can record what we have.
                    cursor.execute('''
                        INSERT INTO orders (
                            order_code, customer_name, product_name, amount, 
                            payment_method, status, notes, order_date
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        order_code, 
                        "Khách hàng Sepay", 
                        "Sản phẩm (Tự động cập nhật)", 
                        amount, 
                        "Bank", 
                        "completed", 
                        "Đơn hàng được ghi nhận tự động từ giao dịch Sepay",
                        tx.get('transaction_date', datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
                    ))
                    print(f"   ✅ Đã tạo record đơn hàng mới: {order_code}")
                    processed_count += 1
        
        conn.commit()
        conn.close()
        
        if processed_count > 0:
            print(f"\n🎉 HOÀN TẤT: Đã xử lý {processed_count} giao dịch thành công.")
            # Trigger admin sync
            print("🔄 Đang cập nhật dữ liệu Admin Panel...")
            import subprocess
            subprocess.run(["python", r"c:\Users\phamh\Desktop\AI Agent\maison-gourmet\scratch\sync_admin.py"])
        else:
            print("\n😴 Không có giao dịch mới nào cần xử lý.")
            
    except Exception as e:
        print(f"❌ Lỗi khi kiểm tra thanh toán: {e}")

if __name__ == "__main__":
    check_sepay_payments()
