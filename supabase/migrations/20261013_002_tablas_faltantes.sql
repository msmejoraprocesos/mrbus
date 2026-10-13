-- ============================================================
-- MrBus — Tablas Faltantes
-- 2026-10-13
-- Tablas usadas en la app pero no cubiertas en la migración 001
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- COMERCIAL — quotations
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          UUID REFERENCES leads(id) ON DELETE SET NULL,
  version          INT NOT NULL DEFAULT 1,
  service_type     TEXT,
  status           TEXT NOT NULL DEFAULT 'draft',
  client_price     NUMERIC(12,2),
  cost_breakdown   JSONB,
  notes            TEXT,
  valid_until      DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_quotations" ON quotations
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotations' AND column_name='lead_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_quotations_lead_id') THEN
      EXECUTE 'CREATE INDEX idx_quotations_lead_id ON quotations(lead_id)';
    END IF;
  END IF;
END $$;
CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- OPERACION — saved_routes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_routes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_name          TEXT,
  destination_name     TEXT,
  name                 TEXT,
  distance_km          NUMERIC(8,2),
  tolls_by_vehicle     JSONB,
  usage_count          INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_saved_routes" ON saved_routes
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_saved_routes_updated_at
  BEFORE UPDATE ON saved_routes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- RRHH — employee_leaves
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_leaves (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type    TEXT,
  start_date    DATE,
  end_date      DATE,
  days_count    INT,
  status        TEXT NOT NULL DEFAULT 'pending',
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE employee_leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_employee_leaves" ON employee_leaves
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employee_leaves' AND column_name='employee_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_employee_leaves_employee_id') THEN
      EXECUTE 'CREATE INDEX idx_employee_leaves_employee_id ON employee_leaves(employee_id)';
    END IF;
  END IF;
END $$;
CREATE TRIGGER trg_employee_leaves_updated_at
  BEFORE UPDATE ON employee_leaves FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- RRHH — payroll_settlements
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_settlements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID REFERENCES employees(id) ON DELETE SET NULL,
  settlement_type  TEXT,
  base_salary      NUMERIC(12,2),
  years_service    NUMERIC(5,2),
  total_amount     NUMERIC(12,2),
  status           TEXT NOT NULL DEFAULT 'draft',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE payroll_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_payroll_settlements" ON payroll_settlements
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_settlements' AND column_name='employee_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_payroll_settlements_employee_id') THEN
      EXECUTE 'CREATE INDEX idx_payroll_settlements_employee_id ON payroll_settlements(employee_id)';
    END IF;
  END IF;
END $$;
CREATE TRIGGER trg_payroll_settlements_updated_at
  BEFORE UPDATE ON payroll_settlements FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- OPERACION — driver_advances
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_advances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id      UUID REFERENCES drivers(id) ON DELETE SET NULL,
  amount         NUMERIC(12,2),
  purpose        TEXT,
  trip_id        UUID REFERENCES trips(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  repaid_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE driver_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_driver_advances" ON driver_advances
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='driver_advances' AND column_name='driver_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_driver_advances_driver_id') THEN
      EXECUTE 'CREATE INDEX idx_driver_advances_driver_id ON driver_advances(driver_id)';
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='driver_advances' AND column_name='trip_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_driver_advances_trip_id') THEN
      EXECUTE 'CREATE INDEX idx_driver_advances_trip_id ON driver_advances(trip_id)';
    END IF;
  END IF;
END $$;
CREATE TRIGGER trg_driver_advances_updated_at
  BEFORE UPDATE ON driver_advances FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- RENTAS — rental_services
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rental_services (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id         UUID REFERENCES contracts(id) ON DELETE SET NULL,
  trip_id             UUID REFERENCES trips(id) ON DELETE SET NULL,
  client_name         TEXT,
  route_description   TEXT,
  service_type        TEXT,
  contracted_hours    NUMERIC(6,2),
  actual_hours        NUMERIC(6,2),
  contracted_km       NUMERIC(8,2),
  actual_km           NUMERIC(8,2),
  base_amount         NUMERIC(12,2),
  extras_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(12,2),
  status              TEXT NOT NULL DEFAULT 'scheduled',
  start_datetime      TIMESTAMPTZ,
  end_datetime        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE rental_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_rental_services" ON rental_services
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rental_services' AND column_name='contract_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_rental_services_contract_id') THEN
      EXECUTE 'CREATE INDEX idx_rental_services_contract_id ON rental_services(contract_id)';
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rental_services' AND column_name='trip_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_rental_services_trip_id') THEN
      EXECUTE 'CREATE INDEX idx_rental_services_trip_id ON rental_services(trip_id)';
    END IF;
  END IF;
END $$;
CREATE TRIGGER trg_rental_services_updated_at
  BEFORE UPDATE ON rental_services FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- CUMPLIMIENTO — compliance_alerts
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module        TEXT,
  alert_type    TEXT,
  severity      TEXT NOT NULL DEFAULT 'warning',
  title         TEXT,
  description   TEXT,
  entity_id     UUID,
  entity_type   TEXT,
  status        TEXT NOT NULL DEFAULT 'open',
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_compliance_alerts" ON compliance_alerts
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compliance_alerts' AND column_name='status') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_compliance_alerts_status') THEN
      EXECUTE 'CREATE INDEX idx_compliance_alerts_status ON compliance_alerts(status)';
    END IF;
  END IF;
