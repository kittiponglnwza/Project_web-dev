-- 1. ตารางข้อมูลโปรไฟล์และสัญญาเช่าผู้เช่า (Tenant Profiles)
DROP TABLE IF EXISTS tenant_profiles CASCADE;
CREATE TABLE tenant_profiles (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'tenant',
    national_id TEXT,
    address TEXT,
    room_no TEXT,
    lease_status TEXT DEFAULT 'Active',
    start_date DATE,
    end_date DATE,
    emergency_contact TEXT,
    emergency_phone TEXT
);
ALTER TABLE tenant_profiles ENABLE ROW LEVEL SECURITY;

-- 2. ตารางบิลค่าเช่า (Bills) - แบบละเอียด
DROP TABLE IF EXISTS bills;
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    month TEXT NOT NULL,
    room_no TEXT,
    rent_fee INTEGER DEFAULT 0,
    elec_unit INTEGER DEFAULT 0,
    elec_fee INTEGER DEFAULT 0,
    water_unit INTEGER DEFAULT 0,
    water_fee INTEGER DEFAULT 0,
    other_fee INTEGER DEFAULT 0,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    slip_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- 3. ตารางแจ้งซ่อม (Maintenance)
DROP TABLE IF EXISTS maintenance_requests;
CREATE TABLE maintenance_requests (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;


-- =========================================================================================
-- 🔒 POLICIES (กฎการเข้าถึง) สำหรับ Supabase
-- =========================================================================================

-- ✅ ตาราง tenant_profiles: 
-- 1. แอดมินดูและแก้ไขได้ทั้งหมด
-- 2. ผู้เช่าดูและแก้ไขได้เฉพาะโปรไฟล์ของตัวเอง (เช็คจาก email ตรงกับ Auth)
CREATE POLICY "Admins can do everything on profiles" ON public.tenant_profiles USING (
  EXISTS (SELECT 1 FROM tenant_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
);
CREATE POLICY "Users can view and edit their own profile" ON public.tenant_profiles
FOR ALL USING (email = auth.jwt() ->> 'email');

-- ✅ ตาราง bills:
-- 1. แอดมินดูและแก้ไขได้ทั้งหมด
-- 2. ผู้เช่าดูและอัปเดตสลิปได้เฉพาะบิลของตัวเอง
CREATE POLICY "Admins can manage bills" ON public.bills USING (
  EXISTS (SELECT 1 FROM tenant_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
);
CREATE POLICY "Users can view and update their own bills" ON public.bills 
FOR ALL USING (email = auth.jwt() ->> 'email');

-- ✅ ตาราง maintenance_requests:
-- 1. แอดมินดูและแก้ไขได้ทั้งหมด
-- 2. ผู้เช่าดูและแจ้งซ่อมได้เฉพาะของตัวเอง
CREATE POLICY "Admins can manage maintenance" ON public.maintenance_requests USING (
  EXISTS (SELECT 1 FROM tenant_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
);
CREATE POLICY "Users can manage their own maintenance requests" ON public.maintenance_requests 
FOR ALL USING (email = auth.jwt() ->> 'email');

-- ==========================================
-- ข้อมูลจำลองสำหรับทดสอบ (Dummy Data)
-- หมายเหตุ: ระบบจะอ้างอิงจากอีเมลของคุณ "kitipongzaza566@gmail.com"
-- คุณสามารถแก้ไขเป็นอีเมลของคุณเองได้

INSERT INTO tenant_profiles (email, role, national_id, address, room_no, start_date, end_date, emergency_contact, emergency_phone)
VALUES 
('admin@mydorm.com', 'admin', '0000000000000', 'Admin Office', 'Office', '2024-01-01', '2030-12-31', 'System', '000'),
('testtopzver2@gmail.com', 'tenant', '1103412345678', '123 ถ.พหลโยธิน กทม.', '110', '2024-01-01', '2024-12-31', 'คุณแม่', '089-999-9999');

INSERT INTO bills (email, month, room_no, rent_fee, elec_unit, elec_fee, water_unit, water_fee, other_fee, amount, status)
VALUES 
('testtopzver2@gmail.com', 'พฤษภาคม 2024', '110', 5000, 150, 1050, 10, 180, 0, 6230, 'pending'),
('testtopzver2@gmail.com', 'เมษายน 2024', '110', 5000, 120, 840, 8, 144, 0, 5984, 'paid');

INSERT INTO maintenance_requests (email, title, description, status)
VALUES 
('testtopzver2@gmail.com', 'แอร์ไม่เย็น', 'เปิดทิ้งไว้ 3 ชั่วโมงแล้วก็ยังมีแต่ลมร้อน', 'pending');

-- =========================================================================================
-- 🎉 ตารางโปรโมชั่น (Promotions)
-- =========================================================================================

-- 4. ตารางโปรโมชั่น
DROP TABLE IF EXISTS promotions CASCADE;
CREATE TABLE promotions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('new_tenant', 'seasonal', 'free_common_fee')),
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed', 'free_field')),
    discount_value NUMERIC DEFAULT 0,
    discount_field TEXT DEFAULT 'rent_fee',
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    auto_apply BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins สามารถจัดการโปรโมชั่นได้ทั้งหมด
CREATE POLICY "Admins can manage promotions" ON public.promotions USING (
  EXISTS (SELECT 1 FROM tenant_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
);
-- Policy: ทุกคนสามารถดูโปรโมชั่นที่ active ได้
CREATE POLICY "Anyone can view active promotions" ON public.promotions
FOR SELECT USING (is_active = true);

-- เพิ่มคอลัมน์ส่วนลดในตาราง bills
ALTER TABLE bills ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS discount_detail TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS promotion_id INTEGER REFERENCES promotions(id);

-- ข้อมูลจำลอง: โปรโมชั่นตัวอย่าง
INSERT INTO promotions (name, description, type, discount_type, discount_value, discount_field, start_date, end_date, is_active, auto_apply)
VALUES 
('โปรผู้เช่าใหม่ ลด 50%', 'เดือนแรกของการเข้าอยู่ ลดค่าเช่า 50%', 'new_tenant', 'percent', 50, 'rent_fee', '2024-01-01', '2030-12-31', true, true),
('Low Season ลด 20%', 'ช่วง มี.ค. - พ.ค. ลดค่าเช่า 20%', 'seasonal', 'percent', 20, 'rent_fee', '2025-03-01', '2025-05-31', true, true),
('ฟรีค่าส่วนกลาง', 'ยกเว้นค่าส่วนกลาง (other_fee) ฟรี', 'free_common_fee', 'free_field', 0, 'other_fee', '2024-01-01', '2030-12-31', false, true);

-- 5. ���ҧ�Ѵ���� (Appointments)
DROP TABLE IF EXISTS appointments CASCADE;
CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins ����ö�Ѵ��ùѴ�����������
CREATE POLICY "Admins can manage appointments" ON public.appointments USING (
  EXISTS (SELECT 1 FROM tenant_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
);
-- Policy: ��ҹ�������� (����Ѻ�����Ŵ��ԷԹ)
CREATE POLICY "Public read for appointments if needed" ON public.appointments
FOR SELECT USING (true);

