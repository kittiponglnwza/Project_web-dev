-- Run after migration_rubric.sql.
-- Idempotently add profile archiving while preserving all existing profile and bill rows.
BEGIN;

ALTER TABLE public.tenant_profiles
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE OR REPLACE VIEW public.occupied_rooms AS
    SELECT room_no
    FROM public.tenant_profiles
    WHERE room_no IS NOT NULL
      AND role <> 'admin'
      AND archived_at IS NULL;

GRANT SELECT ON public.occupied_rooms TO anon, authenticated;

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
        NEW.archived_at := NULL;
    ELSE
        NEW.role := OLD.role;
        NEW.room_no := OLD.room_no;
        NEW.lease_status := OLD.lease_status;
        NEW.start_date := OLD.start_date;
        NEW.end_date := OLD.end_date;
        NEW.archived_at := OLD.archived_at;
    END IF;

    RETURN NEW;
END;
$$;

COMMIT;
