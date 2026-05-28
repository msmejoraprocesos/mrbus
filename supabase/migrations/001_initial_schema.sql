-- ============================================================
-- TransportOS — Migración inicial
-- Ejecuta esto en Supabase → SQL Editor
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORGANIZACIONES (tenants)
-- ============================================================
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  rfc           TEXT,
  logo_url      TEXT,
  country       CHAR(2) DEFAULT 'MX',
  timezone      TEXT DEFAULT 'America/Mexico_City',
  plan          TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','growth','business','enterprise')),
  trial_ends_at TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT TRUE,
  settings      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  permissions     JSONB DEFAULT '[]',
  is_system       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USUARIOS (linked con Supabase Auth)
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role_id         UUID REFERENCES roles(id),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  employee_number TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VEHÍCULOS
-- ============================================================
CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plate           TEXT NOT NULL,
  economic_number TEXT,
  brand           TEXT,
  model           TEXT,
  year            SMALLINT,
  vin             TEXT,
  type            TEXT CHECK (type IN ('bus','minibus','van','sedan','suv','other')) DEFAULT 'bus',
  capacity        SMALLINT NOT NULL,
  fuel_type       TEXT CHECK (fuel_type IN ('diesel','gasoline','electric','hybrid')),
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','maintenance','retired')),
  photo_url       TEXT,
  gps_device_id   TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHOFERES / OPERADORES
-- ============================================================
CREATE TABLE drivers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  employee_number TEXT,
  phone           TEXT,
  email           TEXT,
  license_number  TEXT,
  license_type    TEXT,
  license_expires DATE,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  photo_url       TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UBICACIONES (catálogo)
-- ============================================================
CREATE TABLE locations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  lat             DECIMAL(10,7),
  lng             DECIMAL(10,7),
  type            TEXT CHECK (type IN ('terminal','hotel','airport','office','other')),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VIAJES
