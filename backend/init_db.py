
import os
from dotenv import load_dotenv
import psycopg

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

with psycopg.connect(DATABASE_URL) as conn:
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chats (
                id UUID PRIMARY KEY,
                title VARCHAR(255) NOT NULL DEFAULT 'New chat',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_chats_updated_at
            ON chats (updated_at DESC);
        """)

    conn.commit()

print("Chats table created successfully!")
