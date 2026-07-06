-- Update original 12 blend products with images
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' WHERE id = 'r01';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' WHERE id = 'r02';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1455642305367-68834a1da7ab?w=400&q=80' WHERE id = 'r03';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1455642305367-68834a1da7ab?w=400&q=80' WHERE id = 'r04';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80' WHERE id = 'r05';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80' WHERE id = 'r06';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1574073770435-4571252a2427?w=400&q=80' WHERE id = 'r07';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1574073770435-4571252a2427?w=400&q=80' WHERE id = 'r08';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80' WHERE id = 'r09';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80' WHERE id = 'r10';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80' WHERE id = 'r11';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80' WHERE id = 'r12';
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80' WHERE room_id = 'stress' AND (image_key IS NULL OR image_key = '');
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80' WHERE room_id = 'detox' AND (image_key IS NULL OR image_key = '');
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1455642305367-68834a1da7ab?w=400&q=80' WHERE room_id = 'sleep' AND (image_key IS NULL OR image_key = '');
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' WHERE room_id = 'energy' AND (image_key IS NULL OR image_key = '');
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80' WHERE room_id = 'gut' AND (image_key IS NULL OR image_key = '');
UPDATE products SET image_key = 'https://images.unsplash.com/photo-1574073770435-4571252a2427?w=400&q=80' WHERE room_id = 'immune' AND (image_key IS NULL OR image_key = '');