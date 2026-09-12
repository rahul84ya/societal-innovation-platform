ALTER TYPE problem_status ADD VALUE IF NOT EXISTS 'university_assigned';
ALTER TYPE problem_status ADD VALUE IF NOT EXISTS 'solution_uploaded';
ALTER TYPE problem_status ADD VALUE IF NOT EXISTS 'tender_raised';
ALTER TYPE problem_status ADD VALUE IF NOT EXISTS 'industry_assigned';
ALTER TYPE problem_status ADD VALUE IF NOT EXISTS 'industry_work_uploaded';

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS university_solution_url TEXT,
  ADD COLUMN IF NOT EXISTS industry_work_url TEXT,
  ADD COLUMN IF NOT EXISTS problem_solved_images_url TEXT;

ALTER TABLE proposals
  ALTER COLUMN industry_id DROP NOT NULL;