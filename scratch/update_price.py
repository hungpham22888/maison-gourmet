import sqlite3
import sys

# Set encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

def update_test_product():
    conn = sqlite3.connect('brain.db')
    cursor = conn.cursor()
    
    # Update price and name
    cursor.execute("""
        UPDATE products 
        SET price = 2000, name = 'Set Quà Demo (Test 2k)' 
        WHERE name LIKE '%Test 1k%' OR name LIKE '%Demo%'
    """)
    
    if cursor.rowcount > 0:
        print(f"Successfully updated {cursor.rowcount} product(s) to 2000d.")
    else:
        print("Product not found.")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    update_test_product()
