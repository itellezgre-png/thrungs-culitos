# CHANGELOG

## v1.3 — *bilingual throng*

**🌐 i18n completo (Español + English):**
- Nuevo selector de idioma en **AJUSTES → IDIOMA / LANGUAGE** con banderas 🇪🇸 / 🇬🇧
- Diccionario `LOCALES` con ~200 cadenas traducidas a ambos idiomas
- Cambio de idioma **en caliente** sin recargar: re-renderiza colonia, deudas, histórico, stats, modales y bocadillos
- Persiste en `state.settings.lang` → se sincroniza con la nube (tu idioma viaja con tus datos)
- Atributos `data-i18n`, `data-i18n-placeholder`, `data-i18n-html` en todo el HTML estático
- Función `t(key, vars)` con sustitución de placeholders (`{tutor}`, `{amount}`, etc.)
- Helper `timeAgo(s)` que devuelve "hace 5m" / "5m ago" según idioma
- **Throng-tongue traducido**: las frases que decían "¡Delicioso, tutor!" ahora dicen "Delicious, tutor!" en inglés (la lengua throng es la misma, solo cambia el subtítulo)
- 30+ mini-frases ambientales del mundo traducidas (`MINI_BUBBLES_ALL`)
- Frases de Thronglet enfermo traducidas (`SICK_BUBBLES_ALL`)
- Meses, confirmaciones, alertas, mensajes de error, indicador de guardado, estados de la nube — **todo traducido**

**Notas:**
- Los nombres propios (Isi, Gayle) y los nombres de Papas custom (OCIO, SUPER, SUSCRI o los que tú pongas) NO se traducen — son configuraciones del usuario
- La lengua "throng-tongue" original (KRII-MOK, PLONG, etc.) sigue siendo la misma en ambos idiomas — solo la traducción al lenguaje humano cambia

---

## v1.2 — *the cloud is throng*

**☁️ Sincronización en la nube en tiempo real (Supabase):**
- Nueva sección **AJUSTES → ☁️ SINCRONIZACIÓN NUBE**: pegar URL + anon key, pulsar CONECTAR
- Píldora `☁️ LOCAL / EN VIVO / ERROR` en el HUD con estado visual
- **Realtime subscription**: cuando uno añade/edita/borra un Throng, el otro lo ve aparecer en <1 segundo
- Píldora hace **flash verde** cuando entra un cambio remoto
- **Merge inteligente al conectar**: cloud gana en conflictos, items locales nuevos se suben automáticamente — no se pierden datos
- **URL de invitación** generada con `📋 COPIAR URL`: incluye `sb_url`, `sb_key` y `h` (household_id). Al abrirla, el otro dispositivo se auto-conecta
- **Auto-conexión** al cargar si las credenciales están guardadas
- **Anti-eco** de los propios writes para evitar loops realtime
- Cada función mutadora (`feed`, `saveEdit`, `returnToPapa`, `saveSettlement`, `savePapa`, `deletePapa`, `saveSettings`, `wipeAll`, `resetMonthBtn`) tiene su `cloudPush…` o `cloudDelete…` inline después del save local

**📄 Archivos nuevos:**
- `supabase-schema.sql` — SQL completo para pegar en Supabase SQL Editor
- `CLOUD_SETUP.md` — guía paso a paso (10 minutos) para configurarlo desde cero
- Supabase JS SDK se carga **dinámicamente** vía CDN solo cuando se conecta (no consume bandwidth si no se usa)

**🔒 Privacidad:**
- RLS desactivada por diseño (la app de pareja no la necesita)
- Seguridad por **household_id opaco** (UUID v4 random, 1 entre 2^128 combinaciones)
- Sin auth: anyone con household_id + anon key accede; sin alguno no se puede

**🔌 Resiliencia:**
- Sigue funcionando offline con localStorage
- Al volver online, se sincroniza con la nube
- Si Supabase está caído, la app funciona en local sin error visible

---

## v1.1 — *plong-plong everywhere*

**📲 PWA + Offline:**
- `manifest.json` y `sw.js` (service worker) registrados desde `index.html`
- Cache-first para todos los assets → la app funciona offline tras la primera carga
- Instalable como app nativa (Chrome/Edge/Safari/Firefox PWA): icono propio, sin chrome del navegador
- Indicador "Service Worker activo" en Ajustes

**📱 Responsive móvil:**
- Breakpoints en 900px (tablet) y 600px (móvil)
- Header, tabs y HUD se compactan
- Colonia: en móvil pasa a 2 columnas, Papa-frames más pequeños
- Panel de deudas: stack vertical en móvil (balance debajo de los dos tutores)
- Feed panel: campos en columna a pantalla completa, todos con altura táctil (≥40px)
- Histórico panel: ocupa todo el ancho en móvil
- Modales: full-bleed con margen mínimo en móvil
- Touch targets de mínimo 36-44px en todos los botones

