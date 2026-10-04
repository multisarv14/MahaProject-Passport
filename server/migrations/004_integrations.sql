-- Manual entry and machine-to-machine department feeds

-- Where each department record came from, and who / which system sent it
ALTER TABLE source_records
  ADD COLUMN channel    text NOT NULL DEFAULT 'file' CHECK (channel IN ('file', 'form', 'api')),
  ADD COLUMN entered_by text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- API clients: one key per department system. Only a hash of the key is stored.
CREATE TABLE integration_clients (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  source       text NOT NULL CHECK (source IN ('tax', 'oc', 'elec', 'igr', 'water')),
  key_prefix   text NOT NULL,
  key_hash     text NOT NULL UNIQUE,
  active       boolean NOT NULL DEFAULT true,
  created_by   text REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  records_received bigint NOT NULL DEFAULT 0
);
