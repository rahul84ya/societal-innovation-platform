ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS location_address TEXT;

ALTER TABLE problems
  DROP CONSTRAINT IF EXISTS problems_latitude_range,
  DROP CONSTRAINT IF EXISTS problems_longitude_range;

ALTER TABLE problems
  ADD CONSTRAINT problems_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT problems_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);