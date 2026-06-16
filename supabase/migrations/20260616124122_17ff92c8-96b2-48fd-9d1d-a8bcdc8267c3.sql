
-- 1) Server-side credits computation via trigger (ignore client-supplied credits_earned)
CREATE OR REPLACE FUNCTION public.compute_activity_credits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  multiplier int;
  computed int;
BEGIN
  multiplier := CASE NEW.intensity::text
    WHEN 'low' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'high' THEN 3
    ELSE 1
  END;
  IF NEW.duration_minutes < 1 THEN
    NEW.duration_minutes := 1;
  END IF;
  IF NEW.duration_minutes > 600 THEN
    NEW.duration_minutes := 600;
  END IF;
  computed := GREATEST(1, ROUND(multiplier * (NEW.duration_minutes::numeric / 15.0))::int);
  NEW.credits_earned := computed;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activities_compute_credits ON public.activities;
CREATE TRIGGER activities_compute_credits
BEFORE INSERT OR UPDATE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.compute_activity_credits();

-- 2) Atomic reserve+pay RPC with server-side balance verification
CREATE OR REPLACE FUNCTION public.reserve_event_paid(_event_id uuid)
RETURNS public.event_attendances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  ev public.events%ROWTYPE;
  earned int;
  spent int;
  available int;
  existing public.event_attendances%ROWTYPE;
  result public.event_attendances%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO ev FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  SELECT * INTO existing FROM public.event_attendances
    WHERE user_id = uid AND event_id = _event_id FOR UPDATE;

  IF FOUND AND (existing.status = 'paid' OR existing.status = 'attended') THEN
    RETURN existing;
  END IF;

  SELECT COALESCE(SUM(credits_earned), 0) INTO earned
    FROM public.activities WHERE user_id = uid AND validated = true;
  SELECT COALESCE(SUM(credits_spent), 0) INTO spent
    FROM public.event_attendances
    WHERE user_id = uid AND status IN ('paid','attended','reserved')
      AND event_id <> _event_id;
  available := earned - spent;

  IF available < ev.credits_required THEN
    RAISE EXCEPTION 'Insufficient credits (have %, need %)', available, ev.credits_required;
  END IF;

  INSERT INTO public.event_attendances
    (user_id, event_id, status, credits_spent, amount_paid_cents, paid_at)
  VALUES
    (uid, _event_id, 'paid', ev.credits_required, ev.price_cents, now())
  ON CONFLICT (user_id, event_id) DO UPDATE
    SET status = 'paid',
        credits_spent = EXCLUDED.credits_spent,
        amount_paid_cents = EXCLUDED.amount_paid_cents,
        paid_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_event_paid(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_event_paid(uuid) TO authenticated;

-- 3) Storage policies on activity-screenshots: restrict UPDATE/DELETE to owner (folder = auth.uid())
DROP POLICY IF EXISTS "activity_screenshots_update_own" ON storage.objects;
CREATE POLICY "activity_screenshots_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'activity-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'activity-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "activity_screenshots_delete_own" ON storage.objects;
CREATE POLICY "activity_screenshots_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'activity-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "activity_screenshots_insert_own" ON storage.objects;
CREATE POLICY "activity_screenshots_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'activity-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "activity_screenshots_select_own" ON storage.objects;
CREATE POLICY "activity_screenshots_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'activity-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
