-- A generated image per report, produced asynchronously.
--
-- The image is made by a SECOND model from the report's own conclusions —
-- summary, key moments, top words, tone — never from the conversation. That
-- boundary is the whole reason this is safe to build: the transcript is
-- discarded once the report exists, and nothing about it reaches an image
-- endpoint.
--
-- It is asynchronous because image generation takes 10-40s on top of a report
-- that already runs close to the edge function's 150s ceiling. Bundling them
-- would push long chats over the limit and cost the user their whole report
-- for the sake of a picture. The report is written first and the image lands
-- when it lands; the client shows the report immediately with the image panel
-- in a generating state.
--
-- Additive only: new nullable columns and a new bucket. Nothing existing
-- changes shape or behaviour.

alter table public.relationship_reports
  add column if not exists image_url text,
  add column if not exists image_status text
    check (image_status in ('pending', 'generating', 'ready', 'failed')),
  add column if not exists image_prompt text,
  add column if not exists image_updated_at timestamptz;

comment on column public.relationship_reports.image_prompt is
  'The prompt sent to the image model. Derived from report conclusions only — it must never contain conversation text.';

-- Public bucket: these images carry no identifying content (abstract art from
-- report conclusions), the URLs are unguessable, and a public bucket means the
-- client can render one with a plain <img> and no signed-URL round trip. Paths
-- are still namespaced by user id so the same folder convention as
-- chat-uploads applies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-images',
  'report-images',
  true,
  5242880,
  array['image/png', 'image/webp', 'image/jpeg']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Only the owner may list or delete their own images. Writing is done by the
-- edge function with the service role, so there is deliberately no insert
-- policy for `authenticated`: a client that could upload here could put
-- arbitrary images on a public bucket under someone else's folder.
drop policy if exists "report_images_select_own" on storage.objects;
create policy "report_images_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'report-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "report_images_delete_own" on storage.objects;
create policy "report_images_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'report-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
