-- ══════════════════════════════════════════════════════════════
-- COTIZADOR  —  Wizard de 5 pasos para cotizaciones de viaje
-- ══════════════════════════════════════════════════════════════

-- Tipos de servicio / clase de unidad
CREATE TYPE vehicle_class AS ENUM (
  'Ejecutiva','Premium','Turismo','Premier+','Suite'
);

-- Catálogo de casetas (simplificado; se amplía con dataset CAPUFE)
CREATE TABLE IF NOT EXISTS toll_booths (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  highway     TEXT,
  state       TEXT,
  lat         NUMERIC(9,6),
  lng         NUMERIC(9,6),
  cost_mxn    NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cotizaciones
CREATE TABLE IF NOT EXISTS quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio           TEXT NOT NULL UNIQUE,          -- COT-2026-0001

  -- Paso 1: Ruta
  origin          TEXT NOT NULL,
  destination     TEXT NOT NULL,
  departure_date  DATE,
  departure_time  TIME,
  return_date     DATE,
  return_time     TIME,
  distance_km     NUMERIC(8,1),
  duration_min    INTEGER,
  service_type    TEXT,                          -- Nacional / Internacional / Local
  road_type       TEXT,                          -- Cuota / Libre / Mixta
  is_round_trip   BOOLEAN NOT NULL DEFAULT false,

  -- Paso 2: Unidad
  vehicle_id      UUID REFERENCES vehicles(id),
  vehicle_class   TEXT,                          -- Ejecutiva, Premium, etc.
  seats_total     INTEGER,

  -- Paso 3: Asientos
  seats_selected  JSONB,   -- [{id:"1A", pax:"Nombre Apellido"}, ...]
  seats_count     INTEGER,

  -- Paso 4: Operador
  driver_id       UUID REFERENCES drivers(id),

  -- Paso 5: Costo
  fuel_cost       NUMERIC(12,2),
  toll_cost       NUMERIC(12,2),
  driver_cost     NUMERIC(12,2),
  other_cost      NUMERIC(12,2) DEFAULT 0,
  subtotal        NUMERIC(12,2),
  margin_pct      NUMERIC(5,2) DEFAULT 22,
  margin_amount   NUMERIC(12,2),
  total           NUMERIC(12,2),
  price_per_seat  NUMERIC(12,2),

  -- Meta
  status          TEXT NOT NULL DEFAULT 'draft',  -- draft | sent | accepted | rejected
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_status     ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_vehicle    ON quotes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_quotes_driver     ON quotes(driver_id);

-- Secuencia de folios
INSERT INTO folio_sequences (entity, prefix, last_number, year)
VALUES ('quotes', 'COT', 0, EXTRACT(YEAR FROM now())::INT)
ON CONFLICT (entity, year) DO NOTHING;

-- RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_org" ON quotes FOR ALL USING (true);

ALTER TABLE toll_booths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "toll_booths_read" ON toll_booths FOR SELECT USING (true);

-- Casetas de prueba para ruta CDMX → Guadalajara (Cuota 57D)
INSERT INTO toll_booths (name, highway, state, lat, lng, cost_mxn) VALUES
  ('Tepotzotlán',     '57D', 'Estado de México', 19.7150, -99.2221, 38.50),
  ('Palmillas',       '57D', 'Querétaro',         20.2981, -99.8853, 72.00),
  ('Querétaro',       '57D', 'Querétaro',          20.5884,-100.3899, 45.50),
  ('Irapuato',        '57D', 'Guanajuato',         20.6735,-101.3554, 68.00),
  ('La Barca',        '80D', 'Jalisco',            20.2831,-102.5561, 41.00),
  ('Zapotlanejo',     '80D', 'Jalisco',            20.6267,-103.0488, 35.00)
ON CONFLICT DO NOTHING;
