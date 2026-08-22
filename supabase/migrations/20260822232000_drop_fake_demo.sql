-- The public try-out is a real locker with fake info, not a fake app.
drop trigger if exists lokr_demos_validate on public.lokr_demos;
drop function if exists public.lokr_get_demo(text);
drop function if exists private.lokr_demos_validate();
drop table if exists public.lokr_demos;
