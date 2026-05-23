# ☁️ Sincronización en la nube — Setup en 10 minutos

Para que tu PC Windows y la Mac de Gayle compartan datos **en tiempo real**.

**Coste total**: 0 €. Free tier de Supabase + Netlify para siempre.

---

## Lo que vas a hacer

1. Crear cuenta gratuita en Supabase (5 min)
2. Pegar un SQL para crear las tablas (1 min)
3. Subir la app a Netlify (2 min)
4. Pegar credenciales en AJUSTES (10 seg)
5. Mandar URL de invitación a Gayle (10 seg)

---

## Paso 1 — Crear proyecto Supabase

1. Ve a **https://supabase.com** → "Start your project" → login con GitHub o email
2. **"New project"**:
   - **Name**: `throng-wallet`
   - **Database Password**: clic en "Generate" y guárdala en algún sitio seguro (no la necesitas para usar la app)
   - **Region**: la más cercana — `West EU (Ireland)` o `Central EU (Frankfurt)`
   - **Pricing plan**: **Free**
3. Pulsa "Create new project" y espera ~1 minuto a que termine de provisionar

## Paso 2 — Crear las tablas

1. Menú izquierdo → **SQL Editor** → **"+ New query"**
2. Abre el archivo `supabase-schema.sql` que tienes en la carpeta del proyecto
3. Copia su contenido completo (Ctrl+A · Ctrl+C)
4. Pégalo en el editor SQL de Supabase
5. Pulsa **"Run"** (esquina inferior derecha)
6. Debe salir mensaje en verde: *"Success. No rows returned"*

✅ Tu base de datos está lista.

## Paso 3 — Copiar las credenciales del proyecto

1. Menú izquierdo → **Project Settings** (rueda dentada al final)
2. Submenú **"API"**
3. Vas a copiar **dos cadenas** (las necesitarás en el Paso 5):
   - **Project URL** — algo como `https://abcdefghi.supabase.co`
   - **Project API keys** → **`anon` `public`** — cadena larga que empieza por `eyJ...`

> ⚠️ **No copies** la key `service_role` (es secreta administrativa). Solo la `anon public`, que está pensada para usarse en navegador.

## Paso 4 — Subir la app a Netlify (Drag & Drop)

Necesitas hacerlo para que el service worker funcione (con `file://` Chrome lo bloquea) y para que ambos accedáis a la misma URL.

1. Ve a **https://app.netlify.com/drop**
2. **Arrastra la carpeta `ThrungsMoney` entera** al recuadro grande
3. Espera 20 segundos
4. Te da una URL pública (ej. `https://krii-mok-12345.netlify.app`)
5. **Guárdala** — la necesitas para abrir la app

> Opcional: en Netlify, ve a **"Domain management"** y renombra el subdominio a algo más bonito como `thrungs-isi-gayle`.

## Paso 5 — Conectar tu dispositivo

1. **Abre la URL de Netlify** en Chrome (no la versión local)
2. Verás la app igual que siempre, pero arriba a la derecha tienes una píldora `☁️ LOCAL` en gris
3. Ve a **AJUSTES** → busca la sección **"☁️ SINCRONIZACIÓN NUBE"**
4. **Pega la Project URL** en el primer campo
5. **Pega la anon public key** en el segundo
6. Pulsa **"CONECTAR"**
7. Si todo va bien:
   - El píldora arriba pasa a `☁️ EN VIVO` en verde
   - Aparece un Household ID (UUID largo) en la sección
   - Tus datos locales se han copiado a la nube automáticamente

## Paso 6 — Invitar a Gayle

1. En la misma sección de AJUSTES, pulsa **"📋 COPIAR URL DE INVITACIÓN"**
2. Te copia al portapapeles una URL larga tipo:
   `https://krii-mok-12345.netlify.app/?sb_url=...&sb_key=...&h=...`
3. **Envíasela a Gayle** por WhatsApp/Telegram/email
4. Ella la abre **una vez** en Safari/Chrome de su Mac:
   - La app se conecta automáticamente
   - Pulla todos los datos que tienes
   - El píldora pasa a `☁️ EN VIVO` en verde también
5. **Listo**: a partir de aquí, cuando uno añade un gasto, el otro lo ve aparecer en vivo

> Tras el primer click, las credenciales quedan guardadas en su navegador. Ya no necesita la URL de invitación nunca más — abre directamente la URL base de Netlify.

---

## Cómo funciona la sincronización

- Cada cambio (alimentar, editar, borrar, liquidar, ajustes, papas) se envía a la nube **al instante**
- Supabase Realtime notifica al otro dispositivo en **<1 segundo**
- Si estás offline, sigue funcionando con localStorage; al volver online se sincroniza
- Si dos editáis lo mismo a la vez, gana la última escritura (poco probable en práctica)

---

## Privacidad y seguridad

- **El URL de Supabase y la anon key son públicas** — están diseñadas para ir en código de cliente
- **La "contraseña" real es el Household ID** (UUID v4 aleatorio, 1 entre 2^128)
- Cualquiera que no tenga tu Household ID NO puede leer ni escribir tus datos
- No compartas la URL de invitación con nadie aparte de Gayle
- Si alguna vez sospechas que se filtró, puedes:
  1. Ir a Supabase → SQL Editor
  2. Ejecutar: `delete from households where id = 'tu-household-id';` (borra TODOS los datos del hogar comprometido en cascada)
  3. Desconectar y reconectar las apps (generará nuevo Household ID)

---

## Coste real (free tier de Supabase + Netlify)

| Recurso | Free tier | Tu uso real estimado |
|---------|-----------|----------------------|
| Supabase DB | 500 MB | < 1 MB en 5 años |
| Supabase Auth users | 50,000 | 0 (no usamos auth) |
| Supabase Realtime msgs | 2,000,000/mes | ~3,000 al mes para 2 personas |
| Supabase egress | 5 GB/mes | < 50 MB/mes |
| Netlify bandwidth | 100 GB/mes | < 200 MB/mes |
| Netlify builds | 300 min/mes | 0 (es estático) |

**Total mensual: 0,00 €** — el free tier sobra de largo para una pareja.

---

## Solución de problemas

**"Faltan URL o key"** al pulsar Conectar
→ Asegúrate de pegar la Project URL completa (con `https://`) y la key `anon public` (no la service_role).

**"No se pudo cargar Supabase SDK"**
→ Tu navegador no llega al CDN. Comprueba conexión a internet. Si estás detrás de un firewall corporativo, prueba con datos móviles.

**La app dice "EN VIVO" pero los cambios no aparecen en el otro dispositivo**
→ Verifica que en el otro dispositivo también ponga `☁️ EN VIVO`. Si pone `LOCAL`, ese dispositivo no abrió la URL de invitación correctamente. Repítele el envío.

**Errores 401/403 en la consola**
→ Revisa que las tablas existan ejecutando de nuevo el SQL del Paso 2. Si te dice "ya existen" no pasa nada, los `create table if not exists` son idempotentes.

**Quiero empezar desde cero**
→ AJUSTES → SINCRONIZACIÓN → DESCONECTAR. Luego en Supabase: `delete from households;` y vuelves a CONECTAR — generará un Household ID nuevo.

---

## Migración futura

Si algún día queréis cambiar de provider (Supabase → algo más), bastará con:
1. Exportar JSON desde la app (botón ya existente en AJUSTES)
2. Crear el nuevo backend
3. Importar el JSON

Los datos viven en tu JSON, no están "atrapados" en Supabase.