END $$;
CREATE TRIGGER trg_compliance_alerts_updated_at
  BEFORE UPDATE ON compliance_alerts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- ACTIVOS FIJOS — fixed_assets
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fixed_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT,
  asset_code          TEXT UNIQUE,
  category            TEXT,
  purchase_date       DATE,
  purchase_value      NUMERIC(12,2),
  current_value       NUMERIC(12,2),
  depreciation_rate   NUMERIC(5,2),
  status              TEXT NOT NULL DEFAULT 'active',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_fixed_assets" ON fixed_assets
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_fixed_assets_updated_at
  BEFORE UPDATE ON fixed_assets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- ACTIVOS FIJOS — asset_depreciation_log
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asset_depreciation_log (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id                 UUID REFERENCES fixed_assets(id) ON DELETE CASCADE,
  period_date              DATE,
  depreciation_amount      NUMERIC(12,2),
  accumulated_depreciation NUMERIC(12,2),
  book_value               NUMERIC(12,2),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE asset_depreciation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_sel_asset_depreciation_log" ON asset_depreciation_log
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_ins_asset_depreciation_log" ON asset_depreciation_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='asset_depreciation_log' AND column_name='asset_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_asset_depreciation_log_asset_id') THEN
      EXECUTE 'CREATE INDEX idx_asset_depreciation_log_asset_id ON asset_depreciation_log(asset_id)';
    END IF;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- COMPRAS — suppliers
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT,
  rfc            TEXT,
  contact_name   TEXT,
  email          TEXT,
  phone          TEXT,
  address        TEXT,
  payment_terms  TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_suppliers" ON suppliers
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- COMPRAS — purchase_requests
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio            TEXT UNIQUE,
  requested_by     UUID,
  department       TEXT,
  items            JSONB,
  total_estimated  NUMERIC(12,2),
  status           TEXT NOT NULL DEFAULT 'pending',
  approved_by      UUID,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_purchase_requests" ON purchase_requests
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_purchase_requests_updated_at
  BEFORE UPDATE ON purchase_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- COMPRAS — purchase_orders
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio          TEXT UNIQUE,
  supplier_id    UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  request_id     UUID REFERENCES purchase_requests(id) ON DELETE SET NULL,
  items          JSONB,
  total_amount   NUMERIC(12,2),
  status         TEXT NOT NULL DEFAULT 'draft',
  expected_date  DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_purchase_orders" ON purchase_orders
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='supplier_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_purchase_orders_supplier_id') THEN
      EXECUTE 'CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id)';
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='request_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_purchase_orders_request_id') THEN
      EXECUTE 'CREATE INDEX idx_purchase_orders_request_id ON purchase_orders(request_id)';
    END IF;
  END IF;
END $$;
CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- INVENTARIO — warehouses
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  location      TEXT,
  manager_name  TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_warehouses" ON warehouses
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_warehouses_updated_at
  BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- INVENTARIO — inventory_items
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             TEXT UNIQUE,
  name            TEXT,
  category        TEXT,
  warehouse_id    UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  stock_quantity  NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit            TEXT,
  min_stock       NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_cost       NUMERIC(12,2),
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_inventory_items" ON inventory_items
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='warehouse_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_inventory_items_warehouse_id') THEN
      EXECUTE 'CREATE INDEX idx_inventory_items_warehouse_id ON inventory_items(warehouse_id)';
    END IF;
  END IF;
