-- Social schema RPC helpers
-- Primary source: supabase/schema-social.sql

create or replace function public.touch_my_profile(next_username text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id, username, display_name, updated_at)
  values (
    auth.uid(),
    coalesce(nullif(next_username, ''), 'Spieler'),
    coalesce(nullif(next_username, ''), 'Spieler'),
    now()
  )
  on conflict (id) do update set
    username = coalesce(nullif(next_username, ''), public.profiles.username),
    display_name = coalesce(nullif(next_username, ''), public.profiles.display_name),
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.touch_my_profile(text) to authenticated;

create or replace function public.accept_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.friend_requests;
begin
  select * into req
  from public.friend_requests
  where id = request_id and to_user_id = auth.uid() and status = 'pending';

  if req.id is null then
    raise exception 'request not found';
  end if;

  update public.friend_requests
  set status = 'accepted', responded_at = now()
  where id = req.id;

  insert into public.friends (user_id, friend_user_id, request_id)
  values (req.from_user_id, req.to_user_id, req.id)
  on conflict do nothing;

  insert into public.friends (user_id, friend_user_id, request_id)
  values (req.to_user_id, req.from_user_id, req.id)
  on conflict do nothing;
end;
$$;

grant execute on function public.accept_friend_request(uuid) to authenticated;
