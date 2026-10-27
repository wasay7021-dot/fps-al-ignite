-- =====================================================================
--  FPS IGNITE XIII  -  database
--  Paste this whole file into Supabase > SQL Editor > New query > Run.
--  Safe to run again (it will not erase your data), except the
--  "RESET" block at the very bottom which is commented out.
--
--  How it works: nobody can read or write the tables directly. The website
--  only calls the functions below, and every function first checks the
--  signed-in account (token) and its role (admin / viewer / delegate).
-- =====================================================================

create schema if not exists ig;

-- ---------------------------------------------------------------- tables
create table if not exists public.delegations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  campus      text not null default '',
  auction_ic  int  not null default 1000,   -- Auction + Room Booking balance
  forex_cash  int  not null default 2500,   -- Foreign X Change cash (separate)
  members     jsonb not null default '{"cw":"","vg":"","tw":"","sp":""}'::jsonb,
  head        text not null default 'cw',
  created_at  timestamptz not null default now()
);

create table if not exists public.accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password      text not null,
  role          text not null check (role in ('delegate','viewer','admin')),
  delegation_id uuid references public.delegations(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create table if not exists public.sessions (
  token      uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  device_id  text not null,
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);

create table if not exists public.industries (
  id      int primary key,
  name    text not null,
  places  int  not null default 10,
  status  text not null default 'closed' check (status in ('closed','open','paused')),
  settled boolean not null default false
);

create table if not exists public.bids (
  id            uuid primary key default gen_random_uuid(),
  industry_id   int  not null references public.industries(id) on delete cascade,
  delegation_id uuid not null references public.delegations(id) on delete cascade,
  amount        int  not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  status        text not null default 'pending' check (status in ('pending','won','lost')),
  unique (industry_id, delegation_id)
);

create table if not exists public.rooms (
  id     int primary key,
  name   text not null,
  price  int  not null,
  places int  not null default 15,
  status text not null default 'closed' check (status in ('closed','open'))
);

create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  room_id       int  not null references public.rooms(id) on delete cascade,
  delegation_id uuid not null references public.delegations(id) on delete cascade,
  amount        int  not null,
  created_at    timestamptz not null default now(),
  unique (room_id, delegation_id)
);

create table if not exists public.forex_rounds (
  round            int primary key check (round between 1 and 10),
  title            text not null default '',
  media_kind       text,
  media_path       text,
  rates            jsonb not null,
  duration_seconds int not null default 240
);

create table if not exists public.forex_control (
  id         int primary key default 1 check (id = 1),
  mode       text not null default 'manual' check (mode in ('manual','auto')),
  status     text not null default 'closed' check (status in ('closed','open','paused','finished')),
  round      int  not null default 1,
  running    boolean not null default false,
  started_at timestamptz,
  paused_at  timestamptz,
  start_cash int not null default 2500
);

create table if not exists public.forex_holdings (
  delegation_id uuid not null references public.delegations(id) on delete cascade,
  cur           text not null,
  qty           int  not null default 0,
  cost          bigint not null default 0,
  primary key (delegation_id, cur)
);

create table if not exists public.forex_trades (
  id            uuid primary key default gen_random_uuid(),
  delegation_id uuid not null references public.delegations(id) on delete cascade,
  round         int  not null,
  cur           text not null,
  side          text not null check (side in ('buy','sell')),
  qty           int  not null,
  price         int  not null,
  pnl           int,
  created_at    timestamptz not null default now()
);

create table if not exists public.activity (
  id              bigserial primary key,
  at              timestamptz not null default now(),
  delegation_id   uuid references public.delegations(id) on delete set null,
  delegation_name text not null default '',
  kind            text not null,
  detail          text not null,
  amount          int
);

create table if not exists public.login_attempts (
  id    bigserial primary key,
  email text not null,
  at    timestamptz not null default now()
);

create index if not exists activity_at_idx      on public.activity (at desc, id desc);
create index if not exists activity_kind_idx    on public.activity (kind, at desc);
create index if not exists activity_deleg_idx   on public.activity (delegation_id, at desc);
create index if not exists trades_deleg_idx     on public.forex_trades (delegation_id, created_at desc);
create index if not exists bids_industry_idx    on public.bids (industry_id, amount desc, updated_at);
create index if not exists sessions_account_idx on public.sessions (account_id);
create index if not exists sessions_device_idx  on public.sessions (device_id);
create index if not exists attempts_email_idx   on public.login_attempts (email, at);

-- Nobody can read or write tables directly. Everything goes through the
-- functions below, which check the signed-in account first.
alter table public.delegations   enable row level security;
alter table public.accounts      enable row level security;
alter table public.sessions      enable row level security;
alter table public.industries    enable row level security;
alter table public.bids          enable row level security;
alter table public.rooms         enable row level security;
alter table public.bookings      enable row level security;
alter table public.forex_rounds  enable row level security;
alter table public.forex_control enable row level security;
alter table public.forex_holdings enable row level security;
alter table public.forex_trades  enable row level security;
alter table public.activity      enable row level security;
alter table public.login_attempts enable row level security;

-- ------------------------------------------------------------- seed data
insert into public.industries (id, name) values
  (1,'Cybersecurity & Artificial Intelligence (AI)'),
  (2,'Fashion & Self-Care'),
  (3,'Film'),
  (4,'Construction & Real-Estate'),
  (5,'Fintech & Digital Banking'),
  (6,'Sports & Gaming'),
  (7,'Biotech & Health'),
  (8,'Edtech & Future of Learning'),
  (9,'Aerospace & Aeronautical'),
  (10,'Smart Home Technology')
on conflict (id) do nothing;

insert into public.rooms (id, name, price) values
  (1,'Green Screen Room',150),
  (2,'Office',100),
  (3,'Library',75),
  (4,'Lounge',50)
on conflict (id) do nothing;

insert into public.forex_control (id) values (1) on conflict (id) do nothing;

insert into public.forex_rounds (round, rates)
select g, '{"usd":25,"eur":10,"cny":18,"jpy":5,"rub":12,"sar":39}'::jsonb
from generate_series(1,10) g
on conflict (round) do nothing;

-- FIRST ADMIN ACCOUNT  ->  log in with this, then create your own admin
-- accounts in the Accounts tab, change THIS password (or delete this account).
insert into public.accounts (email, password, role)
values ('admin@ignite.com', 'ChangeMe123', 'admin')
on conflict (email) do nothing;

-- ------------------------------------------------------ private helpers
-- Kept so every write function can call it; the website polls (see ig.gate).
create or replace function ig.ping() returns void
language sql as 'select 1';

-- Live updates without refreshing: the website asks "has my screen's data
-- changed?" every couple of seconds, sending the fingerprint (md5) of what it
-- already has. If nothing changed the answer is a few bytes.
create or replace function ig.gate(p_raw json, p_known text) returns json
language plpgsql security definer set search_path = public as $$
declare j jsonb := p_raw::jsonb; h text; ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if jsonb_typeof(j) = 'object' then j := j - 'now'; end if;
  h := md5(j::text);
  if p_known is not null and p_known = h then
    return json_build_object('same', true, 'now', ms);
  end if;
  return json_build_object('h', h, 'now', ms, 'data', j);
