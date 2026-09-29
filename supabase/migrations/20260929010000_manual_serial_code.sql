-- Sigma Power ERP — MANUAL serial code / barcode assignment
-- Target: Supabase / PostgreSQL
-- Apply with:  supabase db push   OR   paste the whole file into the SQL editor.
--
-- Frontend model this mirrors (src/lib/erp-store.tsx):
--   Product.barcode  ->  products.barcode   (user-entered, never auto-generated)
--   normalizeSerial() ->  btrim + collapse inner whitespace
--   isValidSerial()   ->  2..64 chars, /^[A-Za-z0-9]([A-Za-z0-9._\-\/ ]*[A-Za-z0-9])?$/
--   findSerialConflict() -> case-insensitive comparison against every other row
--
-- 1. Cleans existing rows (trims + collapses whitespace inside the serial code).
-- 2. Enforces a CASE-INSENSITIVE UNIQUE constraint on the serial code.
-- 3. Enforces the same character format the frontend validates.
-- 4. Keeps the edit RPC (public.update_product) enforcing the same rules.

-- ---------------------------------------------------------------------------
-- 1. NORMALISE EXISTING DATA
--    Run step 1d first if duplicates already exist — the UNIQUE index build
--    (step 2b) will fail otherwise.
-- ---------------------------------------------------------------------------

update public.products
   set barcode = btrim(regexp_replace(coalesce(barcode, ''), '\s+', ' ', 'g'))
 where barcode is distinct from btrim(regexp_replace(coalesce(barcode, ''), '\s+', ' ', 'g'));

-- 1b. Optional: rename the column to serial_code to match the new naming.
--      If you do this, also update src/lib/erp-store.tsx (Product.barcode ->
--      Product.serialCode) and every RPC parameter below.
--
-- alter table public.products rename column barcode to serial_code;

-- 1c. DUPLICATE REPORT — run this to see collisions before creating the index.
select lower(btrim(barcode)) as serial_key, count(*) as rows, array_agg(id) as product_ids
  from public.products
 group by 1
having count(*) > 1;

-- 1d. DUPLICATE RESOLUTION — requires 1c to be run first so you can review the ids.
--      Keep the oldest row of each collision group, re-stamp the rest.
--
-- with ranked as (
--   select id,
--          row_number() over (
--            partition by lower(btrim(barcode))
--            order by created_at asc, id asc
--          ) as rn
--     from public.products
--    where btrim(barcode) <> ''
-- )
-- update public.products p
--    set barcode = 'DUP-' || p.id
--   from ranked r
--  where p.id = r.id and r.rn > 1;

-- ---------------------------------------------------------------------------
-- 2. UNIQUE CONSTRAINT ON THE SERIAL CODE
-- ---------------------------------------------------------------------------

-- 2a. Drop the old case-SENSITIVE unique constraint created by the base schema
--     (products.barcode text not null unique). Keep the inline constraint if you
--     prefer simple case-sensitive uniqueness; the index below is the strict one.
alter table public.products drop constraint if exists products_barcode_key;

-- 2b. Case-insensitive UNIQUE index: "sku-102938" and "SKU-102938" collide.
create unique index if not exists products_barcode_lower_uniq
  on public.products (lower(btrim(barcode)));

-- 2c. NOT NULL, enforced after the clean-up above.
update public.products set barcode = 'LEGACY-' || id where barcode is null or btrim(barcode) = '';
alter table public.products alter column barcode set not null;

-- ---------------------------------------------------------------------------
-- 3. FORMAT CHECK (same character set the frontend accepts)
-- ---------------------------------------------------------------------------

alter table public.products
  drop constraint if exists products_barcode_format;

alter table public.products
  add constraint products_barcode_format
  check (
    char_length(btrim(barcode)) between 2 and 64
    and btrim(barcode) ~ '^[A-Za-z0-9]([A-Za-z0-9._\-/ ]*[A-Za-z0-9])?$'
  );

-- ---------------------------------------------------------------------------
-- 4. EDIT RPC — return a readable error instead of a raw 23505
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
  row_out  public.products;
  new_code text;
  clash    public.products;
