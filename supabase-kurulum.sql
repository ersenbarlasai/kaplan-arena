-- Kaplan Arena - Supabase kurulumu
-- Supabase panelinde: SQL Editor > New query > bu dosyanin tamamini yapistirip RUN.
-- Tekrar calistirmak zararsizdir.
--
-- Tablo dogrudan erisime kapali (RLS acik, politika yok). Sayfa yalnizca
-- ka_set ve ka_get fonksiyonlari uzerinden okur/yazar; bu fonksiyonlar
-- sifre (6 hane), yol bicimi ve boyut kontrolu yapar. 3 gunden eski kayitlar
-- kendiliginden temizlenir.

create table if not exists public.ka_kv (
  pin        text        not null,
  path       text        not null,
  value      jsonb,
  rev        bigint      not null,
  updated_at timestamptz not null default now(),
  primary key (pin, path)
);
create index if not exists ka_kv_pin_rev on public.ka_kv (pin, rev);
create sequence if not exists public.ka_rev_seq;

alter table public.ka_kv enable row level security;
revoke all on public.ka_kv from anon, authenticated;
revoke all on sequence public.ka_rev_seq from anon, authenticated;

-- Bir yola deger yazar (null = sil). Alt yollar silinmis olarak isaretlenir.
create or replace function public.ka_set(p_pin text, p_path text, p_value jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  r bigint;
begin
  if p_pin !~ '^[0-9]{6}$'
     or p_path !~ '^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*$'
     or length(p_path) > 200 then
    raise exception 'gecersiz istek';
  end if;
  if p_value is not null and pg_column_size(p_value) > 65536 then
    raise exception 'veri cok buyuk';
  end if;

  r := nextval('public.ka_rev_seq');

  update public.ka_kv
     set value = null, rev = r, updated_at = now()
   where pin = p_pin
     and left(path, length(p_path) + 1) = p_path || '/'
     and value is not null;

  insert into public.ka_kv (pin, path, value, rev)
  values (p_pin, p_path, p_value, r)
  on conflict (pin, path) do update
    set value = excluded.value, rev = excluded.rev, updated_at = now();

  if random() < 0.02 then
    delete from public.ka_kv where updated_at < now() - interval '3 days';
  end if;

  return r;
end
$$;

-- Verilen sifrelerin p_since'tan sonra degisen kayitlarini ve sunucu saatini dondurur.
create or replace function public.ka_get(p_pins text[], p_since bigint)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    't', (extract(epoch from clock_timestamp()) * 1000)::bigint,
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object('pin', pin, 'p', path, 'v', value, 'r', rev) order by rev)
        from public.ka_kv
       where pin = any (p_pins[1:20]) and rev > p_since
    ), '[]'::jsonb)
  )
$$;

revoke execute on function public.ka_set(text, text, jsonb) from public;
revoke execute on function public.ka_get(text[], bigint) from public;
grant execute on function public.ka_set(text, text, jsonb) to anon, authenticated;
grant execute on function public.ka_get(text[], bigint) to anon, authenticated;