-- ============================================================
CREATE TABLE trips (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  trip_number         TEXT NOT NULL,
  type                TEXT CHECK (type IN ('personnel','tourism','rental','charter','executive','school','event')) DEFAULT 'tourism',
  origin_id           UUID REFERENCES locations(id),
  destination_id      UUID REFERENCES locations(id),
  origin_label        TEXT,
  destination_label   TEXT,
  departure_date      DATE NOT NULL,
  departure_time      TIME NOT NULL,
  arrival_date        DATE,
  arrival_time        TIME,
  vehicle_id          UUID REFERENCES vehicles(id),
  driver_id           UUID REFERENCES drivers(id),
  co_driver_id        UUID REFERENCES drivers(id),
  capacity            SMALLINT NOT NULL,
  status              TEXT DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','boarding','in_transit','completed','cancelled')),
  client_name         TEXT,
  contract_id         UUID,
  notes               TEXT,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_by          UUID REFERENCES users(id),
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASAJEROS (catálogo reutilizable)
-- ============================================================
CREATE TABLE passengers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  id_number       TEXT,
  employee_number TEXT,
  department      TEXT,
  company         TEXT,
  qr_code         TEXT UNIQUE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASAJEROS POR VIAJE (tabla central del abordaje)
-- ============================================================
CREATE TABLE trip_passengers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id    UUID REFERENCES passengers(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  first_name      TEXT,
  last_name       TEXT,
  phone           TEXT,
  seat_number     TEXT,
  payment_status  TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','partial','paid','refunded','complimentary')),
  payment_amount  DECIMAL(10,2),
  payment_method  TEXT,
  payment_ref     TEXT,
  boarding_status TEXT DEFAULT 'pending' CHECK (boarding_status IN ('pending','boarded','absent','cancelled')),
  boarded_at      TIMESTAMPTZ,
  boarded_by      UUID REFERENCES users(id),
  boarding_lat    DECIMAL(10,7),
  boarding_lng    DECIMAL(10,7),
  boarding_notes  TEXT,
  added_by        UUID REFERENCES users(id),
  added_at        TIMESTAMPTZ DEFAULT NOW(),
  qr_token        TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EVENTOS DE ABORDAJE (audit log inmutable)
-- ============================================================
CREATE TABLE boarding_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id           UUID REFERENCES trips(id),
  trip_passenger_id UUID REFERENCES trip_passengers(id),
  organization_id   UUID REFERENCES organizations(id),
  event_type        TEXT CHECK (event_type IN ('boarded','cancelled','absent','note','override')),
  performed_by      UUID REFERENCES users(id),
  performed_at      TIMESTAMPTZ DEFAULT NOW(),
  lat               DECIMAL(10,7),
  lng               DECIMAL(10,7),
  notes             TEXT,
  metadata          JSONB DEFAULT '{}'
);

-- ============================================================
-- ÍNDICES (performance)
-- ============================================================
CREATE INDEX idx_users_org       ON users(organization_id);
CREATE INDEX idx_trips_org       ON trips(organization_id);
CREATE INDEX idx_trips_status    ON trips(organization_id, status);
CREATE INDEX idx_trips_date      ON trips(organization_id, departure_date);
CREATE INDEX idx_trips_driver    ON trips(driver_id);
CREATE INDEX idx_tp_trip         ON trip_passengers(trip_id);
CREATE INDEX idx_tp_status       ON trip_passengers(trip_id, boarding_status);
CREATE INDEX idx_tp_passenger    ON trip_passengers(passenger_id);
CREATE INDEX idx_be_trip         ON boarding_events(trip_id);
CREATE INDEX idx_be_passenger    ON boarding_events(trip_passenger_id);
CREATE INDEX idx_vehicles_org    ON vehicles(organization_id);
CREATE INDEX idx_drivers_org     ON drivers(organization_id);
CREATE INDEX idx_drivers_user    ON drivers(user_id);

-- ============================================================
-- FUNCIÓN updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orgs_upd   BEFORE UPDATE ON organizations   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_upd  BEFORE UPDATE ON users           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_trips_upd  BEFORE UPDATE ON trips           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_veh_upd    BEFORE UPDATE ON vehicles        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_drv_upd    BEFORE UPDATE ON drivers         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tp_upd     BEFORE UPDATE ON trip_passengers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pax_upd    BEFORE UPDATE ON passengers      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE organizations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips          ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE boarding_events ENABLE ROW LEVEL SECURITY;

-- Función helper: devuelve el organization_id del usuario autenticado
CREATE OR REPLACE FUNCTION auth.org_id() RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Función helper: devuelve el nombre del rol del usuario autenticado
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
  SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Función helper: devuelve el driver_id del usuario autenticado
CREATE OR REPLACE FUNCTION auth.driver_id() RETURNS UUID AS $$
  SELECT id FROM drivers WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Políticas
CREATE POLICY "org_own"   ON organizations  FOR ALL USING (id = auth.org_id());
CREATE POLICY "roles_own" ON roles          FOR ALL USING (organization_id = auth.org_id());
CREATE POLICY "users_own" ON users          FOR ALL USING (organization_id = auth.org_id());

-- Trips: admins ven todos, drivers solo los suyos
CREATE POLICY "trips_admin"  ON trips FOR ALL USING (
  organization_id = auth.org_id() AND auth.user_role() != 'driver'
);
CREATE POLICY "trips_driver" ON trips FOR SELECT USING (
  organization_id = auth.org_id()
  AND auth.user_role() = 'driver'
  AND driver_id = auth.driver_id()
);

-- Trip passengers: todos en la org
CREATE POLICY "tp_own"  ON trip_passengers FOR ALL USING (organization_id = auth.org_id());

-- Boarding events: INSERT para todos, UPDATE/DELETE para nadie (inmutable)
CREATE POLICY "be_read"   ON boarding_events FOR SELECT USING (organization_id = auth.org_id());
CREATE POLICY "be_insert" ON boarding_events FOR INSERT WITH CHECK (organization_id = auth.org_id());

CREATE POLICY "veh_own"  ON vehicles  FOR ALL USING (organization_id = auth.org_id());
CREATE POLICY "drv_own"  ON drivers   FOR ALL USING (organization_id = auth.org_id());
CREATE POLICY "loc_own"  ON locations FOR ALL USING (organization_id = auth.org_id());
CREATE POLICY "pax_own"  ON passengers FOR ALL USING (organization_id = auth.org_id());

-- ============================================================
-- FUNCIÓN para registrar nuevo usuario al hacer signup
-- Se llama desde un trigger en auth.users
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  role_id UUID;
  org_slug TEXT;
BEGIN
  -- Crear organización desde metadata si viene en el signup
  IF NEW.raw_user_meta_data->>'organization_name' IS NOT NULL THEN
    org_slug := lower(regexp_replace(NEW.raw_user_meta_data->>'organization_name', '[^a-zA-Z0-9]', '-', 'g'));

    INSERT INTO organizations (slug, name, plan)
    VALUES (org_slug || '-' || substr(gen_random_uuid()::text, 1, 6), NEW.raw_user_meta_data->>'organization_name', 'starter')
    RETURNING id INTO org_id;

    -- Crear rol admin para la organización
    INSERT INTO roles (organization_id, name, permissions, is_system)
    VALUES (org_id, 'admin', '["*"]', true)
    RETURNING id INTO role_id;
  END IF;

  -- Insertar perfil de usuario
  INSERT INTO users (id, organization_id, role_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    org_id,
    role_id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Nuevo'),
    NEW.email
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
