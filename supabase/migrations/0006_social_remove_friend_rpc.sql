-- Supabase social helper: remove a friendship from both users' friend lists.

create or replace function public.remove_friend(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from public.friends
  where (user_id = auth.uid() and friend_user_id = target_user_id)
     or (user_id = target_user_id and friend_user_id = auth.uid());
end;
$$;

grant execute on function public.remove_friend(uuid) to authenticated;
