import sqlite3
import sys

def extract_schema():
    # Set encoding for Windows console
    sys.stdout.reconfigure(encoding='utf-8')
    conn = sqlite3.connect('brain.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('products', 'customers', 'orders', 'brand_voice')")
    tables = cursor.fetchall()
    for name, sql in tables:
        print(f"-- TABLE: {name}")
        print(sql + ";\n")
    conn.close()

if __name__ == "__main__":
    extract_schema()
