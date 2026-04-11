import sqlite3
import requests
import sys

# Set encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

API_TOKEN = '81GX0VQWFDUOIPKLECYLVQIRKMTHZFMTM3IUYQ5DFJLJS2CPLHT2PCCTUZP1U6BN'

def deep_check():
    print("--- 1. DATABASE DUMP ---")
    try:
        conn = sqlite3.connect('brain.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orders ORDER BY id DESC")
        rows = cursor.fetchall()
        print(f"Total orders in DB: {len(rows)}")
        for r in rows:
            print(f" - {r}")
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

    print("\n--- 2. SEPAY TRANSACTION LOG ---")
    url = "https://userapi.sepay.vn/v2/transactions"
    headers = {"Authorization": f"Bearer {API_TOKEN}"}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        txs = data.get('transactions', [])
        print(f"Transactions found: {len(txs)}")
        for tx in txs:
            print(f" - ID: {tx.get('id')} | Amount: {tx.get('amount_in')} | Content: {tx.get('transaction_content')}")
            
        # Try to guess account balance/status
        acc_url = "https://userapi.sepay.vn/v2/accounts"
        acc_resp = requests.get(acc_url, headers=headers)
        if acc_resp.status_code == 200:
            print(f"\nConnected Accounts: {acc_resp.json().get('accounts')}")
            
    except Exception as e:
        print(f"API Error: {e}")

if __name__ == "__main__":
    deep_check()
