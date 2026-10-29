-- SPEC-10: remove the child created while verifying the add-child flow.
-- Migration: remove_spec10_test_child
-- Keeps public.children empty as required by the spec.

delete from public.children
where id = 'a26efd46-9056-4811-95e3-86847bb6ddf1'
  and full_name = 'Thiago Cuadros';
