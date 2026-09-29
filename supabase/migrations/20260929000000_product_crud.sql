-- Sigma Power ERP — product inventory schema + edit/delete backend
-- Target: Supabase / PostgreSQL
-- Apply with:  supabase db push   OR   paste the whole file into the SQL editor.
--
-- Frontend model this mirrors (src/lib/erp-store.tsx):
--   Product      { id, nameAr, nameEn, categoryId, manufacturer, barcode, values, sellers[] }
--   Category     { id, nameAr, nameEn, fields[] }
--   FieldDef     { id, labelAr, labelEn, type: text|number|dropdown, unit?, options[] }
--   SellerPrice  { id, seller, price, status: in|reserved|out }

-- ---------------------------------------------------------------------------
-- 1. SCHEMA
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id         text primary key,
  name_ar    text        not null,
  name_en    text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_fields (
  id          text primary key,
  category_id text        not null references public.categories (id) on delete cascade,
  label_ar    text        not null,
  label_en    text        not null,
  type        text        not null check (type in ('text', 'number', 'dropdown')),
  unit        text,
  options     text[]      not null default '{}',
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists category_fields_category_id_idx
  on public.category_fields (category_id);

create table if not exists public.products (
  id           text primary key,
  category_id  text        not null references public.categories (id) on delete restrict,
  name_ar      text        not null,
  name_en      text        not null,
  manufacturer text        not null default '—',
  barcode      text        not null unique,
  -- dynamic/custom field values: { "<field_id>": "<string value>" }
  values       jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_name_idx on public.products (lower(name_en));

create table if not exists public.seller_prices (
  id         text primary key,
  product_id text        not null references public.products (id) on delete cascade,
  seller     text        not null,
  price      numeric(12, 2) not null default 0 check (price >= 0),
  status     text        not null default 'in' check (status in ('in', 'reserved', 'out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_prices_product_id_idx on public.seller_prices (product_id);

-- ---------------------------------------------------------------------------
-- 2. updated_at MAINTENANCE
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array ['categories', 'category_fields', 'products', 'seller_prices']
  loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format(
      'create trigger touch_%1$s before update on public.%1$s
         for each row execute function public.touch_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. RLS (required for the Edit/Delete buttons to work from the client)
-- ---------------------------------------------------------------------------

alter table public.categories     enable row level security;
alter table public.category_fields enable row level security;
alter table public.products       enable row level security;
alter table public.seller_prices  enable row level security;

drop policy if exists "categories read"   on public.categories;
drop policy if exists "categories insert" on public.categories;
drop policy if exists "categories update" on public.categories;
drop policy if exists "categories delete" on public.categories;
create policy "categories read"   on public.categories     for select to authenticated using (true);
create policy "categories insert" on public.categories     for insert to authenticated with check (true);
create policy "categories update" on public.categories     for update to authenticated using (true) with check (true);
create policy "categories delete" on public.categories     for delete to authenticated using (true);

drop policy if exists "category_fields read"   on public.category_fields;
drop policy if exists "category_fields insert" on public.category_fields;
drop policy if exists "category_fields update" on public.category_fields;
drop policy if exists "category_fields delete" on public.category_fields;
create policy "category_fields read"   on public.category_fields for select to authenticated using (true);
create policy "category_fields insert" on public.category_fields for insert to authenticated with check (true);
create policy "category_fields update" on public.category_fields for update to authenticated using (true) with check (true);
create policy "category_fields delete" on public.category_fields for delete to authenticated using (true);

-- UPDATE policy is the one the Edit button needs.
drop policy if exists "products read"   on public.products;
drop policy if exists "products insert" on public.products;
drop policy if exists "products update" on public.products;
drop policy if exists "products delete" on public.products;
create policy "products read"   on public.products for select to authenticated using (true);
create policy "products insert" on public.products for insert to authenticated with check (true);
create policy "products update" on public.products for update to authenticated using (true) with check (true);
create policy "products delete" on public.products for delete to authenticated using (true);

drop policy if exists "seller_prices read"   on public.seller_prices;
drop policy if exists "seller_prices insert" on public.seller_prices;
drop policy if exists "seller_prices update" on public.seller_prices;
drop policy if exists "seller_prices delete" on public.seller_prices;
create policy "seller_prices read"   on public.seller_prices for select to authenticated using (true);
create policy "seller_prices insert" on public.seller_prices for insert to authenticated with check (true);
create policy "seller_prices update" on public.seller_prices for update to authenticated using (true) with check (true);
create policy "seller_prices delete" on public.seller_prices for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. ATOMIC EDIT ENDPOINT (base attributes + dynamic fields + seller rows)
--    Payload: { p_id, p_name_ar, p_name_en, p_manufacturer, p_category_id,
--                p_barcode, p_values: jsonb, p_sellers: jsonb }
--    p_sellers = [{ "id": "s1", "seller": "...", "price": 1450, "status": "in" }]
--    Call from the client:  supabase.rpc('update_product', { ...payload })
--    Seller rows are replaced wholesale: rows missing from p_sellers are removed.
-- ---------------------------------------------------------------------------

create or replace function public.update_product(
  p_id            text,
  p_name_ar       text,
  p_name_en       text,
  p_manufacturer  text default '—',
  p_category_id   text default null,
  p_barcode       text default null,
  p_values        jsonb default '{}'::jsonb,
  p_sellers       jsonb default '[]'::jsonb
)
returns public.products
language plpgsql
security invoker
set search_path = public
as $$
declare
  row_out public.products;
begin
  update public.products
     set name_ar      = coalesce(p_name_ar, name_ar),
         name_en      = coalesce(p_name_en, name_en),
         manufacturer = coalesce(p_manufacturer, manufacturer),
         category_id  = coalesce(p_category_id, category_id),
         barcode      = coalesce(p_barcode, barcode),
         values       = coalesce(p_values, values)
   where id = p_id
  returning * into row_out;

  if row_out.id is null then
    raise exception 'Product % not found', p_id using errcode = 'no_data_found';
  end if;

  if p_sellers is not null and jsonb_typeof(p_sellers) = 'array' then
    delete from public.seller_prices where product_id = p_id;

    insert into public.seller_prices (id, product_id, seller, price, status)
    select
      coalesce(nullif(item ->> 'id', ''), gen_random_uuid()::text),
      p_id,
      coalesce(nullif(item ->> 'seller', ''), '—'),
      coalesce((item ->> 'price')::numeric, 0),
      coalesce(nullif(item ->> 'status', ''), 'in')
    from jsonb_array_elements(p_sellers) as item
    where coalesce(item ->> 'seller', '') <> '';
  end if;

  return row_out;
end;
$$;

grant execute on function public.update_product(text, text, text, text, text, text, jsonb, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 5. THE EXACT UPDATE / DELETE QUERIES
-- ---------------------------------------------------------------------------

-- 5a. Update one product (dynamic custom fields live in the `values` jsonb column).
update public.products
   set name_ar      = 'سلك نحاس 4 مم',
       name_en      = 'Copper Wire 4mm',
       manufacturer = 'Elsewedy Electric',
       category_id  = 'cat-wire',
       barcode      = 'SP481920374651',
       values       = '{"f1": "4", "f2": "100", "f3": "PVC"}'::jsonb,
       updated_at   = now()
 where id = 'p1'
returning *;

-- 5b. Update one dynamic field only (jsonb_set merges a single key).
update public.products
   set values     = jsonb_set(values, '{f3}', '"XLPE"'::jsonb, true),
       updated_at = now()
 where id = 'p1'
returning id, barcode, values;

-- 5c. Replace a product's seller prices in one transaction.
delete from public.seller_prices where product_id = 'p1';

insert into public.seller_prices (id, product_id, seller, price, status)
values ('s1', 'p1', 'Cairo Electric Co.', 1450, 'in'),
       ('s2', 'p1', 'Delta Supplies', 1385, 'in'),
       ('s3', 'p1', 'Nile Wholesale', 1520, 'reserved');

-- 5d. Update a single seller row.
update public.seller_prices
   set price  = 1499,
       status = 'reserved',
       updated_at = now()
 where id = 's2' and product_id = 'p1'
returning *;

-- 5e. Delete one product (seller_prices cascade automatically via FK).
delete from public.products where id = 'p1' returning id, barcode;

-- 5f. Guarded delete: only delete when the barcode still matches.
delete from public.products
 where id = 'p1' and barcode = 'SP481920374651'
returning id;

-- 5g. Soft delete (preferred if you want an audit trail later).
--     Requires:  alter table public.products add column deleted_at timestamptz;
update public.products set deleted_at = now() where id = 'p1';
update public.products set deleted_at = null where id = 'p1'; -- restore

-- 5h. Bulk delete a whole category (what "Delete Category" in /templates needs).
delete from public.products where category_id = 'cat-wire';
delete from public.categories where id = 'cat-wire'; -- cascades category_fields