END $$;
CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- INVENTARIO — inventory_movements
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  movement_type   TEXT,
  quantity        NUMERIC(10,2),
  unit_cost       NUMERIC(12,2),
  reference_id    UUID,
  reference_type  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_sel_inventory_movements" ON inventory_movements
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_ins_inventory_movements" ON inventory_movements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='item_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_inventory_movements_item_id') THEN
      EXECUTE 'CREATE INDEX idx_inventory_movements_item_id ON inventory_movements(item_id)';
    END IF;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- FLUJO APROBACIONES — approval_requests
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module        TEXT,
  entity_id     UUID,
  entity_type   TEXT,
  requested_by  UUID,
  assigned_to   UUID,
  status        TEXT NOT NULL DEFAULT 'pending',
  comments      TEXT,
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_approval_requests" ON approval_requests
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approval_requests' AND column_name='status') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_approval_requests_status') THEN
      EXECUTE 'CREATE INDEX idx_approval_requests_status ON approval_requests(status)';
    END IF;
  END IF;
END $$;
CREATE TRIGGER trg_approval_requests_updated_at
  BEFORE UPDATE ON approval_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- CAJA CHICA — petty_cash
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS petty_cash (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT,
  assigned_to  UUID,
  balance      NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_amount   NUMERIC(12,2),
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_petty_cash" ON petty_cash
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_petty_cash_updated_at
  BEFORE UPDATE ON petty_cash FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- CAJA CHICA — petty_cash_movements
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS petty_cash_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petty_cash_id  UUID REFERENCES petty_cash(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2),
  movement_type  TEXT,
  concept        TEXT,
  receipt_url    TEXT,
  approved_by    UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE petty_cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_sel_petty_cash_movements" ON petty_cash_movements
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_ins_petty_cash_movements" ON petty_cash_movements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='petty_cash_movements' AND column_name='petty_cash_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_petty_cash_movements_petty_cash_id') THEN
      EXECUTE 'CREATE INDEX idx_petty_cash_movements_petty_cash_id ON petty_cash_movements(petty_cash_id)';
    END IF;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- CONTABILIDAD — accounting_entries
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounting_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio         TEXT UNIQUE,
  entry_date    DATE,
  description   TEXT,
  lines         JSONB,
  total_debit   NUMERIC(12,2),
  total_credit  NUMERIC(12,2),
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_accounting_entries" ON accounting_entries
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_accounting_entries_updated_at
  BEFORE UPDATE ON accounting_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- FISCAL — invoices
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio           TEXT,
  uuid_cfdi       UUID,
  series          TEXT,
  client_name     TEXT,
  client_rfc      TEXT,
  subtotal        NUMERIC(12,2),
  iva             NUMERIC(12,2),
  total           NUMERIC(12,2),
  status          TEXT NOT NULL DEFAULT 'draft',
  cfdi_use        TEXT,
  payment_method  TEXT,
  issued_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_invoices" ON invoices
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- CONVENIOS — boarding_events
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boarding_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id     UUID REFERENCES agreement_routes(id) ON DELETE SET NULL,
  employee_id  UUID REFERENCES agreement_employees(id) ON DELETE SET NULL,
  event_date   DATE,
  boarded      BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE boarding_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_sel_boarding_events" ON boarding_events
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_ins_boarding_events" ON boarding_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='boarding_events' AND column_name='route_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_boarding_events_route_id') THEN
      EXECUTE 'CREATE INDEX idx_boarding_events_route_id ON boarding_events(route_id)';
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='boarding_events' AND column_name='employee_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_boarding_events_employee_id') THEN
      EXECUTE 'CREATE INDEX idx_boarding_events_employee_id ON boarding_events(employee_id)';
    END IF;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- MENSAJERIA — shipping_events
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_order_id UUID REFERENCES shipping_orders(id) ON DELETE CASCADE,
  event_type        TEXT,
  location          TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE shipping_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_sel_shipping_events" ON shipping_events
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_ins_shipping_events" ON shipping_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipping_events' AND column_name='shipping_order_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_shipping_events_shipping_order_id') THEN
      EXECUTE 'CREATE INDEX idx_shipping_events_shipping_order_id ON shipping_events(shipping_order_id)';
    END IF;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- VIAJES — trip_passengers
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_passengers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID REFERENCES trips(id) ON DELETE CASCADE,
  name         TEXT,
  seat_number  TEXT,
  id_number    TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE trip_passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_sel_trip_passengers" ON trip_passengers
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_ins_trip_passengers" ON trip_passengers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trip_passengers' AND column_name='trip_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_trip_passengers_trip_id') THEN
      EXECUTE 'CREATE INDEX idx_trip_passengers_trip_id ON trip_passengers(trip_id)';
    END IF;
  END IF;
END $$;
