-- ============================================================
-- MrBus — Schema Completo
-- 2026-10-13
-- SaaS ERP para empresas de transporte turístico / corporativo
-- Single-tenant (sin branch_id)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. HELPERS
-- ============================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Macro para crear el trigger en cada tabla
-- Llamada por bloque DO por tabla (ver abajo)

-- ============================================================
-- 3. TABLAS (en orden de dependencias)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- FLOTA — vehicles
-- Catálogo maestro de unidades de la empresa.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate            TEXT NOT NULL UNIQUE,           -- Placa oficial
  economic_number  TEXT NOT NULL UNIQUE,           -- Número económico interno
  brand            TEXT,                           -- Marca (Dina, Mercedes, etc.)
  model            TEXT,                           -- Modelo
  year             SMALLINT,
  capacity         SMALLINT,                       -- Capacidad de pasajeros
  type             TEXT,                           -- Autobús, Minibús, Van, Camioneta, Camión
  status           TEXT NOT NULL DEFAULT 'active', -- active | maintenance | inactive | retired
  vin              TEXT,                           -- NIV / VIN
  engine_number    TEXT,
  color            TEXT,
  acquisition_date DATE,
  acquisition_cost NUMERIC(12,2),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate  ON vehicles(plate);

-- ────────────────────────────────────────────────────────────
-- RRHH — drivers
-- Catálogo de operadores / conductores.
-- Consultado desde combustible, mantenimiento, viajes, nómina.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  license_number TEXT,                        -- Número de licencia federal
  license_type   TEXT,                        -- A, B, C, D, E
  license_expiry DATE,
  curp           TEXT,
  rfc            TEXT,
  imss_number    TEXT,                        -- NSS IMSS
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  hire_date      DATE,
  birth_date     DATE,
  base_salary    NUMERIC(12,2),               -- Salario mensual base
  daily_rate     NUMERIC(12,2),               -- Cuota diaria (calculado o manual)
  status         TEXT NOT NULL DEFAULT 'active', -- active | inactive | suspended | retired
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);

