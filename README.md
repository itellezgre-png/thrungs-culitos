# THRONG-WALLET

> *KRII-MOK! Plong-plong! We are throng.*

Una app monedero para pareja inspirada en **Plaything** (Black Mirror S7). Cada gasto se convierte en un **Thronglet vivo** que habita tu colonia, baila, charla, canta dúos al chocar con otros, y a veces enferma si te pasas del presupuesto.

Hecha en HTML/CSS/JS puro, sin build step, sin dependencias. Abres `index.html` y funciona.

---

## Cómo se usa

1. Abre `index.html` con doble clic (Windows) o `open index.html` (Mac).
2. Haz clic en cualquier sitio de la pantalla de boot para entrar.
3. Estás en la **COLONIA**. Para añadir un gasto:
   - Elige Papa (OCIO / SUPER / SUSCRI)
   - Escribe concepto (`cena indio`, `netflix`, ...)
   - Importe en €
   - Tutor que pagó (ISI / GAYLE)
   - Pulsa **ALIMENTAR**
4. Cada gasto crea un mini-Thronglet con el ADN de su Papa. Lo ves en **MUNDO THRONG**, deambulando.
5. Cuando dos Throngs se chocan, **cantan un dueto** (notas pentatónicas, siempre suena bien). Después de varias colisiones, una melodía emerge sola.

---

## Pestañas

### COLONIA
La pantalla principal. Tres Papa Throngs (sprites animados reales) representando tus categorías de gasto. Panel inferior para registrar nuevos gastos. Panel central de **DEUDAS** muestra cuánto debe quién a quién.

### MUNDO THRONG
Un universo por cada mes. Los Throngs viven, deambulan, cambian de animación aleatoriamente entre 7 estados (think, explain, happy, skeptical, talk variantes A/C/D), hablan entre ellos, chocan, cantan dúos. Navegas entre meses con `◀ ▶` o vuelves a HOY con un click.

- **Click** un Throng → te cuenta su historia (concepto, fecha, tutor, importe, recurrencia)
- Botón **HISTÓRICO** → panel lateral con tabla de gastos + **filtros** por tutor o Papa
- Editar cualquier gasto con el botón `✎`, devolver al Papa con `×`

### STATS
Análisis del histórico completo:
- Acumulado total · media mensual · mes más caro · número de Throngs
- Gráfico de barras de los últimos 12 meses
- Reparto por Papa (con barras horizontales y %)
- Reparto por Tutor
- Top 5 gastos más caros

### AJUSTES
- **Presupuestos** editables por Papa (un Papa pasado de presupuesto enferma → sus hijos nacen enfermos también)
- **Modelo de deuda**: 50/50 (recomendado) o diferencia bruta
- **Volumen maestro** + **actividad del mundo** (tranquilo / normal / fiesta Throng)
- **📦 Copia de seguridad**: exportar/importar JSON
- **Zona sacrificio**: borrar este mes / borrar toda la colonia

---

## Mecánicas clave

### Suscripciones recurrentes
Cualquier gasto con Papa `SUSCRI` aparece automáticamente **en todos los meses posteriores** a su registro (nunca antes). Llevan el badge `♺`. Cancelar una suscripción (desde MUNDO o HISTÓRICO) la elimina de todos los meses.

### Enfermedad heredada
Cuando un Papa supera su presupuesto del mes, **enferma** (rojo + sacudida). Los mini-Throngs que nazcan de un Papa enfermo llevan la marca `bornSick: true` para siempre — se renderizan con tinte rojo y prefieren la animación `skeptical`.

### Dúos melódicos
Cada gasto recibe una **nota** (pentatónica C mayor) basada en hash de su ID. Cada Papa tiene un **timbre** (sine/triangle/square) y un **rango de octava**. Cuando dos Throngs se chocan:
- Rebote físico suave
- Animación de "talk" sincronizada
- Ambos cantan su nota con 80ms de desfase
- `♪ ♫` flotan sobre sus cabezas

Si caen 4+ notas en 5 segundos, el motor las **reproduce en secuencia como una melodía emergente**.

### Balance de deudas
Con `splitModel: 'half'` (default), el balance entre tutores es **la mitad de la diferencia** de aportaciones, que es lo matemáticamente correcto para reparto 50/50. Si tú pagas 500 y ella 300, ella te debe 100 (no 200) para que ambos hayáis aportado 400 efectivos. Con `'difference'` se muestra la diferencia bruta (200).

---

## Persistencia y seguridad de datos

Los datos viven en **localStorage** de tu navegador, bajo dos claves:
- `throngwallet-v0.2` — clave principal
- `throngwallet-backup-v1` — copia automática paralela con timestamp

Al cargar, si la principal falla, se intenta recuperar de la copia. Cada `save()` escribe en ambas. El indicador `💾` del HUD pulsa cada vez que se guarda.

⚠️ **localStorage es por navegador**. Si limpias datos de navegación, cambias de equipo o de navegador, **pierdes todo**. Exporta JSON regularmente desde AJUSTES → COPIA DE SEGURIDAD → ⬇ EXPORTAR.

---

## Estructura de archivos

