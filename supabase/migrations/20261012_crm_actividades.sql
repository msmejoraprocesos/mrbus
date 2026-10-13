-- ============================================================
-- MrBus — CRM: Mejoras al módulo comercial
-- Agrega: valor_estimado, ciudad, ultimo_contacto en leads
--         + tabla lead_actividades para seguimiento
-- ============================================================

-- 1. Ampliar tabla leads existente
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ciudad            TEXT,
  ADD COLUMN IF NOT EXISTS valor_estimado    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ultimo_contacto   TIMESTAMPTZ;

-- 2. Tabla de actividades por lead (llamadas, WhatsApps, citas, emails, notas)
CREATE TABLE IF NOT EXISTS lead_actividades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  org_id      UUID REFERENCES organizations(id),
  tipo        TEXT NOT NULL CHECK (tipo IN ('llamada','whatsapp','cita','email','nota')),
  titulo      TEXT NOT NULL,
  notas       TEXT,
  fecha       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estatus     TEXT NOT NULL DEFAULT 'completado' CHECK (estatus IN ('pendiente','completado','cancelado')),
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lead_actividades_lead_id ON lead_actividades(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_actividades_fecha   ON lead_actividades(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_lead_actividades_org_id  ON lead_actividades(org_id);

-- 3. RLS
ALTER TABLE lead_actividades ENABLE ROW LEVEL SECURITY;

-- Los usuarios de la misma organización pueden ver y operar las actividades
CREATE POLICY IF NOT EXISTS "lead_actividades_org_select"
  ON lead_actividades FOR SELECT
  USING (
    org_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "lead_actividades_org_insert"
  ON lead_actividades FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "lead_actividades_org_update"
  ON lead_actividades FOR UPDATE
  USING (
    org_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- 4. Función: actualizar ultimo_contacto en lead cuando se inserta actividad
CREATE OR REPLACE FUNCTION fn_update_lead_ultimo_contacto()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE leads
    SET ultimo_contacto = NEW.fecha
  WHERE id = NEW.lead_id
    AND (ultimo_contacto IS NULL OR NEW.fecha > ultimo_contacto);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_actividad_contacto ON lead_actividades;
CREATE TRIGGER trg_lead_actividad_contacto
  AFTER INSERT ON lead_actividades
  FOR EACH ROW EXECUTE FUNCTION fn_update_lead_ultimo_contacto();

-- ============================================================
-- INSTRUCCIONES:
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- El trigger actualiza automáticamente ultimo_contacto en leads
-- cuando se registra una nueva actividad.
-- ============================================================