-- ────────────────────────────────────────────────────────────
-- RRHH — employees
-- Empleados administrativos y operativos (no operadores).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  position       TEXT,                        -- Puesto
  department     TEXT,                        -- Departamento
  curp           TEXT,
  rfc            TEXT,
  imss_number    TEXT,
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  hire_date      DATE,
  birth_date     DATE,
  base_salary    NUMERIC(12,2),
  daily_rate     NUMERIC(12,2),
  status         TEXT NOT NULL DEFAULT 'active', -- active | inactive | retired
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- ────────────────────────────────────────────────────────────
-- RRHH — attendance
-- Registro de asistencia diaria (operadores y empleados).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_type  TEXT NOT NULL DEFAULT 'driver', -- driver | employee
  driver_id      UUID REFERENCES drivers(id)   ON DELETE SET NULL,
  employee_id    UUID REFERENCES employees(id) ON DELETE SET NULL,
  work_date      DATE NOT NULL,
  check_in       TIME,
  check_out      TIME,
  worked_hours   NUMERIC(5,2),
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'present', -- present | absent | justified | holiday | vacation
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attendance_one_subject CHECK (
    (driver_id IS NOT NULL AND employee_id IS NULL) OR
    (driver_id IS NULL AND employee_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_attendance_driver   ON attendance(driver_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date     ON attendance(work_date);

-- ────────────────────────────────────────────────────────────
-- OPERACIONES — trips
-- Viajes / servicios programados. Tabla central del sistema.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_number         TEXT NOT NULL UNIQUE,       -- Folio: VIA-2026-001
  type                TEXT NOT NULL DEFAULT 'tourism', -- tourism | corporate | personal | charter | paqueteria
  origin_label        TEXT NOT NULL,              -- Etiqueta origen (texto libre)
  destination_label   TEXT NOT NULL,              -- Etiqueta destino
  departure_date      DATE NOT NULL,
  departure_time      TIME,
  arrival_date        DATE,
  arrival_time        TIME,
  capacity            SMALLINT,                   -- Capacidad contratada
  passengers_boarded  SMALLINT DEFAULT 0,
  vehicle_id          UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id           UUID REFERENCES drivers(id)  ON DELETE SET NULL,
  client_name         TEXT,                       -- Cliente o empresa contratante
  client_phone        TEXT,
  quoted_amount       NUMERIC(12,2),              -- Monto cotizado
  final_amount        NUMERIC(12,2),              -- Monto final acordado
  tolls_budget        NUMERIC(12,2),              -- Presupuesto casetas
  fuel_budget         NUMERIC(12,2),
  status              TEXT NOT NULL DEFAULT 'scheduled',
  -- scheduled | boarding | in_transit | completed | cancelled
  stops               JSONB,                      -- [{label, time, notes}]
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_status         ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_departure_date ON trips(departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle        ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver         ON trips(driver_id);

-- ────────────────────────────────────────────────────────────
-- FLOTA — fuel_prices
-- Catálogo de precios de combustible vigentes.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fuel_prices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type        TEXT NOT NULL,               -- Diesel | Gasolina | Gas LP | Eléctrico
  price_per_liter  NUMERIC(8,4) NOT NULL,
  effective_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_prices_type   ON fuel_prices(fuel_type);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_active ON fuel_prices(is_active);

-- ────────────────────────────────────────────────────────────
-- FLOTA — fuel_loads
-- Cada carga de combustible registrada por unidad.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fuel_loads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_date       DATE NOT NULL,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id       UUID REFERENCES drivers(id)           ON DELETE SET NULL,
  fuel_type       TEXT NOT NULL DEFAULT 'Diesel',
  liters          NUMERIC(10,3) NOT NULL,
  price_per_liter NUMERIC(8,4) NOT NULL,
  total_cost      NUMERIC(12,2) NOT NULL,
  station         TEXT,                         -- Nombre de la estación / PEMEX
  odometer_km     INTEGER,                      -- Lectura del odómetro
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_loads_vehicle   ON fuel_loads(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_loads_driver    ON fuel_loads(driver_id);
CREATE INDEX IF NOT EXISTS idx_fuel_loads_date      ON fuel_loads(load_date);

-- ────────────────────────────────────────────────────────────
-- FLOTA — maintenance_orders
-- Órdenes de mantenimiento preventivo y correctivo.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT NOT NULL UNIQUE,         -- Folio: MTO-2026-001
  vehicle_id       UUID NOT NULL REFERENCES vehicles(id) ON DELETE SET NULL,
  maint_type       TEXT NOT NULL DEFAULT 'preventivo',
  -- preventivo | correctivo | predictivo | revision | llantas | accidente
  description      TEXT NOT NULL,
  scheduled_date   DATE NOT NULL,
  completed_date   DATE,
  estimated_cost   NUMERIC(12,2),
  actual_cost      NUMERIC(12,2),
  technician       TEXT,                         -- Nombre del técnico o taller
  blocks_vehicle   BOOLEAN NOT NULL DEFAULT false,
  status           TEXT NOT NULL DEFAULT 'scheduled',
  -- scheduled | in_progress | completed | cancelled | pending
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_orders_vehicle ON maintenance_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maint_orders_status  ON maintenance_orders(status);
CREATE INDEX IF NOT EXISTS idx_maint_orders_date    ON maintenance_orders(scheduled_date);

-- ────────────────────────────────────────────────────────────
-- FLOTA — tire_inventory
-- Inventario y control de vida útil de llantas.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tire_inventory (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id         UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  position           TEXT,                       -- Delantera izq, Trasera der, etc.
  brand              TEXT,
  model              TEXT,
  size               TEXT,                       -- Medida: 295/80R22.5
  serial_number      TEXT,
  current_km         INTEGER DEFAULT 0,
  estimated_life_km  INTEGER DEFAULT 80000,
  install_date       DATE,
  removal_date       DATE,
  status             TEXT NOT NULL DEFAULT 'active', -- active | worn | spare | replaced
  purchase_cost      NUMERIC(12,2),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tires_vehicle ON tire_inventory(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tires_status  ON tire_inventory(status);

-- ────────────────────────────────────────────────────────────
-- NÓMINA — payroll_runs
-- Corridas de nómina quincenal / mensual / semanal.
-- El detalle por empleado se almacena en JSONB.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio               TEXT NOT NULL UNIQUE,       -- Folio: NOMINA-2026-001
  periodo_inicio      DATE NOT NULL,
  periodo_fin         DATE NOT NULL,
  periodicidad        TEXT NOT NULL DEFAULT 'quincenal', -- quincenal | mensual | semanal
  status              TEXT NOT NULL DEFAULT 'generada',  -- generada | pagada | cancelada
  total_empleados     SMALLINT DEFAULT 0,
  total_percepciones  NUMERIC(14,2) DEFAULT 0,
  total_deducciones   NUMERIC(14,2) DEFAULT 0,
  total_neto          NUMERIC(14,2) DEFAULT 0,
  detalle             JSONB,                      -- Snapshot completo por empleado
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_runs(periodo_inicio, periodo_fin);

-- ────────────────────────────────────────────────────────────
-- COMERCIAL — leads (CRM)
-- Pipeline de prospectos y clientes.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio         TEXT,                           -- Folio opcional
  company_name  TEXT,                           -- Empresa
  first_name    TEXT,
  last_name     TEXT,
  contact_name  TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  phone         TEXT,
  email         TEXT,
  company       TEXT,
  source        TEXT,                           -- Referido, web, llamada, etc.
  service_type  TEXT,                           -- Turismo, corporativo, personal, etc.
  estimated_value NUMERIC(12,2),
  valor_estimado  NUMERIC(12,2),
  ciudad          TEXT,
  ultimo_contacto TIMESTAMPTZ,
  assigned_to   TEXT,                           -- Nombre del ejecutivo de cuenta
  expected_close DATE,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'new',   -- new | contacted | proposal | negotiation | won | lost
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agregar columna stage si la tabla ya existía sin ella
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'new';

CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);

-- ────────────────────────────────────────────────────────────
-- PAQUETERÍA — shipping_orders
-- Guías de paquetería transportadas en los viajes.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT NOT NULL UNIQUE,       -- Folio: PKG-2026-001
  trip_id           UUID REFERENCES trips(id) ON DELETE SET NULL,
  sender_name       TEXT NOT NULL,
  sender_phone      TEXT,
  recipient_name    TEXT NOT NULL,
  recipient_phone   TEXT,
  recipient_address TEXT,
  weight_kg         NUMERIC(8,3),
  dimensions        TEXT,                       -- "30x20x15 cm"
  cargo_type        TEXT NOT NULL DEFAULT 'normal',
  -- normal | fragile | valuables | guarded
  quoted_price      NUMERIC(12,2),
  status            TEXT NOT NULL DEFAULT 'pending',
  -- pending | in_transit | delivered | returned | problem
  delivery_date     DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_trip   ON shipping_orders(trip_id);
CREATE INDEX IF NOT EXISTS idx_shipping_status ON shipping_orders(status);

-- ────────────────────────────────────────────────────────────
-- TURISMO — agency_trips
-- Viajes de agencia B2C con venta de asientos al público.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agency_trips (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               UUID REFERENCES trips(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,           -- Nombre del paquete turístico
  description           TEXT,
  price_per_seat        NUMERIC(12,2),
  min_seats_to_confirm  SMALLINT DEFAULT 1,      -- Mínimo para que el viaje salga
  seats_blocked         SMALLINT DEFAULT 0,      -- Asientos reservados para staff
  status                TEXT NOT NULL DEFAULT 'setup',
  -- setup | on_sale | full | confirmed | at_risk | cancelled | completed
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_trips_trip   ON agency_trips(trip_id);
CREATE INDEX IF NOT EXISTS idx_agency_trips_status ON agency_trips(status);

-- ────────────────────────────────────────────────────────────
-- TURISMO — seat_reservations
-- Reservaciones individuales en viajes de agencia.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seat_reservations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_trip_id   UUID NOT NULL REFERENCES agency_trips(id) ON DELETE CASCADE,
  passenger_name   TEXT NOT NULL,
  passenger_phone  TEXT,
  passenger_email  TEXT,
  seats_count      SMALLINT NOT NULL DEFAULT 1,
  total_price      NUMERIC(12,2),
  total_paid       NUMERIC(12,2) DEFAULT 0,
  advance_amount   NUMERIC(12,2) DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'reserved',
  -- reserved | paid | cancelled | no_show
  payment_method   TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seat_reserv_trip   ON seat_reservations(agency_trip_id);
CREATE INDEX IF NOT EXISTS idx_seat_reserv_status ON seat_reservations(status);

-- ────────────────────────────────────────────────────────────
-- PERSONAL — service_agreements
-- Convenios de transporte de personal (rutas fijas empresas).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_agreements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name      TEXT NOT NULL,
  client_rfc       TEXT,
  contact_name     TEXT,
  contact_phone    TEXT,
  contact_email    TEXT,
  billing_scheme   TEXT NOT NULL DEFAULT 'fixed_route',
  -- fixed_route | per_seat | mixed
  monthly_amount   NUMERIC(12,2),
  valid_from       DATE,
  valid_until      DATE,
  auto_renew       BOOLEAN DEFAULT false,
  operation_days   JSONB,
  -- {"lun":true,"mar":true,"mie":true,"jue":true,"vie":true,"sab":false,"dom":false}
  status           TEXT NOT NULL DEFAULT 'draft',
  -- draft | active | paused | expired | cancelled
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreements_status ON service_agreements(status);

-- ────────────────────────────────────────────────────────────
-- PERSONAL — agreement_routes
-- Rutas asociadas a un convenio de personal.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agreement_routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id    UUID NOT NULL REFERENCES service_agreements(id) ON DELETE CASCADE,
  route_name      TEXT NOT NULL,
  origin          TEXT,
  destination     TEXT,
  departure_time  TIME,
  return_time     TIME,
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id       UUID REFERENCES drivers(id)  ON DELETE SET NULL,
  capacity        SMALLINT,
  is_active       BOOLEAN DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agr_routes_agreement ON agreement_routes(agreement_id);

-- ────────────────────────────────────────────────────────────
-- PERSONAL — agreement_employees
-- Empleados del cliente registrados en el convenio.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agreement_employees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id  UUID NOT NULL REFERENCES service_agreements(id) ON DELETE CASCADE,
  route_id      UUID REFERENCES agreement_routes(id) ON DELETE SET NULL,
  full_name     TEXT NOT NULL,
  employee_code TEXT,
  phone         TEXT,
  boarding_stop TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agr_employees_agreement ON agreement_employees(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agr_employees_route     ON agreement_employees(route_id);

-- ────────────────────────────────────────────────────────────
-- FINANZAS — contracts
-- Contratos con clientes (para vincular CXC).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT NOT NULL UNIQUE,         -- Folio: CON-2026-001
  client_name     TEXT NOT NULL,
  client_rfc      TEXT,
  service_type    TEXT,
  amount          NUMERIC(12,2),
  start_date      DATE,
  end_date        DATE,
  status          TEXT NOT NULL DEFAULT 'active', -- draft | active | expired | cancelled
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- ────────────────────────────────────────────────────────────
-- FINANZAS — bank_accounts
-- Cuentas bancarias de la empresa.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,                   -- Nombre descriptivo (ej: "Operaciones BBVA")
  banco        TEXT NOT NULL,                   -- Nombre del banco
  cuenta_clabe TEXT,                            -- CLABE interbancaria
  cuenta_num   TEXT,                            -- Número de cuenta
  moneda       TEXT NOT NULL DEFAULT 'MXN',
  saldo        NUMERIC(14,2) NOT NULL DEFAULT 0,
  activa       BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_activa ON bank_accounts(activa);

-- ────────────────────────────────────────────────────────────
-- FINANZAS — bank_movements
-- Movimientos bancarios (ingresos y egresos por cuenta).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_movements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id    UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE SET NULL,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo         TEXT NOT NULL,                   -- ingreso | egreso
  monto        NUMERIC(14,2) NOT NULL,
  descripcion  TEXT NOT NULL,
  categoria    TEXT,
  referencia   TEXT,
  conciliado   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_movements_cuenta ON bank_movements(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_bank_movements_fecha  ON bank_movements(fecha);
CREATE INDEX IF NOT EXISTS idx_bank_movements_tipo   ON bank_movements(tipo);

-- ────────────────────────────────────────────────────────────
-- FINANZAS — accounts_receivable (CXC)
-- Cuentas por cobrar a clientes.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio           TEXT NOT NULL UNIQUE,         -- Folio: CXC-2026-001
  client_name     TEXT NOT NULL,
  client_rfc      TEXT,
  client_email    TEXT,
  client_phone    TEXT,
  document_type   TEXT NOT NULL DEFAULT 'Factura',
  -- Factura | Anticipo | Complemento de pago | Nota de crédito | Contrato | Otro
  document_number TEXT,
  concepto        TEXT,                         -- Descripción del cobro
  concept         TEXT,                         -- Alias (campo legacy compatible)
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  payment_date    DATE,
  trip_id         UUID REFERENCES trips(id)     ON DELETE SET NULL,
  contract_id     UUID REFERENCES contracts(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  -- pending | partial | paid | overdue | cancelled
  notes           TEXT,
  notas           TEXT,                         -- Alias (campo legacy compatible)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cxc_status      ON accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_cxc_due_date    ON accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_cxc_client_name ON accounts_receivable(client_name);
CREATE INDEX IF NOT EXISTS idx_cxc_trip        ON accounts_receivable(trip_id);

-- ────────────────────────────────────────────────────────────
-- FINANZAS — cxc_cobros
-- Abonos / cobros aplicados a una CXC.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cxc_cobros (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cxc_id       UUID NOT NULL REFERENCES accounts_receivable(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  monto        NUMERIC(12,2) NOT NULL,
  metodo       TEXT NOT NULL DEFAULT 'Transferencia',
  -- Transferencia | SPEI | Cheque | Efectivo | Tarjeta | Domiciliación
  referencia   TEXT,
  cuenta_destino UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  notas        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cxc_cobros_cxc   ON cxc_cobros(cxc_id);
CREATE INDEX IF NOT EXISTS idx_cxc_cobros_fecha ON cxc_cobros(fecha);

-- ────────────────────────────────────────────────────────────
-- FINANZAS — accounts_payable (CXP)
-- Cuentas por pagar a proveedores.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts_payable (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio               TEXT NOT NULL UNIQUE,     -- Folio: CXP-2026-001
  supplier_name       TEXT NOT NULL,            -- Nombre del proveedor
  proveedor           TEXT,                     -- Alias (campo legacy compatible)
  rfc_proveedor       TEXT,
  concept             TEXT,                     -- Concepto (campo legacy)
  concepto            TEXT,                     -- Alias
  category            TEXT NOT NULL DEFAULT 'Otro',
  -- Combustible | Mantenimiento | Nómina | Seguros | Casetas | Renta | Servicios | Refacciones | Llantas | Compras | Otro
  categoria           TEXT,                     -- Alias (campo legacy compatible)
  amount              NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto               NUMERIC(12,2),            -- Alias (campo legacy compatible)
  paid_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_pagado        NUMERIC(12,2),            -- Alias (campo legacy compatible)
  issue_date          DATE DEFAULT CURRENT_DATE,
  fecha_emision       DATE,                     -- Alias
  due_date            DATE NOT NULL,
  fecha_vencimiento   DATE,                     -- Alias
  payment_date        DATE,
  fecha_pago          DATE,                     -- Alias
  payment_method      TEXT,
  metodo_pago         TEXT,                     -- Alias
  reference           TEXT,
  referencia          TEXT,                     -- Alias
  cuenta_bancaria     TEXT,
  prioridad           TEXT NOT NULL DEFAULT 'media', -- alta | media | baja
  status              TEXT NOT NULL DEFAULT 'pendiente',
  -- pendiente | parcial | pagado | cancelado | vencido
  notes               TEXT,
  notas               TEXT,                     -- Alias
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cxp_status    ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_cxp_due_date  ON accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_cxp_category  ON accounts_payable(category);

-- ────────────────────────────────────────────────────────────
-- FINANZAS — cxp_pagos
-- Abonos / pagos aplicados a una CXP.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cxp_pagos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cxp_id          UUID NOT NULL REFERENCES accounts_payable(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  monto           NUMERIC(12,2) NOT NULL,
  metodo          TEXT NOT NULL DEFAULT 'Transferencia',
  referencia      TEXT,
  cuenta_origen   UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cxp_pagos_cxp   ON cxp_pagos(cxp_id);
CREATE INDEX IF NOT EXISTS idx_cxp_pagos_fecha ON cxp_pagos(fecha);

-- ────────────────────────────────────────────────────────────
-- AUDITORÍA — audit_logs
-- Registro de eventos de escritura en el sistema.
-- Escrito por la función auditLog() del cliente.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action       TEXT NOT NULL,                   -- INSERT | UPDATE | DELETE | CANCEL
  module       TEXT,
  table_name   TEXT,
  record_id    UUID,
  record_folio TEXT,
  user_id      UUID,
  before_data  JSONB,
  after_data   JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_table  ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- ────────────────────────────────────────────────────────────
-- SISTEMA — folio_sequences
-- Contadores de folios por prefijo (usados por getNextFolio).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folio_sequences (
  prefix     TEXT PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserta prefijos usados por la app (no duplica si ya existen)
INSERT INTO folio_sequences (prefix) VALUES
  ('mto'),
  ('nomina'),
  ('cxc'),
  ('cxp'),
  ('pkg'),
  ('via'),
  ('con')
ON CONFLICT (prefix) DO NOTHING;

-- ============================================================
-- 4. TRIGGERS updated_at
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vehicles','drivers','employees','attendance',
    'trips','fuel_prices','fuel_loads','maintenance_orders',
    'tire_inventory','payroll_runs','leads','shipping_orders',
    'agency_trips','seat_reservations','service_agreements',
    'agreement_routes','agreement_employees','contracts',
    'bank_accounts','bank_movements','accounts_receivable',
    'accounts_payable'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
       CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
-- Política base: usuario autenticado puede leer y escribir.
-- Refina por módulo según roles cuando sea necesario.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vehicles','drivers','employees','attendance',
    'trips','fuel_prices','fuel_loads','maintenance_orders',
    'tire_inventory','payroll_runs','leads','shipping_orders',
    'agency_trips','seat_reservations','service_agreements',
    'agreement_routes','agreement_employees','contracts',
    'bank_accounts','bank_movements','accounts_receivable',
    'cxc_cobros','accounts_payable','cxp_pagos',
    'audit_logs','folio_sequences'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);

    -- SELECT
    EXECUTE format(
      'DROP POLICY IF EXISTS "authenticated_read_%I" ON %I;
       CREATE POLICY "authenticated_read_%I"
       ON %I FOR SELECT
       USING (auth.uid() IS NOT NULL);',
      t, t, t, t
    );

    -- INSERT
    EXECUTE format(
      'DROP POLICY IF EXISTS "authenticated_insert_%I" ON %I;
       CREATE POLICY "authenticated_insert_%I"
       ON %I FOR INSERT
       WITH CHECK (auth.uid() IS NOT NULL);',
      t, t, t, t
    );

    -- UPDATE
    EXECUTE format(
      'DROP POLICY IF EXISTS "authenticated_update_%I" ON %I;
       CREATE POLICY "authenticated_update_%I"
       ON %I FOR UPDATE
       USING (auth.uid() IS NOT NULL)
       WITH CHECK (auth.uid() IS NOT NULL);',
      t, t, t, t
    );

    -- DELETE
    EXECUTE format(
      'DROP POLICY IF EXISTS "authenticated_delete_%I" ON %I;
       CREATE POLICY "authenticated_delete_%I"
       ON %I FOR DELETE
       USING (auth.uid() IS NOT NULL);',
      t, t, t, t
    );

  END LOOP;
END;
$$;

-- ============================================================
-- 6. COMENTARIOS
-- ============================================================
COMMENT ON TABLE vehicles          IS 'Catálogo maestro de unidades (autobuses, vans, camionetas) de la empresa.';
COMMENT ON TABLE drivers           IS 'Operadores / conductores. Usados en viajes, combustible, nómina.';
COMMENT ON TABLE employees         IS 'Personal administrativo y operativo no operadores.';
COMMENT ON TABLE attendance        IS 'Asistencia diaria de operadores y empleados.';
COMMENT ON TABLE trips             IS 'Viajes / servicios operativos. Tabla central del sistema.';
COMMENT ON TABLE fuel_prices       IS 'Precios vigentes de combustible por tipo. Auto-rellena el formulario de carga.';
COMMENT ON TABLE fuel_loads        IS 'Cada carga de combustible: litros, precio, odómetro, estación.';
COMMENT ON TABLE maintenance_orders IS 'Órdenes de mantenimiento preventivo y correctivo por unidad.';
COMMENT ON TABLE tire_inventory    IS 'Inventario de llantas y control de vida útil (km).';
COMMENT ON TABLE payroll_runs      IS 'Corridas de nómina con cálculo ISR y IMSS. Detalle en JSONB.';
COMMENT ON TABLE leads             IS 'CRM: prospectos y clientes en pipeline comercial.';
COMMENT ON TABLE shipping_orders   IS 'Guías de paquetería transportadas en los viajes.';
COMMENT ON TABLE agency_trips      IS 'Viajes de agencia B2C con venta de asientos al público.';
COMMENT ON TABLE seat_reservations IS 'Reservaciones individuales en viajes de agencia.';
COMMENT ON TABLE service_agreements IS 'Convenios de transporte de personal con empresas (rutas fijas).';
COMMENT ON TABLE agreement_routes  IS 'Rutas definidas en cada convenio de personal.';
COMMENT ON TABLE agreement_employees IS 'Empleados del cliente inscritos en cada ruta de convenio.';
COMMENT ON TABLE contracts         IS 'Contratos con clientes para vincular facturas CXC.';
COMMENT ON TABLE bank_accounts     IS 'Cuentas bancarias de la empresa para control de saldo.';
COMMENT ON TABLE bank_movements    IS 'Movimientos bancarios (ingresos/egresos) por cuenta.';
COMMENT ON TABLE accounts_receivable IS 'Cuentas por cobrar: facturas, anticipos y complementos a clientes.';
COMMENT ON TABLE cxc_cobros        IS 'Historial de abonos aplicados a cada CXC.';
COMMENT ON TABLE accounts_payable  IS 'Cuentas por pagar a proveedores por categoría de gasto.';
COMMENT ON TABLE cxp_pagos         IS 'Historial de pagos aplicados a cada CXP.';
COMMENT ON TABLE audit_logs        IS 'Log de auditoría: cada escritura relevante deja un registro aquí.';
COMMENT ON TABLE folio_sequences   IS 'Contadores de folios por prefijo para getNextFolio().';
