-- Run after migration_rubric.sql and migration_tenant_archive.sql.
-- Physical room-to-size mapping is the source of truth for availability and room selection.
BEGIN;

CREATE TABLE IF NOT EXISTS public.room_inventory (
    room_no TEXT PRIMARY KEY,
    room_size TEXT NOT NULL CHECK (room_size IN ('S', 'M', 'XL'))
);

INSERT INTO public.room_inventory (room_no, room_size) VALUES
    ('101', 'S'), ('102', 'S'), ('103', 'S'), ('104', 'S'),
    ('105', 'M'), ('106', 'M'), ('107', 'M'), ('108', 'M'), ('109', 'M'), ('110', 'M'),
    ('111', 'XL'), ('112', 'XL'), ('113', 'XL'), ('114', 'XL'), ('115', 'XL'), ('116', 'XL')
ON CONFLICT (room_no) DO NOTHING;

ALTER TABLE public.room_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view room inventory" ON public.room_inventory;
CREATE POLICY "Anyone can view room inventory" ON public.room_inventory
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage room inventory" ON public.room_inventory;
CREATE POLICY "Admins can manage room inventory" ON public.room_inventory
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.room_inventory TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.room_inventory TO authenticated;

CREATE OR REPLACE VIEW public.room_availability AS
    SELECT
        inventory.room_size,
        COUNT(*)::INTEGER AS total_rooms,
        COUNT(*) FILTER (WHERE occupied.room_no IS NULL)::INTEGER AS available_rooms,
        COUNT(*) FILTER (WHERE occupied.room_no IS NOT NULL)::INTEGER AS occupied_rooms
    FROM public.room_inventory AS inventory
    LEFT JOIN (
        SELECT DISTINCT room_no
        FROM public.tenant_profiles
        WHERE role <> 'admin'
          AND archived_at IS NULL
          AND room_no IS NOT NULL
    ) AS occupied ON occupied.room_no = inventory.room_no
    GROUP BY inventory.room_size;

GRANT SELECT ON public.room_availability TO anon, authenticated;

COMMIT;
