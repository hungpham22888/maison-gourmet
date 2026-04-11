import sqlite3
import json
import os
import sys
from datetime import datetime

# Set encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = r'c:\Users\phamh\Desktop\AI Agent\maison-gourmet\brain.db'
OUTPUT_PATH = r'c:\Users\phamh\Desktop\AI Agent\maison-gourmet\data_sync.json'

def get_data():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Access columns by name
    cursor = conn.cursor()

    data = {
        "last_sync": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "products": [],
        "customers": [],
        "orders": [],
        "stats": {
            "total_revenue": 0,
            "total_orders": 0,
            "total_customers": 0,
            "pending_orders": 0
        }
    }

    try:
        # Fetch products
        cursor.execute("SELECT * FROM products ORDER BY id DESC")
        data["products"] = [dict(row) for row in cursor.fetchall()]

        # Fetch customers
        cursor.execute("SELECT * FROM customers ORDER BY id DESC")
        data["customers"] = [dict(row) for row in cursor.fetchall()]
        data["stats"]["total_customers"] = len(data["customers"])

        # Fetch orders
        cursor.execute("SELECT * FROM orders ORDER BY order_date DESC")
        data["orders"] = [dict(row) for row in cursor.fetchall()]
        data["stats"]["total_orders"] = len(data["orders"])

        # Calculate revenue and pending count
        for order in data["orders"]:
            if order["status"] == "completed" or order["status"] == "pending": # treating pending as potential revenue for dashboard stats
                data["stats"]["total_revenue"] += order["amount"]
            if order["status"] == "pending":
                data["stats"]["pending_orders"] += 1

    except sqlite3.OperationalError as e:
        print(f"⚠️ Error reading tables: {e}")
        # Tables might not exist yet if script is run prematurely
    
    conn.close()
    return data

def save_json(data):
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ Data synced successfully to: {OUTPUT_PATH}")

if __name__ == "__main__":
    print(f"🔄 Syncing data from {DB_PATH}...")
    data = get_data()
    save_json(data)
