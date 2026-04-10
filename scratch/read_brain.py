import sqlite3
import sys

def read_db():
    try:
        # Set output encoding to utf-8 for Windows console
        sys.stdout.reconfigure(encoding='utf-8')
        conn = sqlite3.connect('brain.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM brand_voice;")
        rows = cursor.fetchall()
        for row in rows:
            print(row)
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    read_db()
