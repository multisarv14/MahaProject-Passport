-- Department file uploads, matching engine and officer review queue

-- Which department's files a data officer may upload (NULL = not restricted to one source)
ALTER TABLE users ADD COLUMN data_source text CHECK (data_source IN ('tax', 'oc', 'elec', 'igr', 'water'));

ALTER TABLE uploads
  ADD COLUMN status        text NOT NULL DEFAULT 'committed' CHECK (status IN ('staged', 'committed', 'discarded')),
  ADD COLUMN headers       jsonb,
  ADD COLUMN mapping       jsonb,
  ADD COLUMN rows_total    int,
  ADD COLUMN rows_ok       int,
  ADD COLUMN rows_rejected int;

-- Raw rows of a staged upload, kept until it is committed or discarded
CREATE TABLE upload_rows (
  upload_id bigint NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  row_no    int NOT NULL,
  raw       jsonb NOT NULL,
  PRIMARY KEY (upload_id, row_no)
);

ALTER TABLE source_records
  ADD COLUMN address      text,
  ADD COLUMN name         text,
  ADD COLUMN ward         int,
  ADD COLUMN match_status text CHECK (match_status IN ('pending', 'linked', 'review', 'new')),
  ADD COLUMN match_score  real;
UPDATE source_records SET match_status = 'linked', match_score = 1 WHERE property_id IS NOT NULL;
CREATE INDEX source_records_pending_idx ON source_records (match_status) WHERE property_id IS NULL;

CREATE TABLE match_reviews (
  id             bigserial PRIMARY KEY,
  record_id      bigint NOT NULL REFERENCES source_records(id),
  candidate_id   text NOT NULL REFERENCES properties(id),
  runner_up_id   text REFERENCES properties(id),
  score          real NOT NULL,
  runner_up_score real,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'linked', 'new')),
  decided_by     text REFERENCES users(id),
  decided_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX match_reviews_pending_idx ON match_reviews (status);

CREATE TABLE matching_runs (
  id           bigserial PRIMARY KEY,
  run_at       timestamptz NOT NULL DEFAULT now(),
  run_by       text REFERENCES users(id),
  processed    int NOT NULL,
  linked       int NOT NULL,
  created      int NOT NULL,
  to_review    int NOT NULL,
  cases_opened int NOT NULL,
  cases_updated int NOT NULL
);

-- New passports and cases continue after the seeded/imported range
CREATE SEQUENCE passport_no_seq START 1001;
CREATE SEQUENCE case_no_seq START 5001;
