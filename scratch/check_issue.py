import sqlite3
import requests
import sys

# Set encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

API_TOKEN = '81GX0VQWFDUOIPKLECYLVQIRKMTHZFMTM3IUYQ5DFJLJS2CPLHT2PCCTUZP1U6BN'

def debug_payment():
    print("--- 1. DATABASE CHECK ---")
    conn = sqlite3.connect('brain.db')
    cursor = conn.cursor()
    cursor.execute("SELECT order_code, customer_name, amount, status FROM orders WHERE status = 'pending'")
    pending = cursor.fetchall()
    print(f"Pending orders in DB: {len(pending)}")
    for p in pending:
        print(f" - Code: {p[0]} | Cust: {p[1]} | Amount: {p[2]:,.0f} | Status: {p[3]}")
    conn.close()

    print("\n--- 2. SEPAY API CHECK ---")
    url = "https://userapi.sepay.vn/v2/transactions"
    headers = {"Authorization": f"Bearer {API_TOKEN}"}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            txs = response.json().get('transactions', [])
            print(f"Found {len(txs)} transactions on Sepay.")
            for tx in txs[:10]: # Check last 10
                print(f" - [{tx.get('transaction_date')}] Amount: {float(tx.get('amount_in',0)):,.0f} | Content: {tx.get('transaction_content')}")
        else:
            print(f"Failed to fetch Sepay: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error calling Sepay: {e}")

if __name__ == "__main__":
    debug_payment()
