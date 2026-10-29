create function update_room_settings(p_room uuid, p_winning int, p_laps int, p_timer int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _require_host(p_room);
  if p_winning is null or p_winning < 5 or p_winning > 20 then raise exception 'winning score must be 5 to 20'; end if;
  if p_laps is null or p_laps < 1 or p_laps > 5 then raise exception 'laps must be 1 to 5'; end if;
  if not exists (select 1 from rooms where id = p_room and status = 'lobby') then
    raise exception 'cannot change settings after start';
  end if;
  update rooms set winning_score = p_winning, laps = p_laps, timer_secs = p_timer
   where id = p_room and status = 'lobby';
end $$;

revoke execute on function update_room_settings(uuid,int,int,int) from public, anon;
grant execute on function update_room_settings(uuid,int,int,int) to authenticated;
