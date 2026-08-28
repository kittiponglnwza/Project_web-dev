-- คัดลอกโค้ดเหล่านี้ไปวางในเมนู SQL Editor ของ Supabase เพื่อสร้างตารางสำหรับระบบ Dashboard (หากอาจารย์ต้องการให้ข้อมูลผูกกับ DB จริงๆ)

-- 1. สร้างตารางแจ้งซ่อม
CREATE TABLE maintenance_requests (
    id SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    issue_title TEXT NOT NULL,
    issue_desc TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
ALTER TABLE maintenance_requests DISABLE ROW LEVEL SECURITY;

-- 2. สร้างตารางบิลค่าเช่า
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    month TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
