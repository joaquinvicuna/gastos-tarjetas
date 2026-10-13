-- Revert categories from English back to Spanish
UPDATE "Category" SET name = 'Alimentación' WHERE name = 'Food' AND "userId" IS NULL;
UPDATE "Category" SET name = 'Transporte' WHERE name = 'Transportation' AND "userId" IS NULL;
UPDATE "Category" SET name = 'Entretenimiento' WHERE name = 'Entertainment' AND "userId" IS NULL;
UPDATE "Category" SET name = 'Servicios' WHERE name = 'Utilities' AND "userId" IS NULL;
UPDATE "Category" SET name = 'Salud' WHERE name = 'Healthcare' AND "userId" IS NULL;
UPDATE "Category" SET name = 'Compras' WHERE name = 'Shopping' AND "userId" IS NULL;
UPDATE "Category" SET name = 'Educación' WHERE name = 'Education' AND "userId" IS NULL;
UPDATE "Category" SET name = 'Viajes' WHERE name = 'Travel' AND "userId" IS NULL;
UPDATE "Category" SET name = 'Otros' WHERE name = 'Other' AND "userId" IS NULL;
