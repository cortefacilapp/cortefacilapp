begin;

create or replace function public.decrement_credit_for_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_plan uuid; v_ps timestamptz; v_pe timestamptz; v_remaining integer; v_monthly int;
begin
  select plan_id, current_period_start, current_period_end into v_plan, v_ps, v_pe
  from public.user_subscriptions
  where user_id = p_user_id and status = 'active'
  order by current_period_end desc
  limit 1;

  if v_plan is null then
    return jsonb_build_object('ok', false, 'error', 'no_active_plan');
  end if;
  if v_ps is null or v_pe is null or now() < v_ps or now() > v_pe then
    return jsonb_build_object('ok', false, 'error', 'outside_period');
  end if;

  select coalesce(monthly_credits, 0) into v_monthly from public.plans where id = v_plan;

  -- ensure credits row exists
  if not exists (
    select 1 from public.user_credits uc
    where uc.user_id = p_user_id and uc.plan_id = v_plan and uc.period_start = v_ps
  ) then
    insert into public.user_credits(user_id, plan_id, period_start, remaining)
    values (p_user_id, v_plan, v_ps, v_monthly);
  end if;

  update public.user_credits
  set remaining = remaining - 1
  where user_id = p_user_id and plan_id = v_plan and period_start = v_ps and remaining > 0
  returning remaining into v_remaining;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_credits');
  end if;

  return jsonb_build_object('ok', true, 'remaining', v_remaining);
end;
$$;

grant execute on function public.decrement_credit_for_user(uuid) to authenticated;

create or replace function public.consume_code_with_amount(p_code text, p_salon uuid, p_amount int default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_code_id uuid; v_code_user uuid; v_code_status text; v_expires timestamptz;
        v_aff_salon uuid; v_sub_status text; v_user_plan uuid; v_ps timestamptz; v_pe timestamptz;
        v_remaining integer; v_monthly int; v_code_text text;
begin
  select id, user_id, status, expires_at, code into v_code_id, v_code_user, v_code_status, v_expires, v_code_text
  from public.codes where code = upper(p_code);
  if v_code_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if v_code_status <> 'generated' then
    return jsonb_build_object('ok', false, 'error', 'code_used');
  end if;
  if v_expires is not null and v_expires < now() then
    return jsonb_build_object('ok', false, 'error', 'code_expired');
  end if;

  select salon_id into v_aff_salon from public.user_affiliations where user_id = v_code_user;
  if v_aff_salon is null or v_aff_salon <> p_salon then
    return jsonb_build_object('ok', false, 'error', 'not_affiliated');
  end if;

  select status into v_sub_status from public.subscriptions where salon_id = p_salon order by created_at desc limit 1;
  if v_sub_status is null or v_sub_status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'subscription_inactive');
  end if;

  select plan_id, current_period_start, current_period_end into v_user_plan, v_ps, v_pe
  from public.user_subscriptions
  where user_id = v_code_user and status = 'active'
  order by current_period_end desc limit 1;
  if v_user_plan is null then
    return jsonb_build_object('ok', false, 'error', 'no_active_plan');
  end if;
  if v_ps is null or v_pe is null or now() < v_ps or now() > v_pe then
    return jsonb_build_object('ok', false, 'error', 'outside_period');
  end if;

  select coalesce(monthly_credits, 0) into v_monthly from public.plans where id = v_user_plan;

  -- ensure credits row exists
  if not exists (
    select 1 from public.user_credits uc
    where uc.user_id = v_code_user and uc.plan_id = v_user_plan and uc.period_start = v_ps
  ) then
    insert into public.user_credits(user_id, plan_id, period_start, remaining)
    values (v_code_user, v_user_plan, v_ps, v_monthly);
  end if;

  update public.user_credits
  set remaining = remaining - p_amount
  where user_id = v_code_user and plan_id = v_user_plan and period_start = v_ps and remaining >= p_amount
  returning remaining into v_remaining;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_credits');
  end if;

  update public.codes
  set status = 'used', used = true, used_at = now(), used_by_salon_id = p_salon
  where id = v_code_id;

  insert into public.visit_logs(user_id, salon_id, code, visited_at)
  values (v_code_user, p_salon, v_code_text, now());

  return jsonb_build_object('ok', true, 'remaining', v_remaining);
end;
$$;

grant execute on function public.consume_code_with_amount(text, uuid, int) to authenticated;

commit;

