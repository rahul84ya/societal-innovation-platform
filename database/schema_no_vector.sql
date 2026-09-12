-- SIH Platform Schema (without pgvector - will be added later)
-- CREATE EXTENSION IF NOT EXISTS vector;  -- Skipped: pgvector not installed

CREATE TYPE user_role AS ENUM (
  'citizen',
  'government',
  'university',
  'industry'
);

CREATE TYPE problem_status AS ENUM (
  'reported',
  'rejected_by_govt',
  'open_for_research',
  'pending_consortium_review',
  'university_assigned',
  'solution_uploaded',
  'tender_raised',
  'industry_assigned',
  'industry_work_uploaded',
  'in_progress',
  'rework_in_progress',
  'pending_citizen_verification',
  'solved'
);

CREATE TYPE proposal_status AS ENUM (
  'pending',
  'allotted',
  'rejected'
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  user_role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE problems (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL CHECK (char_length(trim(title)) >= 5),
  description TEXT NOT NULL CHECK (char_length(trim(description)) >= 20),
  image_url TEXT,
  category TEXT NOT NULL,
  severity_score INTEGER NOT NULL CHECK (severity_score BETWEEN 1 AND 5),
  -- embedding vector(768),  -- Skipped: pgvector not installed
  ai_tags TEXT[] NOT NULL DEFAULT '{}',
  problem_status problem_status NOT NULL DEFAULT 'reported',
  allocated_budget NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (allocated_budget >= 0),
  citizen_feedback_notes TEXT,
  citizen_verified_at TIMESTAMPTZ,
  current_milestone_stage INTEGER NOT NULL DEFAULT 0 CHECK (current_milestone_stage BETWEEN 0 AND 2),
  parent_problem_id INTEGER REFERENCES problems(id) ON DELETE SET NULL,
  university_solution_url TEXT,
  industry_work_url TEXT,
  problem_solved_images_url TEXT
);

CREATE TABLE proposals (
  id SERIAL PRIMARY KEY,
  problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  university_id INTEGER NOT NULL REFERENCES users(id),
  industry_id INTEGER REFERENCES users(id),
  abstract_plan TEXT NOT NULL,
  corporate_contribution_notes TEXT,
  estimated_timeline_weeks INTEGER NOT NULL CHECK (estimated_timeline_weeks > 0),
  proposal_status proposal_status NOT NULL DEFAULT 'pending',
  allotted_at TIMESTAMPTZ,
  CONSTRAINT proposals_problem_university_key
    UNIQUE (problem_id, university_id)
);

CREATE TABLE financial_ledger (
  id SERIAL PRIMARY KEY,
  problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  proposal_id INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  tranche_number INTEGER NOT NULL CHECK (tranche_number BETWEEN 1 AND 3),
  amount_released NUMERIC(14, 2) NOT NULL CHECK (amount_released > 0),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('university', 'industry')),
  disbursed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_problems_search
  ON problems
  USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  );

INSERT INTO users (name, email, password_hash, user_role)
VALUES
  ('Baseline Citizen', 'baseline.citizen@example.com', 'seed_hash_citizen', 'citizen'),
  ('Baseline Government', 'baseline.government@example.com', 'seed_hash_government', 'government'),
  ('Baseline University', 'baseline.university@example.com', 'seed_hash_university', 'university'),
  ('Baseline Industry', 'baseline.industry@example.com', 'seed_hash_industry', 'industry');