begin
  new_code := btrim(regexp_replace(coalesce(p_barcode, ''), '\s+', ' ', 'g'));

  if btrim(coalesce(p_barcode, '')) <> '' then
    if new_code is null or new_code = '' then
      raise exception 'serial code is required' using errcode = '22023';
    end if;
    if char_length(new_code) not between 2 and 64
       or new_code !~ '^[A-Za-z0-9]([A-Za-z0-9._\-/ ]*[A-Za-z0-9])?$' then
      raise exception 'invalid serial code: %', new_code using errcode = '22023';
    end if;

    select * into clash
      from public.products
     where p_id is distinct from id
       and lower(btrim(barcode)) = lower(new_code)
     limit 1;

    if clash.id is not null then
      raise exception 'serial code % already used by product %', new_code, clash.id
        using errcode = '23505';
    end if;
  end if;

  update public.products
     set name_ar      = coalesce(p_name_ar, name_ar),
         name_en      = coalesce(p_name_en, name_en),
         manufacturer = coalesce(p_manufacturer, manufacturer),
         category_id  = coalesce(p_category_id, category_id),
         barcode      = case when btrim(coalesce(p_barcode, '')) <> '' then new_code else barcode end,
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
-- 5. INSERT / UPDATE POLICIES
--    The UNIQUE index and CHECK constraint apply to every writer, including
--    direct inserts from the client, so the policies below need no change.
--    If you want the database to reject duplicates with a friendly message
--    instead of a raw index violation, wrap inserts in an RPC like this:
-- ---------------------------------------------------------------------------

create or replace function public.create_product(
  p_name_ar      text,
  p_name_en      text,
  p_category_id  text,
  p_manufacturer text default '—',
  p_barcode      text,
  p_values       jsonb default '{}'::jsonb,
  p_sellers      jsonb default '[]'::jsonb
)
returns public.products
language plpgsql
security invoker
set search_path = public
as $$
declare
  row_out  public.products;
  new_code text;
  new_id   text := 'p-' || substr(md5(random()::text), 1, 10);
  clash    public.products;
begin
  new_code := btrim(regexp_replace(coalesce(p_barcode, ''), '\s+', ' ', 'g'));

  if new_code = '' then
    raise exception 'serial code is required' using errcode = '22023';
  end if;
  if char_length(new_code) not between 2 and 64
     or new_code !~ '^[A-Za-z0-9]([A-Za-z0-9._\-/ ]*[A-Za-z0-9])?$' then
    raise exception 'invalid serial code: %', new_code using errcode = '22023';
  end if;

  select * into clash
    from public.products
   where lower(btrim(barcode)) = lower(new_code)
   limit 1;

  if clash.id is not null then
    raise exception 'serial code % already used by product %', new_code, clash.id
      using errcode = '23505';
  end if;

  insert into public.products (id, name_ar, name_en, category_id, manufacturer, barcode, values)
  values (new_id, p_name_ar, p_name_en, p_category_id, coalesce(nullif(p_manufacturer, ''), '—'), new_code, coalesce(p_values, '{}'::jsonb))
  returning * into row_out;

  if p_sellers is not null and jsonb_typeof(p_sellers) = 'array' then
    insert into public.seller_prices (id, product_id, seller, price, status)
    select
      coalesce(nullif(item ->> 'id', ''), gen_random_uuid()::text),
      new_id,
      coalesce(nullif(item ->> 'seller', ''), '—'),
      coalesce((item ->> 'price')::numeric, 0),
      coalesce(nullif(item ->> 'status', ''), 'in')
    from jsonb_array_elements(p_sellers) as item
    where coalesce(item ->> 'seller', '') <> '';
  end if;

  return row_out;
end;
$$;

grant execute on function public.create_product(text, text, text, text, text, jsonb, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 6. VERIFY
-- ---------------------------------------------------------------------------

-- 6a. The unique index exists.
select indexname, indexdef
  from pg_indexes
 where schemaname = 'public' and tablename = 'products'
 order by indexname;

-- 6b. The format check exists.
select conname, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid = 'public.products'::regclass
   and contype in ('c', 'u')
 order by conname;

-- 6c. Duplicate detection from the client (used by the frontend live check).
--     supabase.rpc('update_product', { p_id: 'p1', p_barcode: 'SKU-102938' })
--     -> raises 23505 'serial code SKU-102938 already used by product p2'
select id, barcode from public.products where lower(btrim(barcode)) = 'sku-102938';
