import sqlite3

def migrate():
    conn = sqlite3.connect('brain.db')
    cursor = conn.cursor()
    
    # Check if address column exists
    cursor.execute("PRAGMA table_info(customers)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'address' not in columns:
        print("Adding 'address' column to 'customers' table...")
        cursor.execute("ALTER TABLE customers ADD COLUMN address TEXT")
        conn.commit()
        print("Success!")
    else:
        print("'address' column already exists.")
    
    conn.close()

if __name__ == "__main__":
    migrate()
