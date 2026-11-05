
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
        IF TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'tenant' THEN
            RAISE EXCEPTION 'Only admins can create a profile with role %', NEW.role;
        ELSIF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Only admins can change role';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.tenant_profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE INSERT OR UPDATE ON public.tenant_profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();
