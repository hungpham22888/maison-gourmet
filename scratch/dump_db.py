import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect(r'c:\Users\phamh\Desktop\AI Agent\maison-gourmet\brain.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

for t in tables:
    name = t[0]
    print(f'\n{"="*50}')
    print(f'TABLE: {name}')
    print(f'{"="*50}')
    cursor.execute(f'PRAGMA table_info("{name}")')
    cols = cursor.fetchall()
    print('Columns:', [(c[1], c[2]) for c in cols])
    cursor.execute(f'SELECT * FROM "{name}"')
    rows = cursor.fetchall()
    for row in rows:
        print(row)

conn.close()
