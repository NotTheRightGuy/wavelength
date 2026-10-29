-- Idle-room cleanup. The function does the work; pg_cron (where available) calls it hourly.
create function expire_idle_rooms() returns void
language sql security definer set search_path = public as $$
  delete from rooms where last_active < now() - interval '6 hours';
$$;
revoke execute on function expire_idle_rooms() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('expire-idle-rooms', '0 * * * *', 'select public.expire_idle_rooms()');
exception when others then
  raise notice 'pg_cron unavailable, idle-room cleanup not scheduled: %', sqlerrm;
end $$;
