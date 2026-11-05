-- SPEC-11 database: bucket privado para las fotos de publicaciones.
-- Fuente: specs/database/spec-11-posts-fotos-reacciones-comentarios.md
-- Migration: create_post_photos_bucket

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-photos',
  'post-photos',
  false,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
);

create policy post_photos_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'post-photos'
  and public.is_active_staff()
  and (storage.foldername(name))[1] = public.current_daycare_id()::text
);

create policy post_photos_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'post-photos'
  and public.is_active_staff()
  and (storage.foldername(name))[1] = public.current_daycare_id()::text
);

create policy post_photos_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'post-photos'
  and public.is_active_staff()
  and (storage.foldername(name))[1] = public.current_daycare_id()::text
);
