
CREATE TABLE public.arena_state (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT arena_state_singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.arena_state TO anon, authenticated;
GRANT ALL ON public.arena_state TO service_role;

ALTER TABLE public.arena_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_state readable by all" ON public.arena_state FOR SELECT USING (true);
CREATE POLICY "arena_state writable by all" ON public.arena_state FOR INSERT WITH CHECK (true);
CREATE POLICY "arena_state updatable by all" ON public.arena_state FOR UPDATE USING (true) WITH CHECK (true);

INSERT INTO public.arena_state (id, data) VALUES (1, '{}'::jsonb) ON CONFLICT DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_state;
ALTER TABLE public.arena_state REPLICA IDENTITY FULL;
