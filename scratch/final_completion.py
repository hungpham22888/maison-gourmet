import sqlite3
import subprocess

def finalize():
    conn = sqlite3.connect('brain.db')
    cursor = conn.cursor()
    
    order_code = 'MG04115375'
    print(f"Updating order {order_code} to completed...")
    
    cursor.execute("UPDATE orders SET status='completed' WHERE order_code=?", (order_code,))
    conn.commit()
    
    if cursor.rowcount > 0:
        print("Success! Order updated.")
    else:
        print("Order not found or already completed.")
        
    conn.close()
    
    # Sync data
    subprocess.run(["python", "scratch/sync_admin.py"])

if __name__ == "__main__":
    finalize()