end $$;

create or replace function ig.auth(p_token uuid) returns public.accounts
language plpgsql security definer set search_path = public as $$
declare s public.sessions; a public.accounts;
begin
  if p_token is null then raise exception 'SESSION_ENDED'; end if;
  select * into s from public.sessions where token = p_token;
  if not found or s.last_seen < now() - interval '12 hours' then
    raise exception 'SESSION_ENDED';
  end if;
  if s.last_seen < now() - interval '20 seconds' then
    update public.sessions set last_seen = now() where token = p_token;
  end if;
  select * into a from public.accounts where id = s.account_id;
  return a;
end $$;

create or replace function ig.need_admin(p_token uuid) returns public.accounts
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.auth(p_token);
  if a.role <> 'admin' then raise exception 'ADMIN_ONLY'; end if;
  return a;
end $$;

create or replace function ig.need_staff(p_token uuid) returns public.accounts
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.auth(p_token);
  if a.role not in ('admin','viewer') then raise exception 'STAFF_ONLY'; end if;
  return a;
end $$;

create or replace function ig.need_delegate(p_token uuid) returns public.accounts
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.auth(p_token);
  if a.role <> 'delegate' or a.delegation_id is null then raise exception 'DELEGATE_ONLY'; end if;
  return a;
end $$;

create or replace function ig.log(p_del uuid, p_kind text, p_detail text, p_amount int default null) returns void
language plpgsql security definer set search_path = public as $$
declare n text;
begin
  select name into n from public.delegations where id = p_del;
  insert into public.activity (delegation_id, delegation_name, kind, detail, amount)
  values (p_del, coalesce(n, 'Organizer'), p_kind, p_detail, p_amount);
end $$;

