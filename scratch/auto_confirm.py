import sqlite3
import requests
import json
import time
import sys
import subprocess
from datetime import datetime

# Set encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

# CONFIG
API_TOKEN = '81GX0VQWFDUOIPKLECYLVQIRKMTHZFMTM3IUYQ5DFJLJS2CPLHT2PCCTUZP1U6BN'
DB_PATH = r'c:\Users\phamh\Desktop\AI Agent\maison-gourmet\brain.db'
SYNC_SCRIPT = r'c:\Users\phamh\Desktop\AI Agent\maison-gourmet\scratch\sync_admin.py'
CHECK_INTERVAL = 5 # seconds

def auto_confirm_loop():
    print("=" * 60)
    print("🚀 MAISON GOURMET - AUTO-CONFIRM SERVICE IS RUNNING")
    print(f"📡 Polling Sepay API every {CHECK_INTERVAL}s...")
    print("=" * 60)
    
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    while True:
        try:
            # 1. Fetch latest transactions
            url = "https://userapi.sepay.vn/v2/transactions"
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            transactions = response.json().get('transactions', [])
            
            # 2. Get all pending orders from DB
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT order_code, id FROM orders WHERE status = 'pending'")
            pending_orders = {row[0]: row[1] for row in cursor.fetchall()}
            
            if pending_orders:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Checking {len(pending_orders)} pending orders...")
                
                payment_detected = False
                for tx in transactions:
                    content = tx.get('transaction_content', '').strip()
                    amount = float(tx.get('amount_in', 0))
                    
                    # Match by Order Code
                    for order_code in pending_orders:
                        if order_code in content:
                            print(f"   💰 MATCH FOUND: {order_code} | Amount: {amount:,.0f}đ")
                            
                            # Update DB
                            cursor.execute("UPDATE orders SET status = 'completed', updated_at = ? WHERE order_code = ?", 
                                         (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), order_code))
                            payment_detected = True
                            print(f"   ✅ Order {order_code} marked as COMPLETED.")
                
                if payment_detected:
                    conn.commit()
                    print("🔄 Triggering Admin Data Sync...")
                    subprocess.run(["python", SYNC_SCRIPT], capture_output=True)
            
            conn.close()
            
        except Exception as e:
            print(f"⚠️ Error in loop: {e}")
        
        time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    auto_confirm_loop()
