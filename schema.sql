CREATE TABLE IF NOT EXISTS leads (
 id TEXT PRIMARY KEY, created_at TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL,
 email TEXT NOT NULL, adviser TEXT NOT NULL, interest TEXT NOT NULL, preferred_date TEXT,
 preferred_time TEXT, contact_method TEXT, message TEXT NOT NULL, source TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