```
ThrungsMoney/
├── index.html              # estructura DOM (4 vistas + speech + 3 modales)
├── styles.css              # estilos completos (con media queries móviles)
├── app.js                  # toda la lógica (21 secciones documentadas)
├── manifest.json           # metadata para instalar como PWA
├── sw.js                   # service worker (cache-first, offline)
├── README.md               # este archivo
├── CHANGELOG.md            # historial de versiones
└── sprites/
    ├── A_think.gif         # idle / pensando
    ├── A_explain.gif       # explicando / excitado
    ├── A_happy.gif         # alegre / nodding
    ├── A_skeptical.gif     # escéptico / triste / enfermo
    ├── A_talk.gif          # hablando (variante A)
    ├── C_talk.gif          # hablando (variante C)
    └── D_talk.gif          # hablando (variante D)
```

## Cómo instalarla como app (PWA)

Para que se comporte como app nativa (icono en escritorio/móvil, sin barra de navegador, **offline**):

1. Sirve los archivos desde un servidor (no abierto con `file://` — los service workers necesitan HTTP/HTTPS). Opciones rápidas:
   - **Local**: `npx serve .` en la carpeta del proyecto, abre `http://localhost:3000`
   - **Online**: sube la carpeta a Netlify Drop, Vercel, GitHub Pages — son gratis
2. Abre la URL en Chrome/Edge: aparece icono de instalación en la barra de direcciones
3. En móvil Android: menú · "Añadir a pantalla de inicio"
4. En iOS Safari: compartir · "Añadir a inicio"
5. Una vez instalada, funciona offline (los datos siguen en localStorage; las imágenes y código se cachean).

> Mientras la abras con `file://` (doble clic en `index.html`), todo funciona EXCEPTO el service worker. La app sigue 100% operativa, solo no es instalable.

## ☁️ Sincronización entre dispositivos (en vivo)

Para que tú y Gayle compartáis datos en tiempo real entre PC y Mac:

**Setup completo en `CLOUD_SETUP.md`** (5-10 minutos). Resumen:

1. Crea cuenta gratis en [supabase.com](https://supabase.com)
2. Ejecuta el SQL de `supabase-schema.sql` para crear las tablas
3. Sube la carpeta a Netlify Drop (drag-drop, 30 segundos)
4. Pega las credenciales en AJUSTES → ☁️ SINCRONIZACIÓN NUBE → CONECTAR
5. Copia la "URL de invitación" y envíasela a Gayle
6. Ella la abre una vez en su Mac → conectada en vivo

**Coste**: 0 € (free tier de Supabase + Netlify, indefinido).

**Cómo funciona**:
- Cada cambio se sincroniza al instante con Supabase
- Realtime: el otro dispositivo lo ve aparecer en <1 segundo
- Píldora `☁️` en el HUD indica estado (LOCAL · EN VIVO · ERROR)
- Sigue funcionando offline; se reconcilia al volver online
- El píldora hace **flash verde** cuando entra un cambio remoto

**Privacidad**: tu Household ID es un UUID v4 (1 entre 2^128). Sin ese ID, nadie puede ver ni editar tus datos. La URL y la anon key son públicas por diseño.

Los originales de KJP que pasaste se quedan también en la raíz por si quieres consultarlos.

---

## Stack técnico

- **HTML/CSS/JS** vanilla, sin build step, sin dependencias
- **Web Audio API** para los 20+ sonidos procedurales (cero archivos de audio, todo generado en vivo)
- **localStorage** para persistencia
- **requestAnimationFrame** para el bucle del mundo, pausado vía Visibility API cuando la pestaña está oculta
- **transform: translate3d** para posicionar mini-Throngs (acelerado por GPU)
- Detección de colisiones throttleada a 20Hz para no quemar CPU
- Fuentes: Press Start 2P + VT323 (Google Fonts)
- Sprites: GIFs de Kevin Jean-Philippe (KJP)

---

## 🌐 Idiomas

La app está **completamente bilingüe** (Español + English). Cambia desde AJUSTES → IDIOMA / LANGUAGE. Persiste por usuario y se sincroniza vía cloud (cada uno puede tenerlo en su idioma si quiere — pero como settings es por household, en realidad ambos comparten).

Lo traducido: tabs, HUD, deudas, feed form, mundo, histórico, stats, ajustes, todos los modales, confirmaciones, alertas, indicador de guardado, estados de la nube, meses, mini-bocadillos del mundo, frases de los Thronglets (la lengua throng-tongue es la misma; cambia el subtítulo humano).

Lo NO traducido (a propósito): nombres propios (Isi, Gayle), nombres de Papas custom, el idioma alien "throng-tongue" (KRII-MOK, PLONG-PLONG, etc.).

## Atajos de teclado

| Tecla | Acción |
|-------|--------|
| `Enter` en concepto | salta al campo importe |
| `Enter` en importe | alimenta directamente |
| `Esc` | cierra modal de edición o panel histórico |

---

## Inspiración y créditos

- **Black Mirror: Plaything** (Netflix, 2025) — concepto base de los Thronglets
- **Black Mirror: Thronglets** (Night School Studio / Netflix Games) — diseño de personaje
- Sprites por **Kevin Jean-Philippe (KJP)** — [ArtStation](https://kjp.artstation.com/projects/lG8LDk)
- Construido con cariño y *plong-plongs* por Isi & Gayle.

---

*we are throng. we are eternal.*
