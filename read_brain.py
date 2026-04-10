import sqlite3
import io
import sys

# Set output to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def read_brand_voice():
    conn = sqlite3.connect('brain.db')
    cursor = conn.cursor()
    
    # Save to file just in case
    with open('brand_voice_output.txt', 'w', encoding='utf-8') as f:
        cursor.execute("SELECT title, content FROM brand_voice")
        for row in cursor.fetchall():
            line = f"Title: {row[0]}\nContent: {row[1]}\n{'-'*20}\n"
            f.write(line)
            print(f"Title: {row[0]}")
            print(f"Content: {row[1]}")
            print("-" * 20)
        
    conn.close()

if __name__ == "__main__":
    read_brand_voice()
