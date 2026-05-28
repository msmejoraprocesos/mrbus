# TransportOS 🚌

> El sistema operativo digital de tu empresa de movilidad.

---

## 🚀 Guía de instalación paso a paso

Sigue estos pasos **en orden**. Cada paso indica exactamente qué hacer.

---

### PASO 1 — Sube el código a GitHub

1. Abre **github.com** en tu navegador
2. Haz clic en el botón verde **"New"** para crear un repositorio
3. Nómbralo `transportos`
4. Déjalo en **Private** (privado)
5. Haz clic en **"Create repository"**
6. En la página siguiente, copia los comandos que aparecen bajo **"…or push an existing repository"**

En tu computadora, abre una terminal en la carpeta del proyecto y ejecuta:
```bash
git init
git add .
git commit -m "feat: initial project setup"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/transportos.git
git push -u origin main
```

---

### PASO 2 — Configura Supabase

1. Ve a **app.supabase.com** → abre tu proyecto
2. En el menú izquierdo haz clic en **"SQL Editor"**
3. Haz clic en **"New query"**
4. Copia TODO el contenido del archivo `supabase/migrations/001_initial_schema.sql`
5. Pégalo en el editor
6. Haz clic en el botón **"Run"** (o presiona Ctrl+Enter)
7. Debes ver el mensaje "Success. No rows returned" — eso es correcto ✓

---

### PASO 3 — Obtén tus credenciales de Supabase

1. En Supabase, ve al menú izquierdo → **"Settings"** → **"API"**
2. Anota estos dos valores (los necesitarás en el paso 4):
   - **Project URL** — algo como `https://xxxxxxxxxxx.supabase.co`
   - **anon public** — la llave que empieza con `eyJhbGci...`

---

### PASO 4 — Crea el primer usuario administrador

1. En Supabase → menú izquierdo → **"Authentication"** → **"Users"**
2. Haz clic en **"Add user"** → **"Create new user"**
3. Llena:
   - **Email**: tu correo
   - **Password**: una contraseña segura (mínimo 8 caracteres)
4. Haz clic en **"Create user"**

Ahora necesitas completar el perfil. Ve a **SQL Editor** y ejecuta esto (cambia los valores):
```sql
-- ⚠️ Cambia estos valores antes de ejecutar:
DO $$
DECLARE
  v_user_id UUID;
  v_org_id  UUID;
  v_role_id UUID;
BEGIN
  -- Obtener el ID del usuario que acabas de crear
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'TU_CORREO@ejemplo.com';

  -- Crear la organización de tu empresa
  INSERT INTO organizations (slug, name, plan)
  VALUES ('mi-empresa', 'Nombre de tu empresa', 'starter')
  RETURNING id INTO v_org_id;

  -- Crear el rol admin
  INSERT INTO roles (organization_id, name, permissions, is_system)
  VALUES (v_org_id, 'admin', '["*"]'::jsonb, true)
  RETURNING id INTO v_role_id;

  -- Actualizar el perfil del usuario
  UPDATE users SET
    organization_id = v_org_id,
    role_id = v_role_id,
    first_name = 'Tu nombre',
    last_name = 'Tu apellido'
  WHERE id = v_user_id;

  RAISE NOTICE 'Organización creada: %', v_org_id;
END $$;
```

---

### PASO 5 — Conecta con Vercel

1. Ve a **vercel.com** → **"Add New"** → **"Project"**
2. Selecciona **"Import Git Repository"**
3. Elige tu repositorio `transportos`
4. En la sección **"Environment Variables"** agrega:

   | Variable | Valor |
   |----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Tu Project URL de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu anon public key de Supabase |

5. Haz clic en **"Deploy"**
6. Espera ~2 minutos a que termine el deploy

✅ Tu app estará disponible en `https://transportos-xxxx.vercel.app`

---

### PASO 6 — Habilitar Realtime en Supabase

Para que el monitor de abordaje actualice en tiempo real:

1. Supabase → **"Database"** → **"Replication"**
2. En la tabla **"Source"** busca **"supabase_realtime"**
3. Haz clic en **"0 tables"** y activa estas tablas:
   - `trip_passengers`
   - `trips`
4. Guarda los cambios

---

