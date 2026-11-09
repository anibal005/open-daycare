-- SPEC-10: create default rooms
-- Migration: create_default_rooms

insert into public.rooms (daycare_id, name)
select d.id, 'Sala Soles'
from public.daycares d
where not exists (select 1 from public.rooms r where r.daycare_id = d.id and r.name = 'Sala Soles');

insert into public.rooms (daycare_id, name)
select d.id, 'Sala Lunas'
from public.daycares d
where not exists (select 1 from public.rooms r where r.daycare_id = d.id and r.name = 'Sala Lunas');

insert into public.rooms (daycare_id, name)
select d.id, 'Sala Estrellas'
from public.daycares d
where not exists (select 1 from public.rooms r where r.daycare_id = d.id and r.name = 'Sala Estrellas');
