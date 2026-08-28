-- 1. ตารางข้อมูลโปรไฟล์และสัญญาเช่าผู้เช่า (Tenant Profiles)
CREATE TABLE tenant_profiles (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    national_id TEXT,
    room_no TEXT,
    lease_status TEXT DEFAULT 'Active',
    start_date DATE,
    end_date DATE,
    emergency_contact TEXT,
    emergency_phone TEXT
);
ALTER TABLE tenant_profiles DISABLE ROW LEVEL SECURITY;

-- 2. ตารางบิลค่าเช่า (Bills)
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    month TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;

-- 3. ตารางแจ้งซ่อม (Maintenance)
CREATE TABLE maintenance_requests (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
ALTER TABLE maintenance_requests DISABLE ROW LEVEL SECURITY;


-- ==========================================
-- ข้อมูลจำลองสำหรับทดสอบ (Dummy Data)
-- หมายเหตุ: ระบบจะอ้างอิงจากอีเมลของคุณ "kitipongzaza566@gmail.com"
-- ==========================================

INSERT INTO tenant_profiles (email, national_id, room_no, start_date, end_date, emergency_contact, emergency_phone)
VALUES ('kitipongzaza566@gmail.com', '1-2345-67890-12-3', '302', '2024-07-01', '2025-06-30', 'สมศรี ตีระสี (มารดา)', '081-999-9999');

INSERT INTO bills (email, month, amount, status) VALUES 
('kitipongzaza566@gmail.com', 'ตุลาคม 2567', 4500, 'pending'),
('kitipongzaza566@gmail.com', 'กันยายน 2567', 4800, 'paid');

INSERT INTO maintenance_requests (email, title, description, status) VALUES 
('kitipongzaza566@gmail.com', 'แอร์ไม่เย็น', 'เปิด 16 องศาก็ไม่เย็นเลย รบกวนให้ช่างเข้ามาดูหน่อยครับ', 'completed');