**📅 Fecha editable por gasto:**
- Nuevo `<input type="date">` en el formulario de alta y en el modal de edición
- Default = hoy, pero permite registrar gastos retroactivos
- El `timestamp` del expense se ajusta a la fecha elegida (manteniendo hora actual)
- Las suscripciones recurrentes y stats respetan la nueva fecha

**🏷️ Papas personalizables (hasta 6):**
- `state.papas` reemplaza la constante `PAPA_THRONGS` hardcodeada
- Migración automática: viejos `settings.budgets` → `papa.budget`
- **6 color-slots / razas** con timbre y rango de notas propio:
  - Rosa (sine, octava 5)
  - Menta (triangle, octava 0)
  - Lila (square, octava 10)
  - Coral (sawtooth, octava 3)
  - Aqua (sine, octava 7)
  - Oliva (triangle, octava 2)
- UI en Ajustes: lista de Papas con preview, botón "+ Añadir Papa"
- Modal de edición: nombre, presupuesto, color-slot (no se pueden duplicar), sprite (7 opciones)
- Botón "Borrar" solo aparece si el Papa NO tiene Thronglets vivos (protege datos)
- La colonia se reorganiza en flex-wrap → cabe 1-6 Papas
- Filtros del histórico se generan dinámicamente con cada Papa

**⚖️ Reparto por gasto:**
- Cada `expense` lleva `split: { isi, gayle }` (default 50/50)
- Selector en el feed form: **50/50** · **100% ISI** · **100% GAYLE**
- Modal de edición también permite cambiar el reparto
- **Balance recalculado con splits**: la deuda real considera la responsabilidad declarada de cada gasto, no asume 50/50 ciegamente
- Ejemplo: si Isi paga la "ropa de Gayle" marcando 100% GAYLE, el sistema sabe que ella le debe el importe íntegro
- Etiqueta de reparto visible en cada fila del histórico
- Mini-Thronglet en MUNDO también dice su reparto al hablar

**🤝 Liquidación entre tutores:**
- Botón `💸 LIQUIDAR` en el panel BALANCE
- Modal: dirección (Gayle→Isi / Isi→Gayle), importe, fecha, nota (Bizum/efectivo/...)
- Se guarda como expense con `type: 'settlement'`, `papaId: 'settlement'`
- **No aparece como Thronglet en el mundo** (no es un gasto)
- Aparece en histórico con estilo especial (amarillo, cursiva, icono 💸)
- **Reduce la deuda en tiempo real**: si Gayle pagó 100€ a Isi y le debía 100€, el balance vuelve a equilibrio
- Filtro "LIQUID." en histórico para ver solo liquidaciones

**🔮 Autocompletado y búsqueda:**
- El campo "concepto" tiene `<datalist>` con sugerencias basadas en gastos previos
- Empieza a teclear "net" → sugerencia "Netflix"
- Nuevo input `<search>` en el histórico que filtra por substring en concepto
- Funciona combinado con los filtros existentes (tutor/papa)

**🗂️ Arquitectura limpia para cloud sync:**
- `save()` y `load()` aislados en una sección dedicada
- Toda la lógica de datos pasa por estas dos funciones
- Cuando se quiera enchufar Supabase: reemplazar `localStorage.setItem` con llamada a Supabase + suscripción a cambios. El resto de la app no necesita tocar nada.

**Otras mejoras:**
- Sistema de notas pentatónicas usa la octava propia de cada papa (los nuevos colores tienen sus propias notas musicales)
- `init()` regenera la colonia y selectores dinámicamente
- Service worker se auto-actualiza al cambiar la versión del cache (`thrungs-money-v1.1`)

---

## v1.0 — *we are eternal*

[v1.0 original — auto-backup, exportar/importar, stats, edit modal, filters, performance, save indicator, README, CHANGELOG]

---

## v0.5 — *los Thronglets de verdad*

[Sprites GIF reales de KJP + sistema de duetos melódicos]

---

## v0.4 — *vida random*

[20 animaciones random, SVG rig completo, sonidos asociados por animación]

---

## v0.3 — *suscripciones recurrentes + ajustes*

[SUSCRI recurrente, tab AJUSTES, histórico lateral, enfermedad heredada, devolver al papa]

---

## v0.2 — *Mundo Throng + Deudas*

[Pestaña MUNDO THRONG, panel DEUDAS 50/50, persistencia localStorage, navegación entre meses]

---

## v0.1 — *prototipo jugable*

[Pantalla CRT, 3 Papas CSS-blob, boot screen, sonidos procedurales]
