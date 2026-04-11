import sqlite3
import sys

# Set encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

def check_ids():
    conn = sqlite3.connect('brain.db')
    cursor = conn.cursor()
    
    print("--- PRODUCTS ---")
    cursor.execute("SELECT id, name FROM products")
    for row in cursor.fetchall():
        print(f"ID: {row[0]} | Name: {row[1]}")
        
    print("\n--- CUSTOMERS ---")
    cursor.execute("SELECT id, name FROM customers")
    for row in cursor.fetchall():
        print(f"ID: {row[0]} | Name: {row[1]}")
        
    print("\n--- ORDERS ---")
    cursor.execute("SELECT id, order_code FROM orders")
    for row in cursor.fetchall():
        print(f"ID: {row[0]} | Code: {row[1]}")
        
    conn.close()

if __name__ == "__main__":
    check_ids()
