create table public.nida_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  nida_no text,
  mother_name text,
  ward_of_residence text,
  district_of_birth text,
  street_village text,
  request_type text
);
grant select, insert on public.nida_requests to anon, authenticated;
grant all on public.nida_requests to service_role;
alter table public.nida_requests enable row level security;
create policy "Enable insert access for all users" on public.nida_requests for insert with check (true);
create policy "Enable read access for all users" on public.nida_requests for select using (true);