create or replace function ig.log_admin(p_who text, p_kind text, p_detail text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.activity (delegation_id, delegation_name, kind, detail)
  values (null, 'Organizer (' || coalesce(p_who,'?') || ')', p_kind, p_detail);
end $$;

-- Foreign X Change: which round / status is it right now?
create or replace function ig.fx_now()
returns table (st text, rnd int, ends timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  c public.forex_control;
  el double precision;
  cum int := 0;
  total int;
  r record;
begin
  select * into c from public.forex_control where id = 1;
  if c.mode = 'manual' then
    return query select c.status, c.round, null::timestamptz;
    return;
  end if;
  if c.started_at is null then
    return query select 'closed'::text, 1, null::timestamptz;
    return;
  end if;
  el := extract(epoch from (case when c.running then now() else coalesce(c.paused_at, now()) end) - c.started_at);
  select coalesce(sum(duration_seconds), 0) into total from public.forex_rounds;
  if el >= total then
    return query select 'finished'::text, 10, null::timestamptz;
    return;
  end if;
  for r in select fr.round as rn, fr.duration_seconds as dur from public.forex_rounds fr order by fr.round loop
    if el < cum + r.dur then
      if c.running then
        return query select 'open'::text, r.rn, c.started_at + make_interval(secs => (cum + r.dur));
      else
        return query select 'paused'::text, r.rn, null::timestamptz;
      end if;
      return;
    end if;
    cum := cum + r.dur;
  end loop;
  return query select 'finished'::text, 10, null::timestamptz;
end $$;

-- cash + holdings valued at the given rates
create or replace function ig.fx_total(p_del uuid, p_rates jsonb) returns bigint
language sql stable security definer set search_path = public as $$
  select (d.forex_cash + coalesce((
    select sum(h.qty::bigint * coalesce((p_rates ->> h.cur)::int, 0))
    from public.forex_holdings h where h.delegation_id = d.id
  ), 0))::bigint
  from public.delegations d where d.id = p_del
$$;

create or replace function ig.settle(p_ids int[]) returns void
language plpgsql security definer set search_path = public as $$
declare b record; d public.delegations; won_cnt int;
begin
  -- close first: waits for bids already in flight, and stops new ones
  update public.industries set status = 'closed' where id = any(p_ids);
  for b in
    select bd.id, bd.industry_id, bd.delegation_id, bd.amount, i.places, i.name as iname
    from public.bids bd join public.industries i on i.id = bd.industry_id
    where bd.industry_id = any(p_ids) and bd.status = 'pending'
    order by bd.amount desc, bd.updated_at asc, bd.created_at asc
  loop
    select * into d from public.delegations where id = b.delegation_id for update;
    select count(*) into won_cnt from public.bids where industry_id = b.industry_id and status = 'won';
    if won_cnt < b.places
       and b.amount <= d.auction_ic
       and not exists (select 1 from public.bids x where x.delegation_id = d.id and x.status = 'won') then
      update public.delegations set auction_ic = auction_ic - b.amount where id = d.id;
      update public.bids set status = 'won' where id = b.id;
      perform ig.log(d.id, 'auction', 'WON ' || b.iname || ' with a bid of ' || b.amount || ' ICs', b.amount);
    else
      update public.bids set status = 'lost' where id = b.id;
    end if;
  end loop;
  update public.industries set status = 'closed', settled = true where id = any(p_ids);
end $$;

drop function if exists ig.create_account(text,text,text,text,text,uuid);
create or replace function ig.create_account(p_email text, p_password text, p_role text,
                                             p_team text, p_campus text, p_delegation uuid,
                                             p_members jsonb default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare em text := lower(trim(coalesce(p_email,''))); did uuid; aid uuid;
begin
  if length(em) < 3 or em ~ '\s' then raise exception 'Enter an email or username (at least 3 characters, no spaces).'; end if;
  if length(coalesce(p_password,'')) < 4 then raise exception 'Password must be at least 4 characters.'; end if;
  if p_role not in ('delegate','viewer','admin') then raise exception 'Unknown role.'; end if;
  if exists (select 1 from public.accounts where email = em) then raise exception 'The email % already has an account.', em; end if;
  if p_role = 'delegate' then
    if p_delegation is not null then
      select id into did from public.delegations where id = p_delegation;
      if did is null then raise exception 'That delegation does not exist.'; end if;
    else
      if length(trim(coalesce(p_team,''))) = 0 then raise exception 'Enter the delegation (team) name.'; end if;
      select id into did from public.delegations where lower(name) = lower(trim(p_team));
      if did is null then
        insert into public.delegations (name, campus, members)
        values (trim(p_team), coalesce(trim(p_campus),''),
                case when p_members is null then '{"cw":"","vg":"","tw":"","sp":""}'::jsonb
                     else jsonb_build_object('cw', coalesce(p_members->>'cw',''), 'vg', coalesce(p_members->>'vg',''),
                                             'tw', coalesce(p_members->>'tw',''), 'sp', coalesce(p_members->>'sp','')) end)
        returning id into did;
      end if;
    end if;
  end if;
  insert into public.accounts (email, password, role, delegation_id)
  values (em, p_password, p_role, did) returning id into aid;
  return aid;
end $$;

-- ---------------------------------------------------- public API: login
-- Returns {token, role, name} or {error: CODE}.  (Errors are returned, not
-- raised, so failed attempts are remembered and can be rate limited.)
create or replace function public.login(p_email text, p_password text, p_device text, p_portal text default null) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; s public.sessions; t uuid; fails int; dname text;
        em text := lower(trim(coalesce(p_email,'')));
begin
  if length(coalesce(p_device,'')) < 8 then return json_build_object('error', 'BAD_DEVICE'); end if;
  select count(*) into fails from public.login_attempts where email = em and at > now() - interval '5 minutes';
  if fails >= 10 then return json_build_object('error', 'TOO_MANY_ATTEMPTS'); end if;

  select * into a from public.accounts where email = em;
  if not found or a.password <> coalesce(p_password,'') then
    if length(em) between 1 and 200 then
      insert into public.login_attempts (email) values (em);
      delete from public.login_attempts where at < now() - interval '1 hour';
    end if;
    return json_build_object('error', 'BAD_LOGIN');
  end if;

  if p_portal = 'delegate' and a.role <> 'delegate' then return json_build_object('error', 'USE_ADMIN_PORTAL'); end if;
  if p_portal = 'admin' and a.role = 'delegate' then return json_build_object('error', 'USE_DELEGATE_PORTAL'); end if;

  perform pg_advisory_xact_lock(hashtext(a.id::text));
  delete from public.sessions where last_seen < now() - interval '24 hours';

  if a.role = 'delegate' then
    -- one account = one device
    select * into s from public.sessions
      where account_id = a.id and device_id <> p_device and last_seen > now() - interval '5 minutes' limit 1;
    if found then return json_build_object('error', 'ALREADY_LOGGED_IN'); end if;
    -- one device = one delegate account at a time
    if exists (select 1 from public.sessions x join public.accounts ac on ac.id = x.account_id
               where x.device_id = p_device and x.account_id <> a.id and ac.role = 'delegate'
                 and x.last_seen > now() - interval '2 minutes') then
      return json_build_object('error', 'DEVICE_BUSY');
    end if;
    delete from public.sessions where account_id = a.id;
  end if;

  insert into public.sessions (account_id, device_id) values (a.id, p_device) returning token into t;
  delete from public.login_attempts where email = em;
  select name into dname from public.delegations where id = a.delegation_id;
  if a.role = 'delegate' then perform ig.log(a.delegation_id, 'account', 'Signed in', null); end if;
  return json_build_object('token', t, 'role', a.role, 'name', coalesce(dname, a.email));
end $$;

create or replace function public.logout(p_token uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.sessions where token = p_token;
  perform ig.ping();
end $$;

create or replace function public.ping_session(p_token uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.auth(p_token);
end $$;

create or replace function public.me(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; d public.delegations;
begin
  a := ig.auth(p_token);
  select * into d from public.delegations where id = a.delegation_id;
  return json_build_object(
    'email', a.email, 'role', a.role,
    'delegation', case when d.id is null then null else json_build_object(
        'id', d.id, 'name', d.name, 'campus', d.campus, 'auction_ic', d.auction_ic,
        'forex_cash', d.forex_cash, 'members', d.members, 'head', d.head) end,
    'won', (select json_build_object('industry', i.name, 'amount', b.amount)
            from public.bids b join public.industries i on i.id = b.industry_id
            where b.delegation_id = a.delegation_id and b.status = 'won' limit 1),
    'bookings', (select coalesce(json_agg(json_build_object('room', r.name, 'amount', bk.amount)), '[]'::json)
                 from public.bookings bk join public.rooms r on r.id = bk.room_id
                 where bk.delegation_id = a.delegation_id)
  );
end $$;

-- ------------------------------------------------------------- auction
create or replace function ig.auction_state_raw(p_token uuid, p_industry int default null) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; d public.delegations; detail json := null; my_amt int; my_upd timestamptz; my_rank int := null;
begin
  a := ig.auth(p_token);
  select * into d from public.delegations where id = a.delegation_id;

  if p_industry is not null then
    select amount, updated_at into my_amt, my_upd from public.bids
      where industry_id = p_industry and delegation_id = d.id;
    if my_amt is not null then
      select count(*) + 1 into my_rank from public.bids
        where industry_id = p_industry and (amount > my_amt or (amount = my_amt and updated_at < my_upd));
    end if;
    detail := json_build_object(
      'id', p_industry,
      'my_rank', my_rank,
      'top', (select coalesce(json_agg(t order by t.rank), '[]'::json) from (
                select row_number() over (order by b.amount desc, b.updated_at asc) as rank,
                       dl.name, b.amount, b.status, (b.delegation_id = d.id) as mine
                from public.bids b join public.delegations dl on dl.id = b.delegation_id
                where b.industry_id = p_industry
                order by b.amount desc, b.updated_at asc limit 15) t),
      'winners', (select coalesce(json_agg(w order by w.amount desc), '[]'::json) from (
                select dl.name, b.amount from public.bids b join public.delegations dl on dl.id = b.delegation_id
                where b.industry_id = p_industry and b.status = 'won') w)
    );
  end if;

  return json_build_object(
    'min_bid', 50,
    'me', case when d.id is null then null else json_build_object(
            'name', d.name, 'ic', d.auction_ic,
            'won', (select json_build_object('industry', i.name, 'amount', b.amount)
                    from public.bids b join public.industries i on i.id = b.industry_id
                    where b.delegation_id = d.id and b.status = 'won' limit 1)) end,
    'industries', (select coalesce(json_agg(x order by x.id), '[]'::json) from (
        select i.id, i.name, i.places, i.status, i.settled,
               (select count(*) from public.bids b where b.industry_id = i.id) as bid_count,
               (select count(*) from public.bids b where b.industry_id = i.id and b.status = 'won') as won_count,
               (select b.amount from public.bids b where b.industry_id = i.id and b.delegation_id = d.id) as my_bid,
               (select b.status from public.bids b where b.industry_id = i.id and b.delegation_id = d.id) as my_status
        from public.industries i) x),
    'detail', detail
  );
end $$;

create or replace function public.auction_bid(p_token uuid, p_industry int, p_amount int) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; d public.delegations; i public.industries;
begin
  a := ig.need_delegate(p_token);
  -- lock order: industry first, then the delegation (so closing an auction can never deadlock a bid)
  select * into i from public.industries where id = p_industry for share;
  if not found then raise exception 'That industry does not exist.'; end if;
  select * into d from public.delegations where id = a.delegation_id for update;
  if i.status <> 'open' then raise exception 'Bidding for this industry is not open right now.'; end if;
  if exists (select 1 from public.bids where delegation_id = d.id and status = 'won') then
    raise exception 'Your delegation has already won an industry.';
  end if;
  if p_amount is null or p_amount < 50 then raise exception 'The minimum bid is 50 ICs.'; end if;
  if p_amount > d.auction_ic then raise exception 'Your bid cannot be more than your balance of % ICs.', d.auction_ic; end if;
  insert into public.bids (industry_id, delegation_id, amount)
  values (p_industry, d.id, p_amount)
  on conflict (industry_id, delegation_id) do update
    set updated_at = case when public.bids.amount <> excluded.amount then now() else public.bids.updated_at end,
        amount = excluded.amount,
        status = 'pending';
  perform ig.log(d.id, 'auction', 'Bid ' || p_amount || ' ICs on ' || i.name, p_amount);
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

create or replace function public.auction_withdraw(p_token uuid, p_industry int) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; i public.industries;
begin
  a := ig.need_delegate(p_token);
  select * into i from public.industries where id = p_industry for share;
  if not found or i.status <> 'open' then raise exception 'Bids can only be withdrawn while the industry is open.'; end if;
  delete from public.bids where industry_id = p_industry and delegation_id = a.delegation_id and status = 'pending';
  perform ig.log(a.delegation_id, 'auction', 'Withdrew bid on ' || i.name, null);
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

create or replace function ig.admin_auction_raw(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.need_staff(p_token);
  return json_build_object(
    'industries', (select coalesce(json_agg(x order by x.id), '[]'::json) from (
        select i.id, i.name, i.places, i.status, i.settled,
          (select coalesce(json_agg(b order by b.rank), '[]'::json) from (
              select row_number() over (order by bd.amount desc, bd.updated_at asc) as rank,
                     dl.name, bd.amount, bd.status
              from public.bids bd join public.delegations dl on dl.id = bd.delegation_id
              where bd.industry_id = i.id) b) as bids
        from public.industries i) x),
    'without_industry', (select count(*) from public.delegations d
                         where not exists (select 1 from public.bids b where b.delegation_id = d.id and b.status = 'won')),
    'total_delegations', (select count(*) from public.delegations)
  );
end $$;

create or replace function public.admin_auction_set(p_token uuid, p_ids int[], p_action text) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.need_admin(p_token);
  if p_action = 'open' then
    update public.industries set status = 'open' where id = any(p_ids);
  elsif p_action = 'pause' then
    update public.industries set status = 'paused' where id = any(p_ids) and status = 'open';
  elsif p_action = 'close' then
    perform ig.settle(p_ids);
  else
    raise exception 'Unknown action.';
  end if;
  perform ig.log_admin(a.email, 'auction', initcap(p_action) || ' auction for ' || coalesce(array_length(p_ids,1),0) || ' industr' || case when coalesce(array_length(p_ids,1),0) = 1 then 'y' else 'ies' end);
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_industry_add(p_token uuid, p_name text, p_places int default 10) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; nid int;
begin
  a := ig.need_admin(p_token);
  if length(trim(coalesce(p_name,''))) = 0 then raise exception 'Enter an industry name.'; end if;
  if coalesce(p_places,0) < 1 then raise exception 'Places must be at least 1.'; end if;
  lock table public.industries in share row exclusive mode;
  select coalesce(max(id), 0) + 1 into nid from public.industries;
  insert into public.industries (id, name, places) values (nid, trim(p_name), p_places);
  perform ig.log_admin(a.email, 'auction', 'Added industry ' || trim(p_name));
  perform ig.ping();
  return json_build_object('ok', true, 'id', nid);
end $$;

create or replace function public.admin_industry_update(p_token uuid, p_id int, p_name text, p_places int) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.need_admin(p_token);
  if length(trim(coalesce(p_name,''))) = 0 then raise exception 'The industry needs a name.'; end if;
  if coalesce(p_places,0) < 1 then raise exception 'Places must be at least 1.'; end if;
  if exists (select 1 from public.industries where id = p_id and settled and places <> p_places) then
    raise exception 'This industry is already settled, so its places cannot change.';
  end if;
  update public.industries set name = trim(p_name), places = p_places where id = p_id;
  perform ig.log_admin(a.email, 'auction', 'Edited industry ' || trim(p_name));
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_industry_delete(p_token uuid, p_id int) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; nm text; n int;
begin
  a := ig.need_admin(p_token);
  select name into nm from public.industries where id = p_id;
  if nm is null then raise exception 'Industry not found.'; end if;
  perform 1 from public.delegations order by id for update;
  select count(*) into n from public.bids where industry_id = p_id and status = 'won';
  update public.delegations d set auction_ic = d.auction_ic + b.amount
    from public.bids b where b.industry_id = p_id and b.status = 'won' and b.delegation_id = d.id;
  delete from public.industries where id = p_id;
  perform ig.log_admin(a.email, 'auction', 'Removed industry ' || nm || case when n > 0 then ' (refunded ' || n || ' winner(s))' else '' end);
  perform ig.ping();
  return json_build_object('ok', true, 'refunded', n);
end $$;

-- -------------------------------------------------------- room booking
create or replace function ig.rooms_state_raw(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; d public.delegations;
begin
  a := ig.auth(p_token);
  select * into d from public.delegations where id = a.delegation_id;
  return json_build_object(
    'now', (extract(epoch from now()) * 1000)::bigint,
    'me', case when d.id is null then null else json_build_object('name', d.name, 'ic', d.auction_ic) end,
    'rooms', (select coalesce(json_agg(x order by x.id), '[]'::json) from (
        select r.id, r.name, r.price, r.places, r.status,
          (select count(*) from public.bookings b where b.room_id = r.id) as booked,
          (select b.amount from public.bookings b where b.room_id = r.id and b.delegation_id = d.id) as my_amount,
          (select coalesce(json_agg(q order by q.created_at), '[]'::json) from (
              select dl.name, b.amount, b.created_at
              from public.bookings b join public.delegations dl on dl.id = b.delegation_id
              where b.room_id = r.id) q) as bookers
        from public.rooms r) x)
  );
end $$;

create or replace function public.room_book(p_token uuid, p_room int, p_amount int) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; d public.delegations; r public.rooms; taken int;
begin
  a := ig.need_delegate(p_token);
  select * into d from public.delegations where id = a.delegation_id for update;
  select * into r from public.rooms where id = p_room for update;
  if not found then raise exception 'That room does not exist.'; end if;
  if r.status <> 'open' then raise exception 'Booking for this room is not open right now.'; end if;
  if d.auction_ic <= 0 then raise exception 'You have no ICs left to book a room.'; end if;
  if exists (select 1 from public.bookings where room_id = r.id and delegation_id = d.id) then
    raise exception 'You have already booked this room.';
  end if;
  select count(*) into taken from public.bookings where room_id = r.id;
  if taken >= r.places then raise exception 'This room is full (% of % places taken).', taken, r.places; end if;
  if p_amount is null or p_amount < r.price then raise exception 'The minimum for this room is % ICs.', r.price; end if;
  if p_amount > d.auction_ic then raise exception 'That is more than your remaining balance of % ICs.', d.auction_ic; end if;
  update public.delegations set auction_ic = auction_ic - p_amount where id = d.id;
  insert into public.bookings (room_id, delegation_id, amount) values (r.id, d.id, p_amount);
  perform ig.log(d.id, 'room', 'Booked ' || r.name || ' for ' || p_amount || ' ICs', p_amount);
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

create or replace function ig.admin_rooms_raw(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.need_staff(p_token);
  return json_build_object('rooms', (select coalesce(json_agg(x order by x.id), '[]'::json) from (
      select r.id, r.name, r.price, r.places, r.status,
        (select coalesce(json_agg(q order by q.created_at), '[]'::json) from (
            select b.id, dl.name, b.amount, b.created_at
            from public.bookings b join public.delegations dl on dl.id = b.delegation_id
            where b.room_id = r.id) q) as bookings
      from public.rooms r) x));
end $$;

create or replace function public.admin_room_set(p_token uuid, p_ids int[], p_action text) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.need_admin(p_token);
  if p_action = 'open' then update public.rooms set status = 'open' where id = any(p_ids);
  elsif p_action = 'close' then update public.rooms set status = 'closed' where id = any(p_ids);
  else raise exception 'Unknown action.'; end if;
  perform ig.log_admin(a.email, 'room', initcap(p_action) || ' room booking');
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

drop function if exists public.admin_room_update(uuid,int,int,int);
create or replace function public.admin_room_update(p_token uuid, p_room int, p_price int, p_places int, p_name text default null) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.need_admin(p_token);
  if p_price < 1 or p_places < 1 then raise exception 'Price and places must be at least 1.'; end if;
  if p_name is not null and length(trim(p_name)) = 0 then raise exception 'The room needs a name.'; end if;
  if (select count(*) from public.bookings where room_id = p_room) > p_places then
    raise exception 'More delegations than that have already booked this room. Cancel some bookings first.';
  end if;
  update public.rooms set price = p_price, places = p_places, name = coalesce(nullif(trim(p_name), ''), name) where id = p_room;
  perform ig.log_admin(a.email, 'room', 'Edited room ' || coalesce(nullif(trim(p_name), ''), '#' || p_room));
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_room_add(p_token uuid, p_name text, p_price int, p_places int) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; nid int;
begin
  a := ig.need_admin(p_token);
  if length(trim(coalesce(p_name,''))) = 0 then raise exception 'Enter a room name.'; end if;
  if coalesce(p_price,0) < 1 or coalesce(p_places,0) < 1 then raise exception 'Price and places must be at least 1.'; end if;
  lock table public.rooms in share row exclusive mode;
  select coalesce(max(id), 0) + 1 into nid from public.rooms;
  insert into public.rooms (id, name, price, places) values (nid, trim(p_name), p_price, p_places);
  perform ig.log_admin(a.email, 'room', 'Added room ' || trim(p_name));
  perform ig.ping();
  return json_build_object('ok', true, 'id', nid);
end $$;

create or replace function public.admin_room_delete(p_token uuid, p_room int) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; rn text; n int;
begin
  a := ig.need_admin(p_token);
  select name into rn from public.rooms where id = p_room;
  if rn is null then raise exception 'Room not found.'; end if;
  perform 1 from public.delegations order by id for update;
  select count(*) into n from public.bookings where room_id = p_room;
  update public.delegations d set auction_ic = d.auction_ic + b.amount
    from public.bookings b where b.room_id = p_room and b.delegation_id = d.id;
  delete from public.rooms where id = p_room;
  perform ig.log_admin(a.email, 'room', 'Removed room ' || rn || case when n > 0 then ' (refunded ' || n || ' booking(s))' else '' end);
  perform ig.ping();
  return json_build_object('ok', true, 'refunded', n);
end $$;

create or replace function public.admin_booking_cancel(p_token uuid, p_booking uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; b public.bookings; rn text;
begin
  a := ig.need_admin(p_token);
  select * into b from public.bookings where id = p_booking;
  if not found then raise exception 'Booking not found.'; end if;
  select name into rn from public.rooms where id = b.room_id;
  update public.delegations set auction_ic = auction_ic + b.amount where id = b.delegation_id;
  delete from public.bookings where id = p_booking;
  perform ig.log(b.delegation_id, 'room', 'Booking for ' || rn || ' cancelled by an organizer, ' || b.amount || ' ICs refunded', b.amount);
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

-- -------------------------------------------------- Foreign X Change
create or replace function ig.forex_state_raw(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  a public.accounts; d public.delegations; c public.forex_control; n record;
  rt jsonb; prev jsonb := null; fr public.forex_rounds; total bigint := null;
begin
  a := ig.auth(p_token);
  select * into c from public.forex_control where id = 1;
  select * into n from ig.fx_now();
  select * into fr from public.forex_rounds where round = n.rnd;
  rt := fr.rates;
  if n.rnd > 1 then select rates into prev from public.forex_rounds where round = n.rnd - 1; end if;
  select * into d from public.delegations where id = a.delegation_id;
  if d.id is not null then total := ig.fx_total(d.id, rt); end if;

  return json_build_object(
    'now', (extract(epoch from now()) * 1000)::bigint,
    'status', n.st,
    'round', n.rnd,
    'total_rounds', 10,
    'ends_ms', case when n.ends is null then null else (extract(epoch from n.ends) * 1000)::bigint end,
    'start_cash', c.start_cash,
    'rates', case when n.st = 'closed' then null else rt end,
    'prev', case when n.st = 'closed' then null else prev end,
    'crisis', case when n.st = 'closed' or fr.media_path is null then null
                   else json_build_object('kind', fr.media_kind, 'path', fr.media_path, 'title', fr.title) end,
    'me', case when d.id is null then null else json_build_object(
            'name', d.name, 'cash', d.forex_cash, 'total', total, 'pnl', total - c.start_cash,
            'holdings', (select coalesce(json_object_agg(h.cur, json_build_object('qty', h.qty, 'cost', h.cost)), '{}'::json)
                         from public.forex_holdings h where h.delegation_id = d.id and h.qty > 0)) end,
    'trades', (select coalesce(json_agg(t order by t.at desc), '[]'::json) from (
                 select ft.round, ft.cur, ft.side, ft.qty, ft.price, ft.pnl, ft.created_at as at
                 from public.forex_trades ft where ft.delegation_id = d.id
                 order by ft.created_at desc limit 60) t),
    'standings', case when n.st = 'finished' then
                 (select coalesce(json_agg(s order by s.total desc), '[]'::json) from (
                    select dl.name, ig.fx_total(dl.id, rt) as total from public.delegations dl) s)
                 else null end
  );
end $$;

create or replace function public.forex_trade(p_token uuid, p_cur text, p_side text, p_qty int, p_round int default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  a public.accounts; d public.delegations; n record; price int; v_cost bigint;
  h public.forex_holdings; basis bigint; proceeds bigint; pnl int; nm text;
begin
  a := ig.need_delegate(p_token);
  select * into d from public.delegations where id = a.delegation_id for update;
  select * into n from ig.fx_now();
  if n.st <> 'open' then raise exception 'Trading is not open right now.'; end if;
  if p_round is not null and p_round <> n.rnd then raise exception 'ROUND_CHANGED'; end if;
  select (rates ->> p_cur)::int into price from public.forex_rounds where round = n.rnd;
  if price is null then raise exception 'Unknown currency.'; end if;
  if p_side not in ('buy','sell') then raise exception 'Unknown trade type.'; end if;
  if p_qty is null or p_qty < 1 then raise exception 'Enter a whole number above 0.'; end if;
  if p_qty > 100000000 then raise exception 'That amount is too large.'; end if;
  nm := case p_cur when 'usd' then 'Dollar' when 'eur' then 'Euro' when 'cny' then 'Yuan'
                   when 'jpy' then 'Yen' when 'rub' then 'Ruble' else 'Riyal' end;

  if p_side = 'buy' then
    v_cost := p_qty::bigint * price;
    if v_cost > d.forex_cash then
      raise exception 'Not enough ICs. You can buy at most % units at % ICs each.', (d.forex_cash / price), price;
    end if;
    update public.delegations set forex_cash = forex_cash - v_cost::int where id = d.id;
    insert into public.forex_holdings (delegation_id, cur, qty, cost) values (d.id, p_cur, p_qty, v_cost)
      on conflict (delegation_id, cur) do update
        set qty = public.forex_holdings.qty + excluded.qty, cost = public.forex_holdings.cost + excluded.cost;
    pnl := null;
    perform ig.log(d.id, 'forex', 'Bought ' || p_qty || ' ' || nm || ' at ' || price || ' ICs', null);
  else
    select * into h from public.forex_holdings where delegation_id = d.id and cur = p_cur for update;
    if not found or h.qty < p_qty then
      raise exception 'You only own % %.', coalesce(h.qty, 0), nm;
    end if;
    basis := round(h.cost::numeric * p_qty / h.qty);
    proceeds := p_qty::bigint * price;
    pnl := (proceeds - basis)::int;
    update public.forex_holdings set qty = qty - p_qty, cost = cost - basis
      where delegation_id = d.id and cur = p_cur;
    update public.delegations set forex_cash = forex_cash + proceeds::int where id = d.id;
    perform ig.log(d.id, 'forex', 'Sold ' || p_qty || ' ' || nm || ' at ' || price || ' ICs', pnl);
  end if;

  insert into public.forex_trades (delegation_id, round, cur, side, qty, price, pnl)
  values (d.id, n.rnd, p_cur, p_side, p_qty, price, pnl);
  perform ig.ping();
  return json_build_object('ok', true, 'pnl', pnl);
end $$;

create or replace function ig.admin_forex_raw(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; c public.forex_control; n record; rt jsonb;
begin
  a := ig.need_staff(p_token);
  select * into c from public.forex_control where id = 1;
  select * into n from ig.fx_now();
  select rates into rt from public.forex_rounds where round = n.rnd;
  return json_build_object(
    'control', json_build_object('mode', c.mode, 'status', c.status, 'round', c.round, 'running', c.running, 'start_cash', c.start_cash),
    'cur', json_build_object('status', n.st, 'round', n.rnd,
             'ends_ms', case when n.ends is null then null else (extract(epoch from n.ends) * 1000)::bigint end),
    'rounds', (select coalesce(json_agg(r order by r.round), '[]'::json) from (
                 select round, title, media_kind, media_path, rates, duration_seconds from public.forex_rounds) r),
    'standings', (select coalesce(json_agg(s order by s.total desc), '[]'::json) from (
                 select dl.id, dl.name, dl.campus, dl.forex_cash as cash,
                        ig.fx_total(dl.id, rt) as total,
                        ig.fx_total(dl.id, rt) - c.start_cash as pnl,
                        (select coalesce(json_object_agg(h.cur, h.qty), '{}'::json)
                         from public.forex_holdings h where h.delegation_id = dl.id and h.qty > 0) as holdings
                 from public.delegations dl) s)
  );
end $$;

create or replace function ig.admin_forex_trades_raw(p_token uuid, p_limit int default 150) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.need_staff(p_token);
  return (select coalesce(json_agg(t order by t.at desc), '[]'::json) from (
            select ft.created_at as at, dl.name, ft.round, ft.cur, ft.side, ft.qty, ft.price, ft.pnl
            from public.forex_trades ft join public.delegations dl on dl.id = ft.delegation_id
            order by ft.created_at desc limit least(greatest(p_limit, 1), 500)) t);
end $$;

create or replace function public.admin_forex_round_save(p_token uuid, p_round int, p_title text,
    p_kind text, p_path text, p_rates jsonb, p_duration int) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; k text;
begin
  a := ig.need_admin(p_token);
  foreach k in array array['usd','eur','cny','jpy','rub','sar'] loop
    if (p_rates ->> k) is null or (p_rates ->> k)::int < 1 then
      raise exception 'Every rate must be a whole number of at least 1 IC.';
    end if;
  end loop;
  update public.forex_rounds set
    title = coalesce(p_title, ''),
    rates = p_rates,
    duration_seconds = greatest(5, coalesce(p_duration, 240)),
    media_kind = case when p_path is null then media_kind when p_path = '' then null else p_kind end,
    media_path = case when p_path is null then media_path when p_path = '' then null else p_path end
  where round = p_round;
  perform ig.log_admin(a.email, 'forex', 'Saved setup for round ' || p_round);
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_forex_ctl(p_token uuid, p_action text, p_arg int default null) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; c public.forex_control; msg text;
begin
  a := ig.need_admin(p_token);
  select * into c from public.forex_control where id = 1 for update;

  if p_action = 'mode_manual' or p_action = 'mode_auto' then
    if c.status = 'open' or c.running then raise exception 'Pause trading before switching between manual and automatic.'; end if;
    update public.forex_control set mode = case when p_action = 'mode_auto' then 'auto' else 'manual' end where id = 1;
    msg := 'Switched to ' || case when p_action = 'mode_auto' then 'automatic' else 'manual' end || ' rounds';

  elsif p_action = 'open' then
    if c.mode <> 'manual' then raise exception 'Use Start / Resume in automatic mode.'; end if;
    update public.forex_control set status = 'open' where id = 1;
    msg := 'Opened trading for round ' || c.round;

  elsif p_action = 'pause' then
    if c.mode = 'manual' then
      update public.forex_control set status = 'paused' where id = 1 and status = 'open';
    else
      update public.forex_control set running = false, paused_at = now() where id = 1 and running;
    end if;
    msg := 'Paused trading';

  elsif p_action = 'auto_start' then
    if c.mode <> 'auto' then raise exception 'Switch to automatic mode first.'; end if;
    if c.started_at is null then
      update public.forex_control set started_at = now(), paused_at = null, running = true where id = 1;
      msg := 'Started automatic rounds';
    elsif not c.running then
      update public.forex_control set started_at = started_at + (now() - coalesce(paused_at, now())), paused_at = null, running = true where id = 1;
      msg := 'Resumed automatic rounds';
    end if;

  elsif p_action = 'next' then
    if c.mode <> 'manual' then raise exception 'Next round is for manual mode.'; end if;
    if c.round >= 10 then
      update public.forex_control set status = 'finished' where id = 1;
      msg := 'Finished the exchange';
    else
      update public.forex_control set round = round + 1, status = case when p_arg = 1 then 'open' else 'paused' end where id = 1;
      msg := 'Moved to round ' || (c.round + 1) || case when p_arg = 1 then ' and opened trading' else ' (trading paused)' end;
    end if;

  elsif p_action = 'goto' then
    if c.mode <> 'manual' then raise exception 'Jumping to a round is for manual mode.'; end if;
    if p_arg is null or p_arg < 1 or p_arg > 10 then raise exception 'Round must be 1 to 10.'; end if;
    update public.forex_control set round = p_arg, status = 'paused' where id = 1;
    msg := 'Jumped to round ' || p_arg;

  elsif p_action = 'finish' then
    if c.mode = 'manual' then
      update public.forex_control set status = 'finished' where id = 1;
    else
      update public.forex_control set started_at = now() - interval '100 days', running = false, paused_at = now() where id = 1;
    end if;
    msg := 'Finished the exchange';

  elsif p_action = 'reset' then
    perform 1 from public.delegations order by id for update;
    update public.forex_control set status = 'closed', round = 1, running = false, started_at = null, paused_at = null where id = 1;
    delete from public.forex_trades;
    delete from public.forex_holdings;
    update public.delegations set forex_cash = (select start_cash from public.forex_control where id = 1);
    msg := 'RESET the exchange (all balances back to ' || c.start_cash || ' ICs)';

  else
    raise exception 'Unknown action.';
  end if;

  perform ig.log_admin(a.email, 'forex', coalesce(msg, p_action));
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

-- --------------------------------------------------- accounts (admin)
create or replace function ig.admin_accounts_raw(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.need_staff(p_token);
  return json_build_object(
    'can_see_passwords', (a.role = 'admin'),
    'accounts', (select coalesce(json_agg(x order by x.role, x.delegation, x.email), '[]'::json) from (
        select ac.id, ac.email,
               case when a.role = 'admin' then ac.password else null end as password,
               ac.role, ac.delegation_id, coalesce(dl.name, '') as delegation, coalesce(dl.campus, '') as campus,
               exists (select 1 from public.sessions s where s.account_id = ac.id) as logged_in,
               exists (select 1 from public.sessions s where s.account_id = ac.id and s.last_seen > now() - interval '5 minutes') as online
        from public.accounts ac left join public.delegations dl on dl.id = ac.delegation_id) x),
    'delegations', (select coalesce(json_agg(y order by y.name), '[]'::json) from (
        select dl.id, dl.name, dl.campus, dl.auction_ic, dl.forex_cash, dl.members, dl.head,
               (select count(*) from public.accounts ac where ac.delegation_id = dl.id) as account_count
        from public.delegations dl) y)
  );
end $$;

drop function if exists public.admin_account_create(uuid,text,text,text,text,text,uuid);
create or replace function public.admin_account_create(p_token uuid, p_email text, p_password text, p_role text,
    p_team text default null, p_campus text default '', p_delegation uuid default null,
    p_members jsonb default null) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; id uuid;
begin
  a := ig.need_admin(p_token);
  id := ig.create_account(p_email, p_password, p_role, p_team, p_campus, p_delegation, p_members);
  perform ig.log_admin(a.email, 'account', 'Created ' || p_role || ' account ' || lower(trim(p_email)));
  perform ig.ping();
  return json_build_object('ok', true, 'id', id);
end $$;

create or replace function public.admin_bulk_create(p_token uuid, p_rows jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; r jsonb; idx int := 0; made int := 0; errs jsonb := '[]'::jsonb;
begin
  a := ig.need_admin(p_token);
  for r in select value from jsonb_array_elements(p_rows) loop
    idx := idx + 1;
    begin
      perform ig.create_account(r ->> 'email', r ->> 'password', coalesce(r ->> 'role', 'delegate'),
                                r ->> 'team', coalesce(r ->> 'campus', ''), null, r -> 'members');
      made := made + 1;
    exception when others then
      errs := errs || jsonb_build_array(jsonb_build_object('line', idx, 'email', r ->> 'email', 'error', sqlerrm));
    end;
  end loop;
  perform ig.log_admin(a.email, 'account', 'Bulk created ' || made || ' accounts');
  perform ig.ping();
  return json_build_object('created', made, 'errors', errs);
end $$;

create or replace function public.admin_account_update(p_token uuid, p_account uuid, p_email text, p_password text) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; em text := lower(trim(coalesce(p_email,'')));
begin
  a := ig.need_admin(p_token);
  if length(em) < 3 or em ~ '\s' then raise exception 'Enter an email or username (at least 3 characters, no spaces).'; end if;
  if length(coalesce(p_password,'')) < 4 then raise exception 'Password must be at least 4 characters.'; end if;
  if exists (select 1 from public.accounts where email = em and id <> p_account) then
    raise exception 'Another account already uses that email.';
  end if;
  update public.accounts set email = em, password = p_password where id = p_account;
  delete from public.sessions where account_id = p_account;   -- changing details signs the account out
  perform ig.log_admin(a.email, 'account', 'Updated login details for ' || em);
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_account_delete(p_token uuid, p_account uuid, p_remove_delegation boolean default false) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; t public.accounts;
begin
  a := ig.need_admin(p_token);
  select * into t from public.accounts where id = p_account;
  if not found then raise exception 'Account not found.'; end if;
  if t.id = a.id then raise exception 'You cannot delete the account you are signed in with.'; end if;
  if t.role = 'admin' and (select count(*) from public.accounts where role = 'admin') <= 1 then
    raise exception 'You cannot delete the last admin account.';
  end if;
  delete from public.accounts where id = p_account;
  if p_remove_delegation and t.delegation_id is not null then
    delete from public.delegations where id = t.delegation_id;
  end if;
  perform ig.log_admin(a.email, 'account', 'Deleted account ' || t.email || case when p_remove_delegation then ' and its delegation' else '' end);
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_force_logout(p_token uuid, p_account uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; em text;
begin
  a := ig.need_admin(p_token);
  select email into em from public.accounts where id = p_account;
  delete from public.sessions where account_id = p_account;
  perform ig.log_admin(a.email, 'account', 'Logged out ' || coalesce(em, 'an account') || ' from its device');
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_delegation_update(p_token uuid, p_id uuid, p_name text, p_campus text,
    p_ic int, p_cash int, p_members jsonb, p_head text) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.need_admin(p_token);
  if length(trim(coalesce(p_name,''))) = 0 then raise exception 'The delegation needs a name.'; end if;
  if p_ic < 0 or p_cash < 0 then raise exception 'Balances cannot be negative.'; end if;
  if exists (select 1 from public.delegations where lower(name) = lower(trim(p_name)) and id <> p_id) then
    raise exception 'Another delegation already uses that name.';
  end if;
  update public.delegations set name = trim(p_name), campus = coalesce(p_campus,''), auction_ic = p_ic,
         forex_cash = p_cash, members = coalesce(p_members, members), head = coalesce(p_head, head)
   where id = p_id;
  perform ig.log_admin(a.email, 'account', 'Edited delegation ' || trim(p_name));
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_delegation_delete(p_token uuid, p_id uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; n text;
begin
  a := ig.need_admin(p_token);
  select name into n from public.delegations where id = p_id;
  delete from public.delegations where id = p_id;
  perform ig.log_admin(a.email, 'account', 'Deleted delegation ' || coalesce(n, '?') || ' with its accounts and data');
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

-- ---------------------------------------------------- live activity
create or replace function ig.admin_activity_raw(p_token uuid, p_kind text default null, p_limit int default 120) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.need_staff(p_token);
  return (select coalesce(json_agg(t order by t.at desc), '[]'::json) from (
            select at, delegation_name, kind, detail, amount from public.activity
            where p_kind is null or kind = p_kind
            order by at desc, id desc limit least(greatest(p_limit, 1), 500)) t);
end $$;

create or replace function ig.admin_overview_raw(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; n record; rt jsonb; c public.forex_control;
begin
  a := ig.need_staff(p_token);
  select * into c from public.forex_control where id = 1;
  select * into n from ig.fx_now();
  select rates into rt from public.forex_rounds where round = n.rnd;
  return json_build_object(
    'delegations', (select count(*) from public.delegations),
    'accounts', (select count(*) from public.accounts),
    'online', (select count(distinct account_id) from public.sessions where last_seen > now() - interval '5 minutes'),
    'bids', (select count(*) from public.bids),
    'winners', (select count(*) from public.bids where status = 'won'),
    'bookings', (select count(*) from public.bookings),
    'trades', (select count(*) from public.forex_trades),
    'auction', json_build_object(
        'open', (select count(*) from public.industries where status = 'open'),
        'paused', (select count(*) from public.industries where status = 'paused'),
        'closed', (select count(*) from public.industries where status = 'closed')),
    'rooms', json_build_object(
        'open', (select count(*) from public.rooms where status = 'open'),
        'closed', (select count(*) from public.rooms where status = 'closed')),
    'forex', json_build_object('status', n.st, 'round', n.rnd, 'mode', c.mode,
             'ends_ms', case when n.ends is null then null else (extract(epoch from n.ends) * 1000)::bigint end),
    'top', (select coalesce(json_agg(s order by s.total desc), '[]'::json) from (
              select dl.name, ig.fx_total(dl.id, rt) as total, ig.fx_total(dl.id, rt) - c.start_cash as pnl
              from public.delegations dl order by ig.fx_total(dl.id, rt) desc limit 5) s),
    'activity', (select coalesce(json_agg(t order by t.at desc), '[]'::json) from (
              select at, delegation_name, kind, detail, amount from public.activity order by at desc, id desc limit 12) t)
  );
end $$;

-- ------------------------------------------- public getters (live-gated)
create or replace function public.auction_state(p_token uuid, p_industry int default null, p_known text default null) returns json
language plpgsql security definer set search_path = public as $$
begin return ig.gate(ig.auction_state_raw(p_token, p_industry), p_known); end $$;

create or replace function public.rooms_state(p_token uuid, p_known text default null) returns json
language plpgsql security definer set search_path = public as $$
begin return ig.gate(ig.rooms_state_raw(p_token), p_known); end $$;

create or replace function public.forex_state(p_token uuid, p_known text default null) returns json
language plpgsql security definer set search_path = public as $$
begin return ig.gate(ig.forex_state_raw(p_token), p_known); end $$;

create or replace function public.admin_auction(p_token uuid, p_known text default null) returns json
language plpgsql security definer set search_path = public as $$
begin return ig.gate(ig.admin_auction_raw(p_token), p_known); end $$;

create or replace function public.admin_rooms(p_token uuid, p_known text default null) returns json
language plpgsql security definer set search_path = public as $$
begin return ig.gate(ig.admin_rooms_raw(p_token), p_known); end $$;

create or replace function public.admin_forex(p_token uuid, p_known text default null) returns json
language plpgsql security definer set search_path = public as $$
begin return ig.gate(ig.admin_forex_raw(p_token), p_known); end $$;

create or replace function public.admin_forex_trades(p_token uuid, p_limit int default 150, p_known text default null) returns json
language plpgsql security definer set search_path = public as $$
begin return ig.gate(ig.admin_forex_trades_raw(p_token, p_limit), p_known); end $$;

create or replace function public.admin_accounts(p_token uuid, p_known text default null) returns json
language plpgsql security definer set search_path = public as $$
begin return ig.gate(ig.admin_accounts_raw(p_token), p_known); end $$;

create or replace function public.admin_activity(p_token uuid, p_kind text default null, p_limit int default 120, p_known text default null) returns json
language plpgsql security definer set search_path = public as $$
begin return ig.gate(ig.admin_activity_raw(p_token, p_kind, p_limit), p_known); end $$;

create or replace function public.admin_overview(p_token uuid, p_known text default null) returns json
language plpgsql security definer set search_path = public as $$
begin return ig.gate(ig.admin_overview_raw(p_token), p_known); end $$;

-- a delegation's own history (bids, bookings, trades), newest first
create or replace function ig.my_activity_raw(p_token uuid, p_limit int default 80) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.need_delegate(p_token);
  return (select coalesce(json_agg(t order by t.at desc), '[]'::json) from (
            select at, kind, detail, amount from public.activity
            where delegation_id = a.delegation_id and kind in ('auction','room','forex')
            order by at desc, id desc limit least(greatest(p_limit, 1), 300)) t);
end $$;

create or replace function public.my_activity(p_token uuid, p_limit int default 80, p_known text default null) returns json
language plpgsql security definer set search_path = public as $$
begin return ig.gate(ig.my_activity_raw(p_token, p_limit), p_known); end $$;

-- ----------------------------------------------- crisis media storage
-- Public bucket, but files have unguessable names and nothing can list
-- them; delegates are only ever handed the link for the CURRENT round.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crisis', 'crisis', true, 52428800,
        array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update set public = true, file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'];

-- Uploading needs a one-time ticket that only a signed-in ADMIN can create, so
-- nobody else can put files in the bucket even though the website key is public.
create table if not exists public.upload_tickets (
  name       text primary key,
  expires_at timestamptz not null
);
alter table public.upload_tickets enable row level security;

create or replace function public.upload_ok(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.upload_tickets where name = p_name and expires_at > now())
$$;

create or replace function public.admin_upload_ticket(p_token uuid, p_round int, p_ext text) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts; ext text := lower(coalesce(p_ext, '')); nm text; kind text;
begin
  a := ig.need_admin(p_token);
  if ext not in ('jpg','jpeg','png','webp','gif','mp4','webm') then
    raise exception 'Use a JPG, PNG, WEBP, GIF, MP4 or WEBM file.';
  end if;
  if p_round is null or p_round < 1 or p_round > 10 then raise exception 'Round must be 1 to 10.'; end if;
  delete from public.upload_tickets where expires_at < now();
  nm := 'r' || p_round || '-' || gen_random_uuid()::text || '.' || ext;
  insert into public.upload_tickets (name, expires_at) values (nm, now() + interval '15 minutes');
  kind := case when ext in ('mp4','webm') then 'video' else 'image' end;
  return json_build_object('path', nm, 'kind', kind);
end $$;

drop policy if exists "ignite crisis upload" on storage.objects;
create policy "ignite crisis upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'crisis' and public.upload_ok(name));

-- A clean slate for the auction and room booking (use after testing).
create or replace function public.admin_reset_auction_rooms(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare a public.accounts;
begin
  a := ig.need_admin(p_token);
  perform 1 from public.delegations order by id for update;
  delete from public.bookings;
  delete from public.bids;
  update public.industries set status = 'closed', settled = false;
  update public.rooms set status = 'closed';
  update public.delegations set auction_ic = 1000;
  perform ig.log_admin(a.email, 'auction', 'RESET auction and room booking (everyone back to 1000 ICs)');
  perform ig.ping();
  return json_build_object('ok', true);
end $$;

-- Let the browser call the public functions.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- ---------------------------------------------------------------------
-- RESET (only if you ever want to wipe every delegation, bid and trade):
--   truncate public.activity, public.forex_trades, public.forex_holdings,
--            public.bookings, public.bids, public.sessions, public.accounts,
--            public.delegations restart identity cascade;
--   update public.industries set status='closed', settled=false;
--   update public.rooms set status='closed';
--   then re-run the "FIRST ADMIN ACCOUNT" insert near the top.
-- ---------------------------------------------------------------------
