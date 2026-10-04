-- Maha Passport: initial schema
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE offices (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('state', 'district', 'city', 'ward', 'department', 'vendor')),
  parent_id   text REFERENCES offices(id)
);

CREATE TABLE users (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  mobile      text NOT NULL UNIQUE,
  role        text NOT NULL CHECK (role IN (
                'platform_admin', 'state_lead', 'collector', 'commissioner', 'assessment_officer',
                'ward_officer', 'inspector', 'hearing_officer', 'recovery_clerk', 'dept_data_officer',
                'auditor', 'representative', 'business_officer', 'citizen')),
  office_id   text REFERENCES offices(id),
  office_name text NOT NULL,
  -- wards this user may act on; NULL = whole city
  wards       int[],
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE otp_requests (
  id          bigserial PRIMARY KEY,
  mobile      text NOT NULL,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    int NOT NULL DEFAULT 0,
  used        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otp_mobile_idx ON otp_requests (mobile, created_at DESC);

CREATE TABLE properties (
  id            text PRIMARY KEY,          -- Passport ID, e.g. MP-MH-NMN-2026-000001
  city_code     text NOT NULL,
  ward          int NOT NULL,
  address       text NOT NULL,
  owner_name    text NOT NULL,
  owner_user_id text REFERENCES users(id),
  usage         text NOT NULL CHECK (usage IN ('residential', 'commercial', 'mixed')),
  area_sqft     int NOT NULL,
  location      geography(Point, 4326),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX properties_ward_idx ON properties (ward);
CREATE INDEX properties_location_idx ON properties USING gist (location);

CREATE TABLE uploads (
  id          bigserial PRIMARY KEY,
  source      text NOT NULL CHECK (source IN ('tax', 'oc', 'elec', 'igr', 'water')),
  file_name   text NOT NULL,
  records     int NOT NULL DEFAULT 0,
  quality_pct int,
  uploaded_by text REFERENCES users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- One row per record received from a department, linked to a property once matched.
CREATE TABLE source_records (
  id           bigserial PRIMARY KEY,
  source       text NOT NULL CHECK (source IN ('tax', 'oc', 'elec', 'igr', 'water')),
  ref_no       text NOT NULL,
  property_id  text REFERENCES properties(id),
  data         jsonb NOT NULL,
  upload_id    bigint REFERENCES uploads(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, ref_no)
);
CREATE INDEX source_records_property_idx ON source_records (property_id);

CREATE TABLE cases (
  id               text PRIMARY KEY,
  property_id      text NOT NULL REFERENCES properties(id),
  rules            text[] NOT NULL,
  confidence       int NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  status           text NOT NULL CHECK (status IN ('suspected', 'assigned', 'verified', 'not_found', 'notice_sent', 'objection', 'recovered', 'closed')),
  est_demand       bigint NOT NULL DEFAULT 0,
  approved_demand  bigint,
  recovered        bigint,
  assigned_to      text REFERENCES users(id),
  opened_on        date NOT NULL DEFAULT current_date,
  notice_no        text UNIQUE,
  notice_date      date,
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cases_status_idx ON cases (status);
CREATE INDEX cases_property_idx ON cases (property_id);
CREATE INDEX cases_assigned_idx ON cases (assigned_to);

CREATE TABLE visits (
  id             bigserial PRIMARY KEY,
  case_id        text NOT NULL REFERENCES cases(id),
  visited_by     text NOT NULL REFERENCES users(id),
  visited_on     date NOT NULL,
  structure_found boolean NOT NULL,
  usage_found    text NOT NULL CHECK (usage_found IN ('residential', 'commercial', 'mixed')),
  measured_area  int NOT NULL,
  photos         int NOT NULL CHECK (photos >= 0),
  gps            geography(Point, 4326),
  remarks        text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX visits_case_idx ON visits (case_id);

CREATE TABLE objections (
  id            bigserial PRIMARY KEY,
  case_id       text NOT NULL REFERENCES cases(id),
  filed_on      date NOT NULL,
  text          text NOT NULL,
  filed_by      text REFERENCES users(id),
  decision      text CHECK (decision IN ('upheld', 'rejected')),
  decided_on    date,
  decision_note text,
  decided_by    text REFERENCES users(id)
);
CREATE INDEX objections_case_idx ON objections (case_id);

CREATE TABLE payments (
  id           bigserial PRIMARY KEY,
  case_id      text NOT NULL REFERENCES cases(id),
  amount       bigint NOT NULL CHECK (amount > 0),
  receipt_no   text NOT NULL UNIQUE,
  recorded_by  text REFERENCES users(id),
  paid_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id         bigserial PRIMARY KEY,
  case_id    text REFERENCES cases(id),
  channel    text NOT NULL CHECK (channel IN ('SMS', 'WhatsApp')),
  template   text NOT NULL,
  recipient  text NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now()
);

-- Append-only audit trail
CREATE TABLE audit_log (
  id        bigserial PRIMARY KEY,
  at        timestamptz NOT NULL DEFAULT now(),
  user_id   text,
  role      text,
  action    text NOT NULL,
  entity    text NOT NULL,
  detail    jsonb
);
CREATE INDEX audit_entity_idx ON audit_log (entity);
CREATE INDEX audit_at_idx ON audit_log (at DESC);

CREATE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
