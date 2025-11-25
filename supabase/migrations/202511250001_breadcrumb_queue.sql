-- Snow White Laundry — Overshare Engine Schema
-- Stores staff-submitted breadcrumb requests for AI processing

-- Ensure vector search extension exists (required for embeddings)
create extension if not exists vector;

-- Table: swl_breadcrumb_queue
-- Captures raw staff intents before the AI processes them
create table if not exists swl_breadcrumb_queue (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in (
    'identity', 'ethos', 'practice', 'cuisine', 
    'context', 'hospitality', 'operations', 'people'
  )),
  body text not null,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  status text default 'pending' check (status in (
    'pending', 'processing', 'complete', 'failed'
  )),
  processed_at timestamptz,
  result_file text,
  error_message text
);

-- Index for queue processing
create index if not exists idx_breadcrumb_queue_status 
  on swl_breadcrumb_queue(status) 
  where status = 'pending';

create index if not exists idx_breadcrumb_queue_created_at 
  on swl_breadcrumb_queue(created_at desc);

-- Enable RLS
alter table swl_breadcrumb_queue enable row level security;

-- Policy: Staff can insert their own queue items
create policy "Staff can insert breadcrumb requests"
  on swl_breadcrumb_queue for insert
  with check (auth.uid() is not null);

-- Policy: Staff can view their own queue items
create policy "Staff can view own breadcrumb requests"
  on swl_breadcrumb_queue for select
  using (created_by = auth.uid());

-- Policy: Service role can do anything (for edge functions)
create policy "Service role full access to breadcrumb queue"
  on swl_breadcrumb_queue for all
  using (auth.jwt()->>'role' = 'service_role');

-- Table: swl_embeddings
-- Stores vector embeddings for breadcrumb semantic search
create table if not exists swl_embeddings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text,
  category text,
  content text not null,
  embedding vector(1536), -- text-embedding-3-small dimension
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for vector similarity search
create index if not exists idx_swl_embeddings_embedding 
  on swl_embeddings 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists idx_swl_embeddings_category 
  on swl_embeddings(category);

create index if not exists idx_swl_embeddings_slug 
  on swl_embeddings(slug);

-- Enable RLS
alter table swl_embeddings enable row level security;

-- Policy: Anyone can read embeddings (for search)
create policy "Anyone can read embeddings"
  on swl_embeddings for select
  using (true);

-- Policy: Only service role can write embeddings
create policy "Service role can write embeddings"
  on swl_embeddings for all
  using (auth.jwt()->>'role' = 'service_role');

-- Function: Search breadcrumbs by semantic similarity
create or replace function search_breadcrumbs(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  slug text,
  title text,
  category text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    swl_embeddings.id,
    swl_embeddings.slug,
    swl_embeddings.title,
    swl_embeddings.category,
    swl_embeddings.content,
    1 - (swl_embeddings.embedding <=> query_embedding) as similarity
  from swl_embeddings
  where 1 - (swl_embeddings.embedding <=> query_embedding) > match_threshold
  order by swl_embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Grant execute to authenticated users
grant execute on function search_breadcrumbs(vector(1536), float, int) to authenticated;
grant execute on function search_breadcrumbs(vector(1536), float, int) to anon;

comment on table swl_breadcrumb_queue is 'Queue for staff-submitted breadcrumb requests awaiting AI processing';
comment on table swl_embeddings is 'Vector embeddings for breadcrumb semantic search and LLM discoverability';
comment on function search_breadcrumbs is 'Search breadcrumbs by semantic similarity using vector embeddings';

