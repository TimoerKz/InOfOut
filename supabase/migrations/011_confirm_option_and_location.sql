-- Confirm one valid option and select an existing location suggestion.
create or replace function public.confirm_activity_option(p_activity_id uuid,p_option_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from activities where id=p_activity_id and (created_by=auth.uid() or public.is_group_owner(group_id))) then raise exception 'Geen toestemming'; end if;
 if not exists(select 1 from activity_options where id=p_option_id and activity_id=p_activity_id) then raise exception 'Moment hoort niet bij deze activiteit'; end if;
 update activities set selected_option_id=p_option_id,status='confirmed' where id=p_activity_id;
end $$;
grant execute on function public.confirm_activity_option(uuid,uuid) to authenticated;

alter table public.activities add column if not exists selected_location_suggestion_id uuid references public.location_suggestions(id) on delete set null;
