-- Enable Salon Owners to view subscriptions linked to their salons
drop policy if exists "Salon owners can view subscriptions for their salons" on public.subscriptions;
create policy "Salon owners can view subscriptions for their salons" on public.subscriptions for select using (
  exists (
    select 1 from public.salons s 
    where s.id = subscriptions.salon_id 
    and s.owner_id = auth.uid()
  )
);

-- Enable Salon Owners to update credits for subscriptions linked to their salons
drop policy if exists "Salon owners can update credits" on public.subscriptions;
create policy "Salon owners can update credits" on public.subscriptions for update using (
  exists (
    select 1 from public.salons s 
    where s.id = subscriptions.salon_id 
    and s.owner_id = auth.uid()
  )
);

-- Enable Salon Owners to view codes linked to their salons (for validation)
drop policy if exists "Salon owners can view codes for their salons" on public.haircut_codes;
create policy "Salon owners can view codes for their salons" on public.haircut_codes for select using (
  exists (
    select 1 from public.subscriptions sub 
    join public.salons s on sub.salon_id = s.id 
    where sub.id = haircut_codes.subscription_id 
    and s.owner_id = auth.uid()
  )
);

-- Enable Salon Owners to view history for their salons
drop policy if exists "Salon owners can view history for their salons" on public.haircut_history;
create policy "Salon owners can view history for their salons" on public.haircut_history for select using (
  exists (
    select 1 from public.salons s 
    where s.id = haircut_history.salon_id 
    and s.owner_id = auth.uid()
  )
);

-- Enable Salon Owners to insert history (when validating code)
drop policy if exists "Salon owners can insert history" on public.haircut_history;
create policy "Salon owners can insert history" on public.haircut_history for insert with check (
  exists (
    select 1 from public.salons s 
    where s.id = haircut_history.salon_id 
    and s.owner_id = auth.uid()
  )
);

-- Enable Salon Owners to view payouts
drop policy if exists "Salon owners can view payouts" on public.payouts;
create policy "Salon owners can view payouts" on public.payouts for select using (
  exists (
    select 1 from public.salons s 
    where s.id = payouts.salon_id 
    and s.owner_id = auth.uid()
  )
);
