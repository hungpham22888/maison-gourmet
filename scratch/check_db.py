import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('brain.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('Tables:', [t[0] for t in tables])
for t in tables:
    tname = t[0]
    if tname == 'sqlite_sequence':
        continue
    cursor.execute(f"PRAGMA table_info({tname})")
    cols = cursor.fetchall()
    print(f"\n--- {tname} ---")
    for c in cols:
        print(f"  col={c[1]} type={c[2]} notnull={c[3]} default={c[4]} pk={c[5]}")
    cursor.execute(f"SELECT COUNT(*) FROM {tname}")
    cnt = cursor.fetchone()[0]
    print(f"  Rows: {cnt}")
conn.close()