### PASO 7 — Primera prueba

1. Abre tu URL de Vercel
2. Inicia sesión con tu correo y contraseña
3. Deberías ver el **Dashboard** con 0 viajes
4. Ve a **Viajes** → **"+ Nuevo viaje"**
5. Crea un viaje de prueba
6. Agrega pasajeros
7. Cambia el estado a **"Abrir abordaje"**
8. Abre la URL en tu celular → `/driver/home`
9. Inicia sesión y verás el viaje activo

---

## 📱 Instalar como app en el celular del operador

Para que el operador tenga la app instalada como si fuera nativa:

**En Android (Chrome):**
1. El operador abre la URL en Chrome
2. Presiona el menú (3 puntos) → **"Agregar a pantalla de inicio"**
3. Confirma → la app aparece en el escritorio del celular

**En iPhone (Safari):**
1. El operador abre la URL en Safari
2. Presiona el botón de compartir (cuadro con flecha) → **"Agregar a pantalla de inicio"**
3. Confirma

---

## 🏗️ Estructura del proyecto

```
transportos/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          ← Pantalla de login
│   │   ├── (admin)/               ← Panel administrativo (desktop)
│   │   │   ├── dashboard/         ← KPIs y viajes del día
│   │   │   ├── trips/             ← Lista de viajes
│   │   │   │   ├── new/           ← Crear viaje
│   │   │   │   └── [id]/          ← Detalle + monitor de abordaje
│   │   │   ├── fleet/             ← Flotilla (próximamente)
│   │   │   └── drivers/           ← Operadores (próximamente)
│   │   ├── (driver)/              ← App del operador (mobile PWA)
│   │   │   ├── home/              ← Mis viajes asignados
│   │   │   └── trip/[id]/         ← Viaje activo + abordaje
│   │   └── api/                   ← API Routes
│   │       ├── trips/             ← CRUD de viajes
│   │       └── boarding/check-in/ ← Registro de abordaje
│   ├── components/
│   │   ├── admin/                 ← Componentes del panel admin
│   │   └── driver/                ← Componentes de la PWA
│   └── lib/
│       ├── supabase/              ← Clientes de Supabase
│       ├── types/                 ← Tipos TypeScript
│       └── utils/                 ← Utilidades compartidas
└── supabase/migrations/           ← SQL de la base de datos
```

---

## 🔑 Roles del sistema

| Rol | Acceso |
|-----|--------|
| `admin` | Panel completo |
| `supervisor` | Solo lectura + aprobaciones |
| `dispatcher` | Programar y despachar viajes |
| `receptionist` | Registrar pasajeros |
| `driver` | Solo su app móvil (sus viajes) |

Para agregar un nuevo usuario con rol `driver`:

```sql
-- Ejecutar en Supabase SQL Editor
-- 1. Primero crea el usuario en Authentication → Add User
-- 2. Luego actualiza su perfil:
UPDATE users SET
  role_id = (SELECT id FROM roles WHERE name = 'driver' AND organization_id = 'TU_ORG_ID'),
  first_name = 'Nombre del chofer',
  last_name = 'Apellido'
WHERE id = (SELECT id FROM auth.users WHERE email = 'chofer@empresa.com');

-- 3. Si el chofer ya está en la tabla drivers, vincúlalo:
UPDATE drivers SET user_id = (SELECT id FROM auth.users WHERE email = 'chofer@empresa.com')
WHERE first_name = 'Nombre' AND last_name = 'Apellido';
```

---

## 🔄 Flujo de operación básico

```
Admin crea viaje → Agrega pasajeros → Abre abordaje
         ↓
Operador ve viaje en su celular → Busca pasajero → Toca ✓
         ↓
Dashboard admin se actualiza en tiempo real
         ↓
Operador inicia viaje → Finaliza viaje
```

---

## 🛠️ Comandos de desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev
# Abre http://localhost:3000

# Build de producción
npm run build

# Verificar tipos TypeScript
npm run type-check
```

---

## 📋 Variables de entorno

Crea un archivo `.env.local` con:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Nunca subas `.env.local` a GitHub** — ya está en el `.gitignore`

---

## 📞 Soporte

Para dudas sobre instalación o configuración, contacta al equipo de desarrollo.
