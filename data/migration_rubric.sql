
BEGIN;

CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL DEFAULT 0,
    images JSONB DEFAULT '[]'::jsonb,
    facilities JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS facilities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_email TEXT NOT NULL,
    receiver_email TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_contacted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_contacted BOOLEAN DEFAULT false;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW occupied_rooms AS
    SELECT room_no FROM tenant_profiles
    WHERE room_no IS NOT NULL AND role <> 'admin';
GRANT SELECT ON occupied_rooms TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.tenant_profiles
        WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    );
$$;

DROP POLICY IF EXISTS "Admins can do everything on profiles" ON tenant_profiles;
DROP POLICY IF EXISTS "Users can view and edit their own profile" ON tenant_profiles;
CREATE POLICY "Admins can do everything on profiles" ON tenant_profiles
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Users can view and edit their own profile" ON tenant_profiles
    USING (email = auth.jwt() ->> 'email') WITH CHECK (email = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "Admins can manage bills" ON bills;
DROP POLICY IF EXISTS "Users can view and update their own bills" ON bills;
DROP POLICY IF EXISTS "Users can view their own bills" ON bills;
DROP POLICY IF EXISTS "Users can send slip for their own bills" ON bills;
CREATE POLICY "Admins can manage bills" ON bills
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Users can view their own bills" ON bills
    FOR SELECT USING (email = auth.jwt() ->> 'email');
CREATE POLICY "Users can send slip for their own bills" ON bills
    FOR UPDATE USING (email = auth.jwt() ->> 'email') WITH CHECK (email = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "Admins can manage maintenance" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can manage their own maintenance requests" ON maintenance_requests;
CREATE POLICY "Admins can manage maintenance" ON maintenance_requests
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Users can manage their own maintenance requests" ON maintenance_requests
    USING (email = auth.jwt() ->> 'email') WITH CHECK (email = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "Admins can manage promotions" ON promotions;
CREATE POLICY "Admins can manage promotions" ON promotions
    USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public read for appointments if needed" ON appointments;
DROP POLICY IF EXISTS "Admins can manage appointments" ON appointments;
CREATE POLICY "Admins can manage appointments" ON appointments
    USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view rooms" ON rooms;
DROP POLICY IF EXISTS "Admins can manage rooms" ON rooms;
CREATE POLICY "Anyone can view rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Admins can manage rooms" ON rooms
    USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Logged in users can read announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
CREATE POLICY "Logged in users can read announcements" ON announcements
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage announcements" ON announcements
    USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage messages" ON messages;
DROP POLICY IF EXISTS "Users can read their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send their own messages" ON messages;
DROP POLICY IF EXISTS "Anyone can send booking requests" ON messages;
CREATE POLICY "Admins can manage messages" ON messages
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Users can read their own messages" ON messages
    FOR SELECT USING (auth.jwt() ->> 'email' IN (sender_email, receiver_email));
CREATE POLICY "Users can send their own messages" ON messages
    FOR INSERT WITH CHECK (sender_email = auth.jwt() ->> 'email' AND receiver_email = 'admin');
CREATE POLICY "Anyone can send booking requests" ON messages
    FOR INSERT WITH CHECK (sender_email = 'system_booking@mydorm.com' AND receiver_email = 'admin');

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.jwt() IS NULL OR public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.role := 'tenant';
        NEW.room_no := NULL;
    ELSE
        NEW.role := OLD.role;
        NEW.room_no := OLD.room_no;
        NEW.lease_status := OLD.lease_status;
        NEW.start_date := OLD.start_date;
        NEW.end_date := OLD.end_date;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_fields ON tenant_profiles;
CREATE TRIGGER protect_profile_fields
    BEFORE INSERT OR UPDATE ON tenant_profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

CREATE OR REPLACE FUNCTION public.protect_bill_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.jwt() IS NULL OR public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF NEW.status <> 'checking' THEN
        RAISE EXCEPTION 'ผู้เช่าเปลี่ยนสถานะบิลได้เฉพาะการส่งสลิปเท่านั้น';
    END IF;

    NEW := jsonb_populate_record(
        NEW,
        to_jsonb(OLD) - 'status' - 'slip_image'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_bill_fields ON bills;
CREATE TRIGGER protect_bill_fields
    BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION public.protect_bill_fields();

COMMIT;
