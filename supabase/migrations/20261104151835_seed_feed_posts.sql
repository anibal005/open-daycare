-- SPEC-11 database: seed de las 3 publicaciones del mockup del feed.
-- Fuente: specs/database/spec-11-posts-fotos-reacciones-comentarios.md
-- Migration: seed_feed_posts
-- Seed de desarrollo, idempotente (UUIDs fijos + on conflict do nothing).

do $$
declare
  v_author_id uuid;
  v_daycare_id uuid;
  v_child_id uuid;
  v_child_first_name text;
begin
  select u.id, u.daycare_id
    into strict v_author_id, v_daycare_id
  from public.users u
  join auth.users a on a.id = u.id
  where a.email = 'anibal@gmail.com'
    and u.role in ('staff', 'admin')
    and u.status = 'active';

  select c.id, split_part(c.full_name, ' ', 1)
    into v_child_id, v_child_first_name
  from public.children c
  join public.rooms r on r.id = c.room_id
  where r.daycare_id = v_daycare_id
    and c.status = 'active'
  order by c.created_at, c.id
  limit 1;

  insert into public.posts (id, daycare_id, author_id, type, body, published_at)
  values
    (
      'a1111111-1111-4111-8111-111111111111',
      v_daycare_id,
      v_author_id,
      'achievement',
      '¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.',
      now() - interval '2 hours'
    ),
    (
      'a1111111-1111-4111-8111-111111111112',
      v_daycare_id,
      v_author_id,
      'activity',
      format(
        'Pintamos con témperas esta mañana. %s eligió el azul para todo y se concentró un montón mezclando colores.',
        coalesce(v_child_first_name, 'El grupo')
      ),
      now() - interval '6 hours'
    ),
    (
      'a1111111-1111-4111-8111-111111111113',
      v_daycare_id,
      v_author_id,
      'announcement',
      'El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.',
      now() - interval '9 hours'
    )
  on conflict (id) do nothing;

  if v_child_id is not null then
    insert into public.post_children (post_id, child_id)
    values
      ('a1111111-1111-4111-8111-111111111111', v_child_id),
      ('a1111111-1111-4111-8111-111111111112', v_child_id)
    on conflict (post_id, child_id) do nothing;
  end if;
end;
$$;
