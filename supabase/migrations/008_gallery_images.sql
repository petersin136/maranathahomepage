-- Gallery slot images (local /public/gallery/*)
INSERT INTO public.gallery_images (slot, src, alt, sort_order, is_published) VALUES
  ('top-left',     '/gallery/top-left.jpg',     'Selected look — updo back view', 0, true),
  ('top-right',    '/gallery/top-right.png',    'Selected look — studio portrait', 1, true),
  ('center',       '/gallery/center.jpg',       'Selected look — editorial profile', 2, true),
  ('bottom-left',  '/gallery/bottom-left.jpg',  'Selected look — hair detail', 3, true),
  ('bottom-right', '/gallery/bottom-right.png', 'Selected look — three-quarter portrait', 4, true)
ON CONFLICT DO NOTHING;

-- If rows already exist per slot, run updates instead:
-- UPDATE public.gallery_images SET src = '/gallery/top-left.jpg'     WHERE slot = 'top-left';
-- UPDATE public.gallery_images SET src = '/gallery/top-right.png'    WHERE slot = 'top-right';
-- UPDATE public.gallery_images SET src = '/gallery/center.jpg'       WHERE slot = 'center';
-- UPDATE public.gallery_images SET src = '/gallery/bottom-left.jpg'  WHERE slot = 'bottom-left';
-- UPDATE public.gallery_images SET src = '/gallery/bottom-right.png' WHERE slot = 'bottom-right';
