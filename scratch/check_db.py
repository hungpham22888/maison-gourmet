import sqlite3
conn = sqlite3.connect(r'c:\Users\phamh\Desktop\AI Agent\maison-gourmet\brain.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('Tables:', tables)
for t in tables:
    name = t[0]
    print(f'\n--- {name} ---')
    cursor.execute(f'PRAGMA table_info("{name}")')
    print(cursor.fetchall())
    cursor.execute(f'SELECT COUNT(*) FROM "{name}"')
    print('Row count:', cursor.fetchone()[0])
conn.close()
