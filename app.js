/* ===============================================
   THRONG-WALLET // app.js (v1.1)
   ─────────────────────────────────────────────
   Cambios sobre v1.0:
   - PWA (registro de service worker en index.html)
   - Papas custom (state.papas dinámico, max 6, 6 color-slots)
   - Fecha editable por gasto
   - Reparto por gasto (50/50, 100% Isi, 100% Gayle)
   - Liquidación entre tutores (settlement transactions)
   - Autocomplete del concepto + búsqueda en histórico
   - Responsive (gestionado en CSS)
   =============================================== */


/* ============================================
   1. CONSTANTS & DEFAULTS
   ============================================ */
const TUTORS = ['Isi', 'Gayle'];
const STORAGE_KEY = 'throngwallet-v0.2';
const BACKUP_KEY  = 'throngwallet-backup-v1';

const AVAILABLE_SPRITES = [
  { key: 'A_think',     file: 'sprites/A_think.gif',     label: 'Pensando' },
  { key: 'A_explain',   file: 'sprites/A_explain.gif',   label: 'Explica' },
  { key: 'A_happy',     file: 'sprites/A_happy.gif',     label: 'Feliz' },
  { key: 'A_skeptical', file: 'sprites/A_skeptical.gif', label: 'Escéptico' },
  { key: 'A_talk',      file: 'sprites/A_talk.gif',      label: 'Habla A' },
  { key: 'C_talk',      file: 'sprites/C_talk.gif',      label: 'Habla C' },
  { key: 'D_talk',      file: 'sprites/D_talk.gif',      label: 'Habla D' }
];
const SPRITES = AVAILABLE_SPRITES.reduce((o, s) => (o[s.key] = s.file, o), {});

/* 6 color-slots / razas de Thronglet — cada una con timbre y nota propios */
const COLOR_SLOTS = {
  't-rosa':  { color: '#ff6ec7', voice: 'sine',     base: 520, vibrato: 8,  octave: 5  },
  't-menta': { color: '#7df9aa', voice: 'triangle', base: 340, vibrato: 5,  octave: 0  },
  't-lila':  { color: '#c89cff', voice: 'square',   base: 720, vibrato: 12, octave: 10 },
  't-coral': { color: '#ff8866', voice: 'sawtooth', base: 460, vibrato: 10, octave: 3  },
  't-aqua':  { color: '#66ddff', voice: 'sine',     base: 380, vibrato: 7,  octave: 7  },
  't-oliva': { color: '#ccdd66', voice: 'triangle', base: 280, vibrato: 6,  octave: 2  }
};
const COLOR_SLOT_ORDER = ['t-rosa', 't-menta', 't-lila', 't-coral', 't-aqua', 't-oliva'];
const MAX_PAPAS = 6;

const DEFAULT_PAPAS = [
  { id: 'ocio',   name: 'OCIO',   cls: 't-rosa',  budget: 200, sprite: 'A_happy' },
  { id: 'super',  name: 'SUPER',  cls: 't-menta', budget: 400, sprite: 'A_think' },
  { id: 'suscri', name: 'SUSCRI', cls: 't-lila',  budget: 80,  sprite: 'A_explain' }
];

const ANIM_STATES = {
  think:     { sprite: 'A_think',     duration: 3500, weight: 9, mobility: 0.35 },
  explain:   { sprite: 'A_explain',   duration: 2200, weight: 4, mobility: 0.5  },
  happy:     { sprite: 'A_happy',     duration: 2800, weight: 5, mobility: 0.6  },
  skeptical: { sprite: 'A_skeptical', duration: 2400, weight: 2, mobility: 0.25 },
  talkA:     { sprite: 'A_talk',      duration: 2000, weight: 3, mobility: 0.3  },
  talkC:     { sprite: 'C_talk',      duration: 2000, weight: 3, mobility: 0.3  },
  talkD:     { sprite: 'D_talk',      duration: 2000, weight: 3, mobility: 0.3  }
};
const ANIM_TOTAL_WEIGHT = Object.values(ANIM_STATES).reduce((s,a)=>s+a.weight,0);

const DEFAULT_SETTINGS = {
  splitModel: 'half',
  masterVolume: 0.6,
  worldChatter: 'normal',
  lang: 'es'
};

/* ============================================
   1b. i18n (LOCALES, t() helper)
   ============================================ */
const LOCALES = {
  es: {
    'tab.colony': 'COLONIA', 'tab.world': 'MUNDO', 'tab.stats': 'STATS', 'tab.settings': 'AJUSTES',
    'boot.hint': '[ toca cualquier sitio para entrar ]',
    'boot.line.industries': 'THRONGNET INDUSTRIES (c) 1994-26',
    'boot.line.init': '> initializing colony...........[OK]',
    'boot.line.wallets': '> binding wallets to tutors.....[OK]',
    'boot.line.lang': '> loading throng-tongue.........[OK]',
    'boot.line.crt': '> calibrating CRT phosphor......[OK]',
    'boot.line.awaken': '> awakening thronglets..........',
    'boot.line.we_are': '   krii-mok! plong-plong! we are throng.',
    'boot.line.ready': '> system ready.',
    'hud.cycle': 'CICLO', 'hud.spent': 'GASTADO', 'hud.born': 'NACIDOS',
    'cloud.local': '☁️ LOCAL', 'cloud.live': '☁️ EN VIVO', 'cloud.connecting': '☁️ ...', 'cloud.error': '☁️ ERROR',
    'save.now': 'ahora', 'save.no_changes': 'sin cambios',
    'deudas.balance': 'BALANCE', 'deudas.by_split': 'POR REPARTO', 'deudas.gross': 'DIFERENCIA BRUTA',
    'deudas.balanced': '⚖ EN EQUILIBRIO', 'deudas.owes': '{from} ⇒ {to}: {amount} €', 'deudas.settle': '💸 LIQUIDAR',
    'feed.papa': 'PAPA', 'feed.tutor': 'TUTOR', 'feed.amount': '€', 'feed.date': 'FECHA', 'feed.split': 'REPARTO', 'feed.feed': 'ALIMENTAR',
    'feed.sheet_title': 'NUEVO GASTO',
    'feed.concept_placeholder': 'concepto (cena indio, netflix...)',
    'feed.split.5050': '50 / 50', 'feed.split.100isi': '100% ISI', 'feed.split.100gayle': '100% GAYLE',
    'world.title_prefix': 'MUNDO · ', 'world.today': 'HOY', 'world.history': '📜 HISTÓRICO',
    'world.empty': 'esta luna aún no ha visto Thronglets',
    'world.empty_hint': 've a la COLONIA y aliméntalos',
    'world.legend_recurring': '♺ SUSCRI = recurrente',
    'world.legend_tip': 'clica para oír · cuando chocan cantan',
    'history.title_prefix': 'HISTÓRICO · ', 'history.search_placeholder': 'buscar concepto...',
    'history.filter.all': 'TODOS', 'history.filter.settlement': 'LIQUID.',
    'history.empty': 'Sin Thronglets en esta selección.',
    'history.total_isi': 'ISI', 'history.total_gayle': 'GAYLE', 'history.total_all': 'TOTAL',
    'stats.title': 'ANÁLISIS THRONG', 'stats.accumulated': 'ACUMULADO', 'stats.since_dawn': 'desde el inicio de los tiempos',
    'stats.monthly_avg': 'MEDIA MENSUAL', 'stats.period': '— período —',
    'stats.last_n_months': 'últimos {n} meses (con recurrentes)',
    'stats.max_month': 'MES MÁS CARO', 'stats.living_throngs': 'THRONGS VIVOS', 'stats.recurring_count': '{n} recurrentes',
    'stats.spend_per_month': 'GASTO POR MES (últimos 12)',
    'stats.by_papa': 'REPARTO POR PAPA', 'stats.by_tutor': 'REPARTO POR TUTOR',
    'stats.top5': 'TOP 5 GASTOS MÁS CAROS',
    'stats.no_data': 'Aún no hay datos. Alimenta a tus Throngs.',
    'stats.no_expenses': 'Sin gastos aún.',
    'settings.title': 'AJUSTES THRONG', 'settings.papas': 'PAPA-THRONGS',
    'settings.papas_hint': 'Renombra, edita presupuesto y sprite. Crea nuevos Papas (máx 6). Si un Papa pasa su límite, los hijos que nazcan vendrán enfermos.',
    'settings.add_papa': '+ AÑADIR PAPA', 'settings.max_reached': 'MÁXIMO ALCANZADO ({n})',
    'settings.debt_model': 'MODELO DE DEUDA',
    'settings.debt_hint': 'Por defecto, cada gasto se reparte como tú elijas (50/50, solo Isi, solo Gayle) — esto se calcula globalmente con el modelo que escojas aquí:',
    'settings.split_half_title': 'Reparto 50/50', 'settings.split_half_desc': '— la mitad de la diferencia.',
    'settings.split_half_ex': 'Ejemplo: Isi 500 / Gayle 300 → Gayle debe 100.',
    'settings.split_diff_title': 'Diferencia bruta', 'settings.split_diff_desc': '— lo aportado de más.',
    'settings.split_diff_ex': 'Ejemplo: Isi 500 / Gayle 300 → Gayle debe 200.',
    'settings.volume': 'VOLUMEN THRONG', 'settings.volume_hint': 'Cuánto chillan los Thronglets de fondo.',
    'settings.master_vol': 'VOL. MAESTRO', 'settings.world_chatter': 'MUNDO',
    'chatter.quiet': 'Tranquilo', 'chatter.normal': 'Normal', 'chatter.party': 'Fiesta Throng',
    'settings.cloud': '☁️ SINCRONIZACIÓN NUBE',
    'settings.cloud_hint': 'Cuando se conecta, los gastos y cambios se ven en vivo en cualquier dispositivo conectado al mismo hogar. Sigue funcionando offline; al volver online sincroniza.',
    'settings.status': 'Estado:',
    'cloud.status.disconnected': '○ Desconectado (solo local)',
    'cloud.status.connecting': '⏳ Conectando...',
    'cloud.status.connected': '✓ Conectado en vivo (cambios se ven en ambos)',
    'cloud.status.error': '✗ Error: {msg}',
    'cloud.url': 'URL', 'cloud.anon_key': 'ANON KEY', 'cloud.household_id': 'HOUSEHOLD ID',
    'cloud.connect': '🔌 CONECTAR', 'cloud.connected_btn': '✓ CONECTADO',
    'cloud.invite': '📋 COPIAR URL INVITACIÓN', 'cloud.disconnect': 'DESCONECTAR',
    'cloud.guide': '📖 Guía paso a paso: abre <b>CLOUD_SETUP.md</b> en la carpeta del proyecto. Mientras no esté conectado, todo funciona en local con localStorage.',
    'settings.backup': '📦 COPIA DE SEGURIDAD LOCAL',
    'settings.backup_hint': 'Aunque tengas la nube activa, exporta de vez en cuando un JSON por si acaso.',
    'settings.export': '⬇ EXPORTAR JSON', 'settings.import': '⬆ IMPORTAR JSON',
    'settings.last_backup': 'Última copia local:',
    'settings.install': '📲 INSTALAR COMO APP',
    'settings.install_hint': 'En Chrome/Edge móvil: menú · "Añadir a pantalla de inicio". En Safari iOS: compartir · "Añadir a inicio". En PC: icono de instalación en la barra de direcciones. Funciona offline.',
    'settings.sacrifice_zone': 'ZONA SACRIFICIO',
    'settings.sacrifice_hint': 'Aquí mueren los Thronglets. No se puede deshacer.',
    'settings.sacrifice_month': 'SACRIFICAR ESTE MES', 'settings.sacrifice_all': 'SACRIFICAR TODA LA COLONIA',
    'settings.save_btn': '💾 GUARDAR AJUSTES',
    'settings.language': 'IDIOMA',
    'settings.language_hint': 'Cambia el idioma de la interfaz.',
    'settings.force_refresh': '🔄 FORZAR ACTUALIZACIÓN',
    'settings.force_refresh_hint': 'Si la app no carga los últimos cambios después de actualizar, pulsa esto: limpia caché y service worker, luego recarga.',
    'confirm.force_refresh': 'Esto limpiará la caché y el service worker. La app se recargará. ¿Continuar?',
    'install.title': '📲 INSTALA THRONG-WALLET',
    'install.intro': 'Para la mejor experiencia, instala la app en tu dispositivo. Es gratis y solo tarda 5 segundos.',
    'install.benefit_1': '✓ Icono propio en pantalla de inicio',
    'install.benefit_2': '✓ Sin barra de navegador (a pantalla completa)',
    'install.benefit_3': '✓ Funciona sin internet (offline)',
    'install.benefit_4': '✓ Carga más rápido (cachéa todo)',
    'install.ios_steps': 'En iPhone:<br>1. Toca el botón <b>Compartir</b> ⬆️<br>2. Elige <b>"Añadir a pantalla de inicio"</b><br>3. Toca <b>"Añadir"</b>',
    'install.android_hint': 'Pulsa el botón INSTALAR y confirma en el diálogo que aparece.',
    'install.desktop_hint': 'Pulsa INSTALAR para añadirla como app en tu PC.',
    'install.now': 'INSTALAR AHORA',
    'install.later': 'MÁS TARDE',
    'install.got_it': 'ENTENDIDO',
    'modal.edit_title': 'EDITAR THRONGLET', 'modal.description': 'Concepto', 'modal.amount': 'Importe (€)',
    'modal.date': 'Fecha', 'modal.papa': 'Papa', 'modal.paying_tutor': 'Tutor pagador', 'modal.split': 'Reparto',
    'modal.cancel': 'CANCELAR', 'modal.save': 'GUARDAR',
    'modal.papa_title': 'PAPA THRONG', 'modal.papa_edit_title': 'EDITAR · {name}', 'modal.papa_new_title': 'NUEVO PAPA',
    'modal.name': 'Nombre', 'modal.budget': 'Presupuesto mensual (€)',
    'modal.color': 'Color / raza', 'modal.sprite': 'Sprite', 'modal.delete': 'BORRAR',
    'modal.settle_title': '💸 LIQUIDAR DEUDA',
    'modal.settle_hint': 'Registra que uno le ha pagado al otro (Bizum, efectivo, etc.). Reduce el balance directamente, no es un gasto.',
    'modal.direction': 'Dirección',
    'modal.gayle_to_isi': 'GAYLE → ISI', 'modal.isi_to_gayle': 'ISI → GAYLE',
    'modal.note_optional': 'Nota (opcional)', 'modal.note_placeholder': 'Bizum, efectivo, ...',
    'modal.register': 'REGISTRAR',
    'speech.return_to_papa': '↩ DEVOLVER AL PAPA',
    'month.0': 'ENERO', 'month.1': 'FEBRERO', 'month.2': 'MARZO', 'month.3': 'ABRIL', 'month.4': 'MAYO', 'month.5': 'JUNIO',
    'month.6': 'JULIO', 'month.7': 'AGOSTO', 'month.8': 'SEPTIEMBRE', 'month.9': 'OCTUBRE', 'month.10': 'NOVIEMBRE', 'month.11': 'DICIEMBRE',
    'confirm.delete_papa': '¿Borrar este Papa? No podrá deshacerse.',
    'alert.cannot_delete_papa': 'No puedes borrar un Papa con Thronglets vivos.',
    'confirm.wipe_all_1': 'Esto borrará TODOS los Thronglets de TODOS los meses. ¿Seguro?',
    'confirm.wipe_all_2': 'De verdad de verdad. ¿Sacrificarlos a todos?',
    'confirm.wipe_month': '¿Sacrificar todos los Thronglets de {month}?',
    'confirm.import': '¿Reemplazar tus datos ({local} thronglets) por los importados ({remote})?',
    'confirm.return_papa': 'Devolver al papa',
    'confirm.cancel_sub': 'Cancelar suscripción',
    'confirm.action_question': '{verb} "{name}"?',
    'confirm.delete_settlement': '¿Borrar esta liquidación?',
    'alert.invalid_data': 'Datos inválidos.',
    'alert.papa_needs_name': 'El Papa necesita un nombre.',
    'alert.max_papas': 'Máximo {n} Papas.',
    'alert.invalid_amount': 'Importe inválido.',
    'alert.import_error': 'Error al importar: {msg}',
    'alert.save_failed': 'No se pudo guardar (memoria local llena). Exporta una copia y libera espacio.',
    'alert.connect_missing': 'Pega la URL y la anon key de tu proyecto Supabase.',
    'confirm.disconnect_cloud': '¿Desconectar la sincronización? Los datos seguirán localmente.',
    'alert.post_import_cloud': 'Aviso: la importación local funcionó, pero hubo un problema subiendo todo a la nube. Prueba a desconectar/reconectar.',
    'tutor.short.isi': 'ISI', 'tutor.short.gayle': 'GAY',
    'sticker.sick': '(enfermo de nacimiento)',
    'speak.recurring_since': ' · Recurro desde {month}',
    'speak.brought_on': '{tutor} me trajo el {date} · {amount} € · reparto {split}',
    'speak.story_concept': '«{name}» — nací de {papa}{sick}.',
    'speak.no_papa': 'Elige un Papa primero.',
    'speak.no_name': 'Dale un nombre, tutor.',
    'speak.no_amount': '¿Cuántos óbolos?',
    'speak.coming_home': 'Vuelvo a casa, tutor.',
    'speak.settings_saved': 'Ajustes grabados, tutor.',
    'speak.papa_updated': 'Papa actualizado.',
    'speak.papa_new': 'Nuevo Papa en la colonia.',
    'speak.thronglet_modified': 'Thronglet modificado.',
    'speak.settlement_done': '{from} pagó {amount}€ a {to}.',
    'speak.cloud_connected': 'Conectado a la nube. Comparte la URL con Gayle.',
    'speak.cloud_disconnected': 'Sincronización desactivada.',
    'speak.imported_synced': 'Datos importados sincronizados a la nube.',
    'speak.copy_exported': 'Copia exportada. Guárdala bien.',
    'speak.thronglets_awakened': '{n} thronglets despertados.',
    'speak.url_copied': 'URL copiada. Mándasela a Gayle.',
    'pwa.sw_active': 'Service Worker activo · funciona offline ✓',
    'pwa.sw_failed': 'SW no se registró (¿abierto con file://?): {msg}',
    'pwa.dash': '—'
  },
  en: {
    'tab.colony': 'COLONY', 'tab.world': 'WORLD', 'tab.stats': 'STATS', 'tab.settings': 'SETTINGS',
    'boot.hint': '[ tap anywhere to enter ]',
    'boot.line.industries': 'THRONGNET INDUSTRIES (c) 1994-26',
    'boot.line.init': '> initializing colony...........[OK]',
    'boot.line.wallets': '> binding wallets to tutors.....[OK]',
    'boot.line.lang': '> loading throng-tongue.........[OK]',
    'boot.line.crt': '> calibrating CRT phosphor......[OK]',
    'boot.line.awaken': '> awakening thronglets..........',
    'boot.line.we_are': '   krii-mok! plong-plong! we are throng.',
    'boot.line.ready': '> system ready.',
    'hud.cycle': 'CYCLE', 'hud.spent': 'SPENT', 'hud.born': 'BORN',
    'cloud.local': '☁️ LOCAL', 'cloud.live': '☁️ LIVE', 'cloud.connecting': '☁️ ...', 'cloud.error': '☁️ ERROR',
    'save.now': 'now', 'save.no_changes': 'no changes',
    'deudas.balance': 'BALANCE', 'deudas.by_split': 'BY SPLIT', 'deudas.gross': 'GROSS DIFFERENCE',
    'deudas.balanced': '⚖ BALANCED', 'deudas.owes': '{from} ⇒ {to}: €{amount}', 'deudas.settle': '💸 SETTLE',
    'feed.papa': 'PAPA', 'feed.tutor': 'TUTOR', 'feed.amount': '€', 'feed.date': 'DATE', 'feed.split': 'SPLIT', 'feed.feed': 'FEED',
    'feed.sheet_title': 'NEW EXPENSE',
    'feed.concept_placeholder': 'description (taco tuesday, netflix...)',
    'feed.split.5050': '50 / 50', 'feed.split.100isi': '100% ISI', 'feed.split.100gayle': '100% GAYLE',
    'world.title_prefix': 'WORLD · ', 'world.today': 'TODAY', 'world.history': '📜 HISTORY',
    'world.empty': "this moon hasn't seen Thronglets yet",
    'world.empty_hint': 'go to COLONY and feed them',
    'world.legend_recurring': '♺ SUSCRI = recurring',
    'world.legend_tip': 'click to hear · they sing when they collide',
    'history.title_prefix': 'HISTORY · ', 'history.search_placeholder': 'search...',
    'history.filter.all': 'ALL', 'history.filter.settlement': 'SETTLE',
    'history.empty': 'No Thronglets in this selection.',
    'history.total_isi': 'ISI', 'history.total_gayle': 'GAYLE', 'history.total_all': 'TOTAL',
    'stats.title': 'THRONG ANALYTICS', 'stats.accumulated': 'TOTAL', 'stats.since_dawn': 'since the dawn of time',
    'stats.monthly_avg': 'MONTHLY AVG', 'stats.period': '— period —',
    'stats.last_n_months': 'last {n} months (incl. recurring)',
    'stats.max_month': 'PRICIEST MONTH', 'stats.living_throngs': 'LIVING THRONGS', 'stats.recurring_count': '{n} recurring',
    'stats.spend_per_month': 'SPEND PER MONTH (last 12)',
    'stats.by_papa': 'BY PAPA', 'stats.by_tutor': 'BY TUTOR',
    'stats.top5': 'TOP 5 PRICIEST EXPENSES',
    'stats.no_data': 'No data yet. Feed your Throngs.',
    'stats.no_expenses': 'No expenses yet.',
    'settings.title': 'THRONG SETTINGS', 'settings.papas': 'PAPA-THRONGS',
    'settings.papas_hint': 'Rename, edit budget and sprite. Create new Papas (max 6). If a Papa exceeds its limit, its children will be born sick.',
    'settings.add_papa': '+ ADD PAPA', 'settings.max_reached': 'MAX REACHED ({n})',
    'settings.debt_model': 'DEBT MODEL',
    'settings.debt_hint': 'By default, each expense splits as you choose (50/50, only Isi, only Gayle) — this is calculated globally with the model you pick here:',
    'settings.split_half_title': '50/50 Split', 'settings.split_half_desc': '— half the difference.',
    'settings.split_half_ex': 'Example: Isi 500 / Gayle 300 → Gayle owes 100.',
    'settings.split_diff_title': 'Gross difference', 'settings.split_diff_desc': '— what was contributed extra.',
    'settings.split_diff_ex': 'Example: Isi 500 / Gayle 300 → Gayle owes 200.',
    'settings.volume': 'THRONG VOLUME', 'settings.volume_hint': 'How loud the background Thronglets squeak.',
    'settings.master_vol': 'MASTER VOL.', 'settings.world_chatter': 'WORLD',
    'chatter.quiet': 'Quiet', 'chatter.normal': 'Normal', 'chatter.party': 'Throng Party',
    'settings.cloud': '☁️ CLOUD SYNC',
    'settings.cloud_hint': 'When connected, expenses and changes are seen live on any device connected to the same household. Still works offline; syncs when back online.',
    'settings.status': 'Status:',
    'cloud.status.disconnected': '○ Disconnected (local only)',
    'cloud.status.connecting': '⏳ Connecting...',
    'cloud.status.connected': '✓ Live connected (changes visible on both)',
    'cloud.status.error': '✗ Error: {msg}',
    'cloud.url': 'URL', 'cloud.anon_key': 'ANON KEY', 'cloud.household_id': 'HOUSEHOLD ID',
    'cloud.connect': '🔌 CONNECT', 'cloud.connected_btn': '✓ CONNECTED',
    'cloud.invite': '📋 COPY INVITE URL', 'cloud.disconnect': 'DISCONNECT',
    'cloud.guide': '📖 Step-by-step guide: open <b>CLOUD_SETUP.md</b> in the project folder. While not connected, everything works locally with localStorage.',
    'settings.backup': '📦 LOCAL BACKUP',
    'settings.backup_hint': 'Even with cloud sync, export a JSON every now and then just in case.',
    'settings.export': '⬇ EXPORT JSON', 'settings.import': '⬆ IMPORT JSON',
    'settings.last_backup': 'Last local backup:',
    'settings.install': '📲 INSTALL AS APP',
    'settings.install_hint': 'In mobile Chrome/Edge: menu · "Add to home screen". In Safari iOS: share · "Add to home". On PC: install icon in the address bar. Works offline.',
    'settings.sacrifice_zone': 'SACRIFICE ZONE',
    'settings.sacrifice_hint': 'Here Thronglets die. Cannot be undone.',
    'settings.sacrifice_month': 'SACRIFICE THIS MONTH', 'settings.sacrifice_all': 'SACRIFICE WHOLE COLONY',
    'settings.save_btn': '💾 SAVE SETTINGS',
    'settings.language': 'LANGUAGE',
    'settings.language_hint': 'Change interface language.',
    'settings.force_refresh': '🔄 FORCE UPDATE',
    'settings.force_refresh_hint': "If the app isn't loading the latest changes after a deploy, press this: clears cache and service worker, then reloads.",
    'confirm.force_refresh': 'This will clear cache and service worker. The app will reload. Continue?',
    'install.title': '📲 INSTALL THRONG-WALLET',
    'install.intro': 'For the best experience, install the app on your device. Free and takes 5 seconds.',
    'install.benefit_1': '✓ Own icon on home screen',
    'install.benefit_2': '✓ No browser bar (full screen)',
    'install.benefit_3': '✓ Works offline (no internet)',
    'install.benefit_4': '✓ Loads faster (caches everything)',
    'install.ios_steps': 'On iPhone:<br>1. Tap the <b>Share</b> button ⬆️<br>2. Choose <b>"Add to Home Screen"</b><br>3. Tap <b>"Add"</b>',
    'install.android_hint': 'Tap INSTALL and confirm in the dialog that appears.',
    'install.desktop_hint': 'Tap INSTALL to add it as an app on your PC.',
    'install.now': 'INSTALL NOW',
    'install.later': 'LATER',
    'install.got_it': 'GOT IT',
    'modal.edit_title': 'EDIT THRONGLET', 'modal.description': 'Description', 'modal.amount': 'Amount (€)',
    'modal.date': 'Date', 'modal.papa': 'Papa', 'modal.paying_tutor': 'Paying tutor', 'modal.split': 'Split',
    'modal.cancel': 'CANCEL', 'modal.save': 'SAVE',
    'modal.papa_title': 'PAPA THRONG', 'modal.papa_edit_title': 'EDIT · {name}', 'modal.papa_new_title': 'NEW PAPA',
    'modal.name': 'Name', 'modal.budget': 'Monthly budget (€)',
    'modal.color': 'Color / race', 'modal.sprite': 'Sprite', 'modal.delete': 'DELETE',
    'modal.settle_title': '💸 SETTLE DEBT',
    'modal.settle_hint': "Record that one paid the other (Bizum, cash, etc.). Reduces the balance directly, it's not an expense.",
    'modal.direction': 'Direction',
    'modal.gayle_to_isi': 'GAYLE → ISI', 'modal.isi_to_gayle': 'ISI → GAYLE',
    'modal.note_optional': 'Note (optional)', 'modal.note_placeholder': 'Bizum, cash, ...',
    'modal.register': 'REGISTER',
    'speech.return_to_papa': '↩ RETURN TO PAPA',
    'month.0': 'JANUARY', 'month.1': 'FEBRUARY', 'month.2': 'MARCH', 'month.3': 'APRIL', 'month.4': 'MAY', 'month.5': 'JUNE',
    'month.6': 'JULY', 'month.7': 'AUGUST', 'month.8': 'SEPTEMBER', 'month.9': 'OCTOBER', 'month.10': 'NOVEMBER', 'month.11': 'DECEMBER',
    'confirm.delete_papa': 'Delete this Papa? Cannot be undone.',
    'alert.cannot_delete_papa': 'Cannot delete a Papa with living Thronglets.',
    'confirm.wipe_all_1': 'This will delete ALL Thronglets from ALL months. Sure?',
    'confirm.wipe_all_2': 'Really really. Sacrifice them all?',
    'confirm.wipe_month': 'Sacrifice all Thronglets in {month}?',
    'confirm.import': 'Replace your data ({local} thronglets) with the imported ones ({remote})?',
    'confirm.return_papa': 'Return to papa',
    'confirm.cancel_sub': 'Cancel subscription',
    'confirm.action_question': '{verb} "{name}"?',
    'confirm.delete_settlement': 'Delete this settlement?',
    'alert.invalid_data': 'Invalid data.',
    'alert.papa_needs_name': 'The Papa needs a name.',
    'alert.max_papas': 'Max {n} Papas.',
    'alert.invalid_amount': 'Invalid amount.',
    'alert.import_error': 'Import error: {msg}',
    'alert.save_failed': 'Could not save (local memory full). Export a copy and free up space.',
    'alert.connect_missing': 'Paste the URL and anon key of your Supabase project.',
    'confirm.disconnect_cloud': 'Disconnect sync? Data stays locally.',
    'alert.post_import_cloud': 'Notice: local import worked, but there was an issue uploading to cloud. Try disconnect/reconnect.',
    'tutor.short.isi': 'ISI', 'tutor.short.gayle': 'GAY',
    'sticker.sick': '(born sick)',
    'speak.recurring_since': ' · Recurring since {month}',
    'speak.brought_on': '{tutor} brought me on {date} · €{amount} · split {split}',
    'speak.story_concept': '«{name}» — born of {papa}{sick}.',
    'speak.no_papa': 'Pick a Papa first.',
    'speak.no_name': 'Give it a name, tutor.',
    'speak.no_amount': 'How many coins?',
    'speak.coming_home': "Coming home, tutor.",
    'speak.settings_saved': 'Settings saved, tutor.',
    'speak.papa_updated': 'Papa updated.',
    'speak.papa_new': 'New Papa in the colony.',
    'speak.thronglet_modified': 'Thronglet modified.',
    'speak.settlement_done': '{from} paid €{amount} to {to}.',
    'speak.cloud_connected': 'Connected to cloud. Share the URL with Gayle.',
    'speak.cloud_disconnected': 'Sync deactivated.',
    'speak.imported_synced': 'Imported data synced to cloud.',
    'speak.copy_exported': 'Copy exported. Keep it safe.',
    'speak.thronglets_awakened': '{n} thronglets awakened.',
    'speak.url_copied': 'URL copied. Send it to Gayle.',
    'pwa.sw_active': 'Service Worker active · works offline ✓',
    'pwa.sw_failed': "SW didn't register (opened with file://?): {msg}",
    'pwa.dash': '—'
  }
};

function currentLang() {
  return (state?.settings?.lang === 'en') ? 'en' : 'es';
}
function t(key, vars) {
  const lang = currentLang();
  let s = (LOCALES[lang] && LOCALES[lang][key]) || (LOCALES.es[key]) || key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
window.__t = t;
function timeAgo(seconds) {
  if (seconds < 5) return t('save.now');
  let v;
  if (seconds < 60) v = seconds + 's';
  else if (seconds < 3600) v = Math.floor(seconds/60) + 'm';
  else v = Math.floor(seconds/3600) + 'h';
  return currentLang() === 'es' ? 'hace ' + v : v + ' ago';
}
function setLanguage(lang) {
  if (lang !== 'es' && lang !== 'en') return;
  state.settings.lang = lang;
  save();
  cloudPushSettings && cloudPushSettings();
  applyTranslations();
  // re-render everything dependent on language
  if (typeof rebuildPapaUI === 'function') rebuildPapaUI();
  if (typeof renderColony === 'function') renderColony();
  if (typeof renderDeudas === 'function') renderDeudas();
  if (typeof populateSettings === 'function') populateSettings();
  if (currentView === 'world' && typeof renderWorld === 'function') renderWorld();
  if (currentView === 'stats' && typeof renderStats === 'function') renderStats();
  const histPanel = document.getElementById('historyPanel');
  if (histPanel && histPanel.classList.contains('show')) {
    if (typeof buildHistoryFilters === 'function') buildHistoryFilters();
    if (typeof renderHistory === 'function') renderHistory();
  }
  // update PWA status text if visible
  const pwaEl = document.getElementById('pwaStatus');
  if (pwaEl && pwaEl.textContent !== '—') {
    // try to retranslate using whatever message style fits
    if (pwaEl.textContent.includes('offline')) pwaEl.textContent = t('pwa.sw_active');
  }
  // mark active button
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  updateSaveLabel();
}
function applyTranslations() {
  document.documentElement.lang = currentLang();
  // Replace text content for elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.hasAttribute('data-i18n-html')) el.innerHTML = t(key);
    else el.textContent = t(key);
  });
  // Replace placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
  // Replace title attribute
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
  });
}


/* ============================================
   2. STATE + PERSISTENCE
   ============================================ */
function migrate(data) {
  if (!data || typeof data !== 'object') return null;
  if (!Array.isArray(data.expenses)) data.expenses = [];
  if (!data.settings) data.settings = {};
  // migrate old settings.budgets to per-papa budgets
  const oldBudgets = data.settings.budgets || {};
  // Build papas from state or defaults
  if (!Array.isArray(data.papas)) {
    data.papas = JSON.parse(JSON.stringify(DEFAULT_PAPAS));
    // apply old budgets if present
    for (const p of data.papas) {
      if (oldBudgets[p.id] !== undefined) p.budget = oldBudgets[p.id];
    }
  }
  // strip old budgets field
  delete data.settings.budgets;
  data.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
  // Migrate expenses: ensure bornSick + split fields
  for (const e of data.expenses) {
    if (typeof e.bornSick === 'undefined') e.bornSick = false;
    if (!e.split) e.split = { isi: 0.5, gayle: 0.5 };
    if (!e.type) e.type = (e.papaId === 'settlement') ? 'settlement' : 'expense';
  }
  return data;
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const m = migrate(JSON.parse(raw)); if (m) return m; }
  } catch (e) { console.warn('main load failed', e); }
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (raw) {
      const wrap = JSON.parse(raw);
      const m = migrate(wrap.data);
      if (m) { console.info('recovered from backup', wrap.savedAt); return m; }
    }
  } catch (e) { console.warn('backup load failed', e); }
  return null;
}
let lastSavedAt = 0;
function save() {
  const json = JSON.stringify(state);
  try {
    localStorage.setItem(STORAGE_KEY, json);
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ data: state, savedAt: Date.now() }));
    lastSavedAt = Date.now();
    pulseSaveIndicator();
  } catch (e) {
    console.warn('save failed', e);
    alert(t('alert.save_failed'));
  }
}
function pulseSaveIndicator() {
  const el = document.getElementById('saveIndicator');
  if (!el) return;
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
  updateSaveLabel();
}
function updateSaveLabel() {
  const lbl = document.getElementById('saveLabel');
  if (!lbl) return;
  if (!lastSavedAt) { lbl.textContent = t('save.no_changes'); return; }
  const s = Math.floor((Date.now() - lastSavedAt) / 1000);
  lbl.textContent = timeAgo(s);
  const bi = document.getElementById('backupInfo');
  if (bi) bi.textContent = t('settings.last_backup') + ' ' + (lastSavedAt ? new Date(lastSavedAt).toLocaleString() : t('pwa.dash'));
}

let state = load() || {
  expenses: [],
  papas: JSON.parse(JSON.stringify(DEFAULT_PAPAS)),
  settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
};

let selectedPapa = null;
let selectedTutor = 'Isi';
let selectedSplit = '50/50';
let currentView = 'colony';
let worldMonthKey = monthKey(new Date());
let historyFilter = { type: 'all', val: 'all' };
let historySearch = '';


/* ============================================
   3. PAPA HELPERS
   ============================================ */
function getPapaById(id) {
  return state.papas.find(p => p.id === id);
}
function getPapaVoice(papaId) {
  const p = getPapaById(papaId);
  if (!p) return COLOR_SLOTS['t-rosa'];
  return COLOR_SLOTS[p.cls] || COLOR_SLOTS['t-rosa'];
}
function getAvailableColorSlots(excludeId) {
  const taken = new Set(state.papas.filter(p => p.id !== excludeId).map(p => p.cls));
  return COLOR_SLOT_ORDER.filter(cls => !taken.has(cls));
}
function papaHasExpenses(papaId) {
  return state.expenses.some(e => e.papaId === papaId);
}


/* ============================================
   4. MONTH / EXPENSE HELPERS
   ============================================ */
function monthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return t('month.' + (m - 1)) + ' ' + y;
}
function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}
function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function todayYMD() { return ymd(new Date()); }

/* Real expenses (not settlements) for a month, with recurring SUSCRI */
function expensesForMonth(key) {
  return state.expenses.filter(e => {
    if (e.type === 'settlement') return false;
    const eMonth = monthKey(new Date(e.timestamp));
    if (e.papaId === 'suscri') return eMonth <= key;
    return eMonth === key;
  });
}
function settlementsForMonth(key) {
  return state.expenses.filter(e => e.type === 'settlement' && monthKey(new Date(e.timestamp)) === key);
}
function isRecurringInstance(expense, viewKey) {
  return expense.papaId === 'suscri' && monthKey(new Date(expense.timestamp)) !== viewKey;
}
function fmt(n) { return n.toFixed(2).replace('.', ','); }
function splitObj(splitKey) {
  if (splitKey === '100isi')   return { isi: 1.0, gayle: 0.0 };
  if (splitKey === '100gayle') return { isi: 0.0, gayle: 1.0 };
  return { isi: 0.5, gayle: 0.5 };
}
function splitLabel(s) {
  if (!s) return '50/50';
  if (s.isi === 1.0) return '100% I';
  if (s.gayle === 1.0) return '100% G';
  return '50/50';
}
function splitKey(s) {
  if (!s) return '50/50';
  if (s.isi === 1.0) return '100isi';
  if (s.gayle === 1.0) return '100gayle';
  return '50/50';
}


/* ============================================
   5. AUDIO ENGINE
   ============================================ */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audio = null;
let masterGain = null;
function ensureAudio() {
  if (!audio) {
    audio = new AudioCtx();
    masterGain = audio.createGain();
    masterGain.gain.value = state.settings.masterVolume;
    masterGain.connect(audio.destination);
  }
  if (audio.state === 'suspended') audio.resume();
  return audio;
}
function setMasterVolume(v) { if (masterGain) masterGain.gain.setTargetAtTime(v, audio.currentTime, 0.05); }
function out() { return masterGain || ensureAudio().destination; }
function env(g, t0, a, d, s, r, peak = 0.3) {
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.linearRampToValueAtTime(peak * s, t0 + a + d);
  g.gain.linearRampToValueAtTime(0, t0 + a + d + r);
}
function noiseBuffer(secs) {
  const ctx = ensureAudio();
  const len = Math.max(1, Math.floor(ctx.sampleRate * secs));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random()*2 - 1;
  return buf;
}
function coo(papaId, pitchShift = 1) {
  const ctx = ensureAudio(); const v = getPapaVoice(papaId); const t0 = ctx.currentTime;
  const osc = ctx.createOscillator(), lfo = ctx.createOscillator(), lfoGain = ctx.createGain(), gain = ctx.createGain();
  osc.type = v.voice;
  const base = v.base * pitchShift;
  osc.frequency.setValueAtTime(base, t0);
  osc.frequency.linearRampToValueAtTime(base * 1.3, t0 + 0.08);
  osc.frequency.linearRampToValueAtTime(base * 0.95, t0 + 0.25);
  lfo.type = 'sine'; lfo.frequency.value = v.vibrato; lfoGain.gain.value = 20;
  lfo.connect(lfoGain).connect(osc.frequency);
  osc.connect(gain).connect(out());
  env(gain, t0, 0.02, 0.05, 0.6, 0.3, 0.16);
  osc.start(t0); lfo.start(t0); osc.stop(t0 + 0.6); lfo.stop(t0 + 0.6);
}
function chitter() {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  for (let i = 0; i < 6; i++) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'square'; osc.frequency.value = 800 + Math.random() * 600;
    osc.connect(gain).connect(out());
    env(gain, t0 + i*0.05, 0.005, 0.02, 0.3, 0.03, 0.06);
    osc.start(t0 + i*0.05); osc.stop(t0 + i*0.05 + 0.1);
  }
}
function modemDial() {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  [350,440,480,620,1100,1750,2100].forEach((f, i) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(f, t0 + i*0.1);
    osc.connect(gain).connect(out());
    env(gain, t0 + i*0.1, 0.01, 0.05, 0.7, 0.06, 0.12);
    osc.start(t0 + i*0.1); osc.stop(t0 + i*0.1 + 0.13);
  });
}
function alertCry() {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, t0); osc.frequency.linearRampToValueAtTime(200, t0 + 0.4);
  osc.connect(gain).connect(out());
  env(gain, t0, 0.01, 0.05, 0.6, 0.35, 0.22);
  osc.start(t0); osc.stop(t0 + 0.5);
}
function beep(freq = 1200) {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'square'; osc.frequency.value = freq;
  osc.connect(gain).connect(out());
  env(gain, t0, 0.005, 0.02, 0.4, 0.03, 0.08);
  osc.start(t0); osc.stop(t0 + 0.08);
}
function birthSound() {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, t0); osc.frequency.exponentialRampToValueAtTime(880, t0 + 0.4);
  osc.connect(gain).connect(out());
  env(gain, t0, 0.02, 0.05, 0.5, 0.35, 0.2);
  osc.start(t0); osc.stop(t0 + 0.5);
}
function burble() {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  for (let i = 0; i < 4; i++) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    const f = 180 + Math.random()*280;
    osc.frequency.setValueAtTime(f, t0 + i*0.07);
    osc.frequency.exponentialRampToValueAtTime(f * 1.5, t0 + i*0.07 + 0.06);
    osc.connect(gain).connect(out());
    env(gain, t0 + i*0.07, 0.005, 0.03, 0.5, 0.04, 0.15);
    osc.start(t0 + i*0.07); osc.stop(t0 + i*0.07 + 0.1);
  }
}
function giggle() {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580 + Math.random()*80, t0 + i*0.1);
    osc.frequency.linearRampToValueAtTime(900, t0 + i*0.1 + 0.06);
    osc.connect(gain).connect(out());
    env(gain, t0 + i*0.1, 0.005, 0.02, 0.4, 0.03, 0.15);
    osc.start(t0 + i*0.1); osc.stop(t0 + i*0.1 + 0.1);
  }
}
function chime() {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  [523, 659, 784, 1046].forEach((f, i) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = f;
    osc.connect(gain).connect(out());
    env(gain, t0 + i*0.12, 0.005, 0.3, 0, 0, 0.12);
    osc.start(t0 + i*0.12); osc.stop(t0 + i*0.12 + 0.4);
  });
}
function popBubble() {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(380, t0); osc.frequency.exponentialRampToValueAtTime(2000, t0 + 0.05);
  osc.connect(gain).connect(out());
  env(gain, t0, 0.001, 0.02, 0.3, 0.04, 0.18);
  osc.start(t0); osc.stop(t0 + 0.08);
}
function returnHomeSound() {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  [800, 600, 450, 300].forEach((f, i) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.value = f;
    osc.connect(gain).connect(out());
    env(gain, t0 + i*0.08, 0.005, 0.05, 0.5, 0.05, 0.18);
    osc.start(t0 + i*0.08); osc.stop(t0 + i*0.08 + 0.12);
  });
}
function glitch() {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  const waves = ['square','sawtooth','triangle'];
  for (let i = 0; i < 8; i++) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = waves[Math.floor(Math.random()*3)];
    osc.frequency.value = 200 + Math.random()*2200;
    osc.connect(gain).connect(out());
    env(gain, t0 + i*0.025, 0.001, 0.005, 0.4, 0.005, 0.13);
    osc.start(t0 + i*0.025); osc.stop(t0 + i*0.025 + 0.03);
  }
}
function sigh() {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(420, t0); osc.frequency.linearRampToValueAtTime(260, t0 + 0.6);
  osc.connect(gain).connect(out());
  env(gain, t0, 0.08, 0.1, 0.5, 0.4, 0.16);
  osc.start(t0); osc.stop(t0 + 0.7);
}
function hum() {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(320 + Math.random()*80, t0);
  osc.connect(gain).connect(out());
  env(gain, t0, 0.1, 0.1, 0.6, 0.4, 0.12);
  osc.start(t0); osc.stop(t0 + 0.7);
}

/* === MELODY === */
const PENTATONIC = [
  261.63, 293.66, 329.63, 392.00, 440.00,
  523.25, 587.33, 659.25, 783.99, 880.00,
  1046.50, 1174.66, 1318.51, 1567.98, 1760.00
];
function expenseToNote(expense) {
  let h = 0;
  for (let i = 0; i < expense.id.length; i++) h = (h * 31 + expense.id.charCodeAt(i)) >>> 0;
  const voice = getPapaVoice(expense.papaId);
  const base = voice.octave || 5;
  return PENTATONIC[Math.min(PENTATONIC.length - 1, base + (h % 5))];
}
function playNote(freq, duration = 0.45, waveType = 'sine', volume = 0.22) {
  const ctx = ensureAudio(); const t0 = ctx.currentTime;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = waveType; osc.frequency.value = freq;
  const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
  lfo.type = 'sine'; lfo.frequency.value = 6; lfoGain.gain.value = 3;
  lfo.connect(lfoGain).connect(osc.frequency);
  osc.connect(gain).connect(out());
  env(gain, t0, 0.02, 0.08, 0.6, duration, volume);
  osc.start(t0); lfo.start(t0);
  osc.stop(t0 + duration + 0.1); lfo.stop(t0 + duration + 0.1);
}
const recentNotes = [];
function playDuet(throngA, throngB) {
  const fA = expenseToNote(throngA.expense);
  const fB = expenseToNote(throngB.expense);
  const wA = getPapaVoice(throngA.expense.papaId).voice;
  const wB = getPapaVoice(throngB.expense.papaId).voice;
  playNote(fA, 0.5, wA, 0.18);
  setTimeout(() => playNote(fB, 0.5, wB, 0.18), 80);
  spawnNoteSprite(throngA, '♪');
  setTimeout(() => spawnNoteSprite(throngB, '♫'), 100);
  recentNotes.push({ f: fA, t: Date.now() });
  recentNotes.push({ f: fB, t: Date.now() + 80 });
  while (recentNotes.length > 8) recentNotes.shift();
}
function maybePlayMelody() {
  if (currentView !== 'world') return;
  if (recentNotes.length < 4) return;
  const now = Date.now();
  const recent = recentNotes.filter(n => now - n.t < 5000);
  if (recent.length < 4) return;
  recent.forEach((n, i) => setTimeout(() => playNote(n.f, 0.35, 'triangle', 0.16), i * 180));
  recentNotes.length = 0;
}
function spawnNoteSprite(throng, symbol) {
  if (!worldStageEl) return;
  const n = document.createElement('div');
  n.className = 'music-note';
  n.textContent = symbol;
  n.style.left = (throng.x + throng.size / 2) + 'px';
  n.style.top = (throng.y - 12) + 'px';
  worldStageEl.appendChild(n);
  setTimeout(() => n.remove(), 1500);
}


/* ============================================
   6. THRONG-TONGUE (bilingual: ES/EN translations of throng-speak)
   ============================================ */
const PHRASES_ALL = {
  es: {
    feed: [["KRII-MOK!","¡Delicioso, tutor!"],["PLONG-PLONG!","¡Otro más, otro más!"],["MIRRRT-KAA!","Crezco en tu nombre."],["NYIK NYIK!","El Throng te ve."],["WUUM-WUUM!","Mi vientre canta."],["KRII-KRII!","¡Bendito sea el oro!"],["MOK-LIGHT!","Brillo, brillo."],["THRONG-LOVE!","Te amo, tutor."]],
    sick: [["AAARGH-MOK!","Me ahogo en tu oro..."],["GLAAARG!","Demasiado, tutor. Demasiado."],["KRII-VOID!","El Throng se desangra."],["BLEHHH-MOK!","Mi tripa estalla..."],["PLONG-DEATH!","¿Por qué, tutor?"]],
    idle: [["pong... pong...","Espero, paciente."],["mok? mok?","¿Hay tutores ahí?"],["we are throng.","Somos uno."],["mok-dream","Sueño con monedas."],["zzz... zzz...","Echando una siesta."]]
  },
  en: {
    feed: [["KRII-MOK!","Delicious, tutor!"],["PLONG-PLONG!","One more, one more!"],["MIRRRT-KAA!","I grow in your name."],["NYIK NYIK!","The Throng sees you."],["WUUM-WUUM!","My belly sings."],["KRII-KRII!","Blessed be the gold!"],["MOK-LIGHT!","Shiny, shiny."],["THRONG-LOVE!","I love you, tutor."]],
    sick: [["AAARGH-MOK!","I drown in your gold..."],["GLAAARG!","Too much, tutor. Too much."],["KRII-VOID!","The Throng bleeds out."],["BLEHHH-MOK!","My gut explodes..."],["PLONG-DEATH!","Why, tutor?"]],
    idle: [["pong... pong...","I wait, patient."],["mok? mok?","Any tutors out there?"],["we are throng.","We are one."],["mok-dream","Dreaming of coins."],["zzz... zzz...","Taking a nap."]]
  }
};
const MINI_BUBBLES_ALL = {
  es: [["krii!","¡Hola!"],["mok-mok!","¡Vivo!"],["plong?","¿Eh?"],["nyik nyik","Cosquillas."],["pong... pong","Solo paso."],["wuuum","Calorcito."],["bzzt!","Estática."],["mok!","¡Mok!"],["throng!","¡Throng!"],["plong-plong","Recuerdos."],["where-mok?","¿Y los tutores?"],["mok-light","Luz luz."],["help-mok","Ayuda."],["mok-money","Soy plata."],["i-am-mok","Yo soy."],["void-mok","Hueco."],["throng-love","Amor Throng."],["mok-eternal","Eterno."],["mok-dream","Soñando."],["zz... zz","Durmiendo..."],["mok-brilllo","¡Brillo!"],["mok-frio","Tengo frío."],["mok-hambre","Hambre."],["plong!","¡Sorpresa!"],["mok-canta","Cantando."],["pizza?","¿Pizza?"],["wuum-wuum","Tibio tibio."],["mok-corre","Corro."],["mok-vuelve","Volved."],["plong-rie","Risas."],["bzz-glitch","Glitch."],["mok-trinket","Brilli brilli."],["nyik-nyik-mok","¿Cosquillitas?"],["i-am-recurring","Vuelvo cada luna."],["mok-amor","Te quiero."],["plong-baila","¡A bailar!"],["krii-krii!","¡Saluuudos!"],["♪ mok ♪","¡Música!"],["♫ plong ♫","Canturreo."],["dueto-mok","Cantamos juntos."]],
  en: [["krii!","Hi!"],["mok-mok!","Alive!"],["plong?","Huh?"],["nyik nyik","Tickles."],["pong... pong","Just passing."],["wuuum","Warmth."],["bzzt!","Static."],["mok!","Mok!"],["throng!","Throng!"],["plong-plong","Memories."],["where-mok?","Where are the tutors?"],["mok-light","Light light."],["help-mok","Help."],["mok-money","I am silver."],["i-am-mok","I am."],["void-mok","Hollow."],["throng-love","Throng love."],["mok-eternal","Eternal."],["mok-dream","Dreaming."],["zz... zz","Sleeping..."],["mok-brilllo","Sparkle!"],["mok-frio","I'm cold."],["mok-hambre","Hungry."],["plong!","Surprise!"],["mok-canta","Singing."],["pizza?","Pizza?"],["wuum-wuum","Cozy cozy."],["mok-corre","Running."],["mok-vuelve","Come back."],["plong-rie","Laughs."],["bzz-glitch","Glitch."],["mok-trinket","Trinket trinket."],["nyik-nyik-mok","Tickle me?"],["i-am-recurring","I return each moon."],["mok-amor","I love you."],["plong-baila","Let's dance!"],["krii-krii!","Greetings!"],["♪ mok ♪","Music!"],["♫ plong ♫","Humming."],["dueto-mok","We sing together."]]
};
const SICK_BUBBLES_ALL = {
  es: [["aaargh","Ay."],["mok-pain","Duele."],["bleh","Náusea."],["plong... no","No más oro."],["void","Hueco frío."],["mok-glitch","Algo cruje."],["help...","Socorro."],["i-die","Me muero."]],
  en: [["aaargh","Ouch."],["mok-pain","Hurts."],["bleh","Nausea."],["plong... no","No more gold."],["void","Cold void."],["mok-glitch","Something cracks."],["help...","Help."],["i-die","I die."]]
};
/* Live getters so they respect current language */
function PHRASES(){ return PHRASES_ALL[currentLang()] || PHRASES_ALL.es; }
function MINI_BUBBLES(){ return MINI_BUBBLES_ALL[currentLang()] || MINI_BUBBLES_ALL.es; }
function SICK_BUBBLES(){ return SICK_BUBBLES_ALL[currentLang()] || SICK_BUBBLES_ALL.es; }
const MINI_GREETINGS = ["KRII!","MOK!","PLONG!","NYIK!","WUUM!","MIRRT!","POK-POK!","BZZT!","PLOK!"];

function randPhrase(set) { return set[Math.floor(Math.random()*set.length)]; }
function randGreeting() { return MINI_GREETINGS[Math.floor(Math.random()*MINI_GREETINGS.length)]; }

let currentSpeechExpenseId = null;
function speak(throngText, esText, metaText = '', actionExpenseId = null) {
  const el = document.getElementById('speech');
  document.getElementById('speechT').textContent = throngText;
  document.getElementById('speechE').textContent = esText;
  document.getElementById('speechMeta').textContent = metaText;
  currentSpeechExpenseId = actionExpenseId;
  document.getElementById('speechActions').hidden = !actionExpenseId;
  el.classList.add('show');
  clearTimeout(speak._t);
  speak._t = setTimeout(() => {
    el.classList.remove('show');
    currentSpeechExpenseId = null;
    document.getElementById('speechActions').hidden = true;
  }, actionExpenseId ? 5000 : 3000);
}
function speakSet(setName) { const [tongueText, translated] = randPhrase(PHRASES()[setName]); speak(tongueText, translated); }


/* ============================================
   7. COLONY VIEW
   ============================================ */
function buildColonyDOM() {
  const wrap = document.getElementById('colony');
  wrap.innerHTML = '';
  for (const p of state.papas) {
    const el = document.createElement('div');
    el.className = `throng ${p.cls}`;
    el.dataset.id = p.id;
    el.innerHTML = `
      <div class="papa-frame">
        <img class="sprite" src="${SPRITES[p.sprite] || SPRITES.A_think}" alt="${p.name}">
        <div class="children-badge"><span data-children-for="${p.id}">0</span></div>
      </div>
      <div class="papa-progress" title="presupuesto consumido">
        <div class="papa-progress-fill" data-progress-for="${p.id}" style="width:0%"></div>
      </div>
      <div class="label"><span data-name-for="${p.id}">${p.name}</span> · <span data-spent-for="${p.id}">0</span>/<span data-budget-for="${p.id}">${p.budget}</span>€</div>
    `;
    el.addEventListener('click', () => { selectPapaUI(p.id); beep(); coo(p.id); });
    wrap.appendChild(el);
  }
}
function buildFeedPapaSelector() {
  const wrap = document.getElementById('papaSelector');
  wrap.innerHTML = '';
  for (const p of state.papas) {
    const btn = document.createElement('button');
    btn.className = `papa-btn ${p.cls}`;
    btn.dataset.papa = p.id;
    btn.textContent = p.name;
    btn.addEventListener('click', () => { selectPapaUI(p.id); beep(); coo(p.id); });
    wrap.appendChild(btn);
  }
  if (selectedPapa && !getPapaById(selectedPapa)) selectedPapa = null;
  if (!selectedPapa && state.papas.length > 0) selectedPapa = state.papas[0].id;
  selectPapaUI(selectedPapa);
}
function buildEditPapaSelector() {
  const wrap = document.getElementById('editPapaSelector');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (const p of state.papas) {
    const btn = document.createElement('button');
    btn.className = `papa-btn ${p.cls}`;
    btn.dataset.editPapa = p.id;
    btn.textContent = p.name;
    btn.addEventListener('click', () => {
      editPapa = p.id;
      document.querySelectorAll('#editPapaSelector .papa-btn').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
    });
    wrap.appendChild(btn);
  }
}

function renderColony() {
  const monthly = expensesForMonth(monthKey(new Date()));
  const sums = {}, counts = {};
  for (const p of state.papas) { sums[p.id] = 0; counts[p.id] = 0; }
  for (const e of monthly) {
    if (sums[e.papaId] !== undefined) {
      sums[e.papaId] += e.amount;
      counts[e.papaId] += 1;
    }
  }
  let total = 0, anySick = false;
  for (const p of state.papas) {
    const el = document.querySelector(`.colony .throng[data-id="${p.id}"]`);
    if (!el) continue;
    const spent = sums[p.id];
    const sick = spent > p.budget;
    el.classList.toggle('sick', sick);
    if (sick) anySick = true;
    el.querySelector(`[data-children-for="${p.id}"]`).textContent = counts[p.id];
    el.querySelector(`[data-budget-for="${p.id}"]`).textContent = p.budget;
    el.querySelector(`[data-name-for="${p.id}"]`).textContent = p.name;
    const spentEl = el.querySelector(`[data-spent-for="${p.id}"]`);
    if (spentEl) spentEl.textContent = Math.round(spent);
    // Progress bar: width + color
    const pctRaw = p.budget > 0 ? (spent / p.budget) * 100 : 0;
    const pct = Math.min(100, pctRaw);
    const fill = el.querySelector(`[data-progress-for="${p.id}"]`);
    if (fill) {
      fill.style.width = pct + '%';
      fill.classList.remove('warn', 'over');
      if (pctRaw >= 100) fill.classList.add('over');
      else if (pctRaw >= 70) fill.classList.add('warn');
    }
    // Color the children-badge too
    const badge = el.querySelector('.children-badge');
    if (badge) {
      badge.classList.remove('badge-warn', 'badge-over');
      if (pctRaw >= 100) badge.classList.add('badge-over');
      else if (pctRaw >= 70) badge.classList.add('badge-warn');
    }
    const spriteEl = el.querySelector('.sprite');
    if (spriteEl) {
      const want = sick ? SPRITES.A_skeptical : (SPRITES[p.sprite] || SPRITES.A_think);
      if (!spriteEl.src.endsWith(want)) spriteEl.src = want;
    }
    total += spent;
  }
  document.getElementById('total').textContent = fmt(total);
  document.getElementById('totalPill').classList.toggle('alert', anySick);
  document.getElementById('bornCount').textContent = monthly.length;
  document.getElementById('month').textContent = monthLabel(monthKey(new Date()));
}

function renderDeudas() {
  /* Per-expense split-aware balance:
     For each expense:
       paid[tutor] += amount
       owed[tutor] += amount * split[tutor]
     For each settlement (Gayle→Isi reduces Gayle's debt to Isi by amount; symmetric):
       owed/paid adjusted via transfer
     Final: isiNet = isiPaid - isiOwed + settlements_received_by_isi - settlements_paid_by_isi
            isiNet > 0 → Gayle owes Isi |isiNet| (50/50 model uses this directly)
            'difference' model: shows the gross difference |isiPaid-gaylePaid| using current month tutorPaid (no splits)
  */
  const month = monthKey(new Date());
  const monthly = expensesForMonth(month);
  const settlements = settlementsForMonth(month);

  // Per-tutor PAID totals (for display)
  let isiPaid = 0, gaylePaid = 0;
  for (const e of monthly) {
    if (e.tutor === 'Isi') isiPaid += e.amount;
    else gaylePaid += e.amount;
  }

  // Split-aware net
  let isiOwed = 0, gayleOwed = 0;
  for (const e of monthly) {
    const sp = e.split || { isi: 0.5, gayle: 0.5 };
    isiOwed   += e.amount * (sp.isi   ?? 0.5);
    gayleOwed += e.amount * (sp.gayle ?? 0.5);
  }
  let isiNet = isiPaid - isiOwed;  // positive: Gayle owes Isi this much

  // Apply settlements
  // settlement: from→to. If "Gayle paid Isi X" → reduces Gayle's debt by X → isiNet -= X
  for (const s of settlements) {
    if (s.fromTutor === 'Gayle' && s.toTutor === 'Isi') isiNet -= s.amount;
    if (s.fromTutor === 'Isi' && s.toTutor === 'Gayle') isiNet += s.amount;
  }

  document.getElementById('isiTotal').textContent = fmt(isiPaid);
  document.getElementById('gayleTotal').textContent = fmt(gaylePaid);

  const msg = document.getElementById('balanceMsg');
  const card = document.querySelector('.balance-card');
  let debtAmt;
  if (state.settings.splitModel === 'half') {
    debtAmt = Math.abs(isiNet);
    document.getElementById('balanceMode').textContent = t('deudas.by_split');
  } else {
    debtAmt = Math.abs(isiPaid - gaylePaid);
    document.getElementById('balanceMode').textContent = t('deudas.gross');
  }
  if (debtAmt < 0.01) { msg.textContent = t('deudas.balanced'); card.classList.remove('unbalanced'); }
  else if ((state.settings.splitModel === 'half' && isiNet > 0) || (state.settings.splitModel !== 'half' && isiPaid > gaylePaid)) {
    msg.textContent = t('deudas.owes', { from: 'Gayle', to: 'Isi', amount: fmt(debtAmt) });
    card.classList.add('unbalanced');
  } else {
    msg.textContent = t('deudas.owes', { from: 'Isi', to: 'Gayle', amount: fmt(debtAmt) });
    card.classList.add('unbalanced');
  }
}

function selectPapaUI(id) {
  selectedPapa = id;
  document.querySelectorAll('.papa-btn[data-papa]').forEach(b => b.classList.toggle('active', b.dataset.papa === id));
  document.querySelectorAll('.colony .throng').forEach(t => t.classList.toggle('target', t.dataset.id === id));
}
function selectTutorUI(name) {
  selectedTutor = name;
  document.querySelectorAll('.tutor-btn[data-tutor]').forEach(b => b.classList.toggle('active', b.dataset.tutor === name));
}
function selectSplitUI(key) {
  selectedSplit = key;
  document.getElementById('splitSelect').value = key;
}

/* ============================================
   8. FEED + RETURN
   ============================================ */
function feed() {
  if (!selectedPapa) { speak('MOK?', t('speak.no_papa')); beep(500); return; }
  const concepto = document.getElementById('concepto').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  if (!concepto) { speak('MOK?', t('speak.no_name')); beep(500); return; }
  if (isNaN(amount) || amount <= 0) { speak('MOK?', t('speak.no_amount')); beep(500); return; }

  // Parse selected date (use it for timestamp)
  const dateStr = document.getElementById('expenseDate').value;
  let timestamp;
  if (dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const now = new Date();
    timestamp = new Date(y, m-1, d, now.getHours(), now.getMinutes(), now.getSeconds()).getTime();
  } else {
    timestamp = Date.now();
  }

  // Determine sick at this point in time
  const eMonth = monthKey(new Date(timestamp));
  const monthlyAtThatMonth = state.expenses.filter(e => {
    if (e.type === 'settlement') return false;
    const em = monthKey(new Date(e.timestamp));
    if (e.papaId === 'suscri') return em <= eMonth;
    return em === eMonth;
  });
  const papaSpentBefore = monthlyAtThatMonth.filter(e => e.papaId === selectedPapa).reduce((s,e)=>s+e.amount, 0);
  const papa = getPapaById(selectedPapa);
  const wasSick = papaSpentBefore > (papa?.budget ?? 999999);

  const split = splitObj(selectedSplit);
  const expense = {
    id: 'e' + Date.now() + Math.random().toString(36).slice(2,6),
    papaId: selectedPapa, name: concepto, amount,
    tutor: selectedTutor, timestamp,
    bornSick: wasSick,
    split,
    type: 'expense'
  };
  state.expenses.push(expense); save();
  cloudPushExpense(expense);
  rebuildConceptHints();

  const papaEl = document.querySelector(`.colony .throng[data-id="${selectedPapa}"]`);
  if (papaEl) {
    papaEl.classList.add('fed');
    const spriteEl = papaEl.querySelector('.sprite');
    if (spriteEl) spriteEl.src = SPRITES.A_happy;
    setTimeout(() => papaEl.classList.remove('fed'), 700);
    setTimeout(() => renderColony(), 1400);

    const coin = document.createElement('div');
    coin.className = 'coin'; coin.textContent = '+' + fmt(amount) + '€';
    const rect = papaEl.getBoundingClientRect();
    coin.style.left = (rect.left + rect.width/2 - 20) + 'px';
    coin.style.top = (rect.top + 40) + 'px';
    document.body.appendChild(coin);
    setTimeout(() => coin.remove(), 1100);
    try { birthAnimation(papaEl, selectedPapa); } catch (e) { console.warn('birth anim', e); }
  }

  // Audio defensivo (iOS Safari a veces es estricto con AudioContext)
  try { modemDial(); } catch (e) { console.warn('modem', e); }
  setTimeout(() => { try { coo(selectedPapa); } catch (e) {} }, 200);
  setTimeout(() => { try { playNote(expenseToNote(expense), 0.45, getPapaVoice(selectedPapa).voice, 0.18); } catch (e) {} }, 400);

  if (papaSpentBefore + amount > (papa?.budget ?? 999999)) {
    setTimeout(() => { try { alertCry(); } catch (e) {} speakSet('sick'); }, 900);
  } else speakSet('feed');

  document.getElementById('concepto').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('expenseDate').value = todayYMD();
  document.getElementById('concepto').focus();
  renderColony(); renderDeudas();
}
function birthAnimation(papaEl, papaId) {
  const papa = getPapaById(papaId);
  const color = COLOR_SLOTS[papa.cls]?.color || '#fff';
  const rect = papaEl.getBoundingClientRect();
  const b = document.createElement('div');
  b.className = 'birth-throng';
  b.style.background = color; b.style.color = color;
  b.style.left = (rect.left + rect.width/2 - 14) + 'px';
  b.style.top = (rect.top + 60) + 'px';
  b.style.setProperty('--dx', (Math.random()-0.5) * 200 + 'px');
  b.style.setProperty('--dy', (-160 - Math.random()*80) + 'px');
  document.body.appendChild(b);
  birthSound();
  setTimeout(() => b.remove(), 1400);
}
function returnToPapa(expenseId) {
  const idx = state.expenses.findIndex(e => e.id === expenseId);
  if (idx === -1) return;
  state.expenses.splice(idx, 1); save();
  cloudDeleteExpense(expenseId);
  rebuildConceptHints();
  returnHomeSound();
  const t = worldThrongs.find(w => w.expense.id === expenseId);
  if (t) { t.el.classList.add('leaving'); setTimeout(() => renderWorld(), 900); }
  else renderWorld();
  speak('PONG-PONG...', t('speak.coming_home'), '');
  document.getElementById('speechActions').hidden = true;
  currentSpeechExpenseId = null;
  renderColony(); renderDeudas(); renderHistory();
}

/* ============================================
   9. NAVIGATION
   ============================================ */
function showView(name) {
  currentView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === name + '-view'));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
  if (name === 'world') {
    if (!worldMonthKey) worldMonthKey = monthKey(new Date());
    renderWorld(); startWorldTick(); beep(900);
  } else { stopWorldTick(); beep(700); }
  if (name === 'settings') populateSettings();
  if (name === 'stats') renderStats();
}

/* ============================================
   10. ANIMATION STATE MACHINE
   ============================================ */
function pickAnimState(current, bornSick) {
  if (bornSick && Math.random() < 0.6) return 'skeptical';
  let r = Math.random() * ANIM_TOTAL_WEIGHT;
  for (const [name, a] of Object.entries(ANIM_STATES)) {
    r -= a.weight;
    if (r <= 0) {
      if (name === current && Math.random() < 0.5) return pickAnimState(current, bornSick);
      return name;
    }
  }
  return 'think';
}
function setAnim(throng, name) {
  throng.anim = name;
  throng.animEnd = Date.now() + ANIM_STATES[name].duration;
  const img = throng.el.querySelector('.sprite');
  if (img) img.src = SPRITES[ANIM_STATES[name].sprite];
  const chatter = state.settings.worldChatter;
  const chance = chatter === 'party' ? 0.45 : chatter === 'quiet' ? 0.05 : 0.18;
  if (Math.random() < chance) playStateSound(name, throng);
  if (Math.random() < 0.1 && chatter !== 'quiet') miniSpeakBubble(throng);
}
function playStateSound(s, throng) {
  const pid = throng.expense.papaId;
  switch (s) {
    case 'happy':     giggle(); break;
    case 'explain':   coo(pid, 1.0 + Math.random()*0.3); break;
    case 'skeptical': sigh(); break;
    case 'talkA':     burble(); break;
    case 'talkC':     hum(); break;
    case 'talkD':     coo(pid, 0.85); break;
    case 'think':     if (Math.random()<0.4) popBubble(); break;
  }
}

/* ============================================
   11. WORLD VIEW
   ============================================ */
let worldThrongs = [];
let worldRaf = null;
let worldStageEl = null;
let lastCollisionCheck = 0;
const COLLISION_THROTTLE_MS = 50;
const COLLISION_COOLDOWN_MS = 1500;

function renderWorld() {
  worldStageEl = document.getElementById('worldStage');
  worldStageEl.querySelectorAll('.mini-throng, .mini-bubble, .music-note').forEach(el => el.remove());
  worldThrongs = [];

  document.getElementById('worldMonthLabel').textContent = monthLabel(worldMonthKey);
  document.getElementById('historyMonth').textContent = monthLabel(worldMonthKey);

  const expenses = expensesForMonth(worldMonthKey);
  document.getElementById('worldEmpty').style.display = expenses.length === 0 ? 'flex' : 'none';

  const w = worldStageEl.clientWidth || 800;
  const h = worldStageEl.clientHeight || 500;

  for (const e of expenses) {
    const papa = getPapaById(e.papaId);
    if (!papa) continue; // skip if papa was deleted
    const size = Math.min(110, Math.max(48, 36 + Math.sqrt(e.amount) * 2.6));
    const x = Math.random() * Math.max(1, w - size);
    const y = Math.random() * Math.max(1, h - size);
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.5;
    const recurring = isRecurringInstance(e, worldMonthKey);
    const tutorColor = e.tutor === 'Isi' ? '#00d4ff' : '#ff9933';

    const el = document.createElement('div');
    el.className = `mini-throng ${papa.cls}` + (e.bornSick ? ' sick' : '');
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.style.setProperty('--tutor-color', tutorColor);
    el.dataset.expenseId = e.id;
    el.innerHTML = `
      <div class="mini-tag">${e.tutor === 'Isi' ? 'I' : 'G'} · ${e.name.substring(0,18)}</div>
      <div class="mini-frame">
        <img class="sprite" src="${SPRITES.A_think}" alt="">
      </div>
      ${recurring ? '<div class="recurring-badge">♺</div>' : ''}
    `;
    el.addEventListener('click', (ev) => { ev.stopPropagation(); tellStory(e, el); });
    worldStageEl.appendChild(el);

    const t = {
      el, expense: e, x, y,
      vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
      size, stopUntil: 0,
      anim: 'think',
      animEnd: Date.now() + 500 + Math.random()*ANIM_STATES.think.duration,
      lastCollisions: {}
    };
    worldThrongs.push(t);
    setTimeout(() => setAnim(t, pickAnimState(null, e.bornSick)), Math.random()*2000);
  }
  renderHistory();
}
function startWorldTick() {
  if (worldRaf) return;
  const loop = () => {
    tickWorld();
    if (currentView === 'world' && !document.hidden) worldRaf = requestAnimationFrame(loop);
    else worldRaf = null;
  };
  worldRaf = requestAnimationFrame(loop);
}
function stopWorldTick() { if (worldRaf) cancelAnimationFrame(worldRaf); worldRaf = null; }

function tickWorld() {
  if (!worldStageEl) return;
  const W = worldStageEl.clientWidth;
  const H = worldStageEl.clientHeight;
  const now = Date.now();
  for (const t of worldThrongs) {
    if (now > t.animEnd && !t.el.classList.contains('speaking') && !t.el.classList.contains('leaving')) {
      setAnim(t, pickAnimState(t.anim, t.expense.bornSick));
    }
    if (now < t.stopUntil) continue;
    if (t.el.classList.contains('leaving')) continue;

    const mob = ANIM_STATES[t.anim]?.mobility ?? 0.4;
    if (mob === 0) { t.vx *= 0.7; t.vy *= 0.7; }
    else {
      if (Math.random() < 0.02) {
        t.vx += (Math.random()-0.5) * 0.6 * mob;
        t.vy += (Math.random()-0.5) * 0.6 * mob;
      }
      t.vx *= 0.985; t.vy *= 0.985;
      const sp = Math.hypot(t.vx, t.vy);
      const maxSp = 1.3 * mob;
      if (sp > maxSp && maxSp > 0) { t.vx = (t.vx/sp)*maxSp; t.vy = (t.vy/sp)*maxSp; }
      if (sp < 0.12*mob && mob > 0.2) {
        const a = Math.random()*Math.PI*2;
        t.vx += Math.cos(a)*0.22*mob;
        t.vy += Math.sin(a)*0.22*mob;
      }
      t.x += t.vx; t.y += t.vy;
      if (t.x < 0) { t.x = 0; t.vx = Math.abs(t.vx); }
      if (t.x > W - t.size) { t.x = W - t.size; t.vx = -Math.abs(t.vx); }
      if (t.y < 0) { t.y = 0; t.vy = Math.abs(t.vy); }
      if (t.y > H - t.size) { t.y = H - t.size; t.vy = -Math.abs(t.vy); }
    }
    t.el.style.transform = `translate3d(${t.x}px, ${t.y}px, 0)`;
  }
  if (now - lastCollisionCheck > COLLISION_THROTTLE_MS) {
    lastCollisionCheck = now;
    detectCollisions(now);
  }
}
function detectCollisions(now) {
  for (let i = 0; i < worldThrongs.length; i++) {
    for (let j = i+1; j < worldThrongs.length; j++) {
      const a = worldThrongs[i], b = worldThrongs[j];
      if (a.el.classList.contains('leaving') || b.el.classList.contains('leaving')) continue;
      const ax = a.x + a.size/2, ay = a.y + a.size/2;
      const bx = b.x + b.size/2, by = b.y + b.size/2;
      const dist = Math.hypot(ax - bx, ay - by);
      const touchDist = (a.size + b.size)/2 - 6;
      if (dist < touchDist) {
        const nx = (ax - bx) / (dist || 1);
        const ny = (ay - by) / (dist || 1);
        a.vx += nx * 0.25; a.vy += ny * 0.25;
        b.vx -= nx * 0.25; b.vy -= ny * 0.25;
        const pairKey = a.expense.id < b.expense.id ? a.expense.id + '|' + b.expense.id : b.expense.id + '|' + a.expense.id;
        const last = a.lastCollisions[pairKey] || 0;
        if (now - last >= COLLISION_COOLDOWN_MS) {
          a.lastCollisions[pairKey] = now; b.lastCollisions[pairKey] = now;
          startDuet(a, b);
        }
      }
    }
  }
}
function startDuet(a, b) {
  a.el.classList.add('duetting'); b.el.classList.add('duetting');
  setAnim(a, ['talkA','talkC','talkD'][Math.floor(Math.random()*3)]);
  setAnim(b, ['talkA','talkC','talkD'][Math.floor(Math.random()*3)]);
  a.stopUntil = Date.now() + 1200; b.stopUntil = Date.now() + 1200;
  playDuet(a, b);
  setTimeout(() => { a.el.classList.remove('duetting'); b.el.classList.remove('duetting'); }, 1400);
}
function tellStory(expense, el) {
  const papa = getPapaById(expense.papaId);
  el.classList.add('speaking');
  const obj = worldThrongs.find(w => w.expense.id === expense.id);
  if (obj) { obj.stopUntil = Date.now() + 4500; setAnim(obj, ['talkA','talkC','talkD'][Math.floor(Math.random()*3)]); }
  coo(expense.papaId, expense.tutor === 'Gayle' ? 1.15 : 0.9);
  setTimeout(() => playNote(expenseToNote(expense), 0.6, getPapaVoice(expense.papaId).voice, 0.2), 250);
  const date = new Date(expense.timestamp);
  const dStr = String(date.getDate()).padStart(2,'0') + '/' + String(date.getMonth()+1).padStart(2,'0');
  const sick = expense.bornSick ? ' ' + t('sticker.sick') : '';
  const recurringNote = isRecurringInstance(expense, worldMonthKey)
    ? t('speak.recurring_since', { month: monthLabel(monthKey(new Date(expense.timestamp))) }) : '';
  const sp = splitLabel(expense.split);
  speak(
    randGreeting() + ' ' + randGreeting(),
    t('speak.story_concept', { name: expense.name, papa: papa?.name || '???', sick }),
    t('speak.brought_on', { tutor: expense.tutor, date: dStr, amount: fmt(expense.amount), split: sp }) + recurringNote,
    expense.id
  );
  setTimeout(() => el.classList.remove('speaking'), 4500);
}
function miniSpeakBubble(t) {
  if (!worldStageEl) return;
  const bubbles = t.expense.bornSick ? SICK_BUBBLES() : MINI_BUBBLES();
  const [tn] = randPhrase(bubbles);
  const phrase = (Math.random() < 0.15 && t.expense.name.length < 20) ? `«${t.expense.name}»` : tn;
  const bub = document.createElement('div');
  bub.className = 'mini-bubble';
  bub.textContent = phrase;
  bub.style.left = (t.x + t.size/2) + 'px';
  bub.style.top = (t.y - 6) + 'px';
  worldStageEl.appendChild(bub);
  setTimeout(() => bub.remove(), 1900);
}
function ambientTick() {
  if (currentView !== 'world' || worldThrongs.length === 0 || document.hidden) return;
  const chatter = state.settings.worldChatter || 'normal';
  let threshold = chatter === 'party' ? 1.0 : chatter === 'quiet' ? 0.18 : 0.55;
  if (Math.random() > threshold) return;
  const t = worldThrongs[Math.floor(Math.random()*worldThrongs.length)];
  const action = Math.random();
  if (action < 0.45) {
    miniSpeakBubble(t);
    if (Math.random() < 0.5) coo(t.expense.papaId, 0.8 + Math.random()*0.5);
  } else if (action < 0.7) {
    [chitter, burble, giggle, sigh, popBubble, hum, glitch][Math.floor(Math.random()*7)]();
  } else if (action < 0.9) {
    chitter();
    if (Math.random() < 0.5 && worldThrongs.length > 1) {
      const t2 = worldThrongs[Math.floor(Math.random()*worldThrongs.length)];
      setTimeout(() => miniSpeakBubble(t2), 200);
    }
  } else glitch();
}

/* ============================================
   12. HISTORY PANEL
   ============================================ */
function applyHistoryFilter(items) {
  let arr = items;
  if (historyFilter.type === 'tutor') arr = arr.filter(e => e.tutor === historyFilter.val);
  else if (historyFilter.type === 'papa') arr = arr.filter(e => e.papaId === historyFilter.val);
  else if (historyFilter.type === 'settlement') arr = arr.filter(e => e.type === 'settlement');
  if (historySearch) {
    const q = historySearch.toLowerCase();
    arr = arr.filter(e => (e.name || '').toLowerCase().includes(q));
  }
  return arr;
}
function buildHistoryFilters() {
  const wrap = document.getElementById('historyFilters');
  wrap.innerHTML = '';
  const chips = [
    { type: 'all', val: 'all', label: t('history.filter.all') },
    { type: 'tutor', val: 'Isi', label: 'ISI' },
    { type: 'tutor', val: 'Gayle', label: 'GAYLE' },
    ...state.papas.map(p => ({ type: 'papa', val: p.id, label: p.name })),
    { type: 'settlement', val: 'settlement', label: t('history.filter.settlement') }
  ];
  for (const c of chips) {
    const btn = document.createElement('button');
    btn.className = 'filter-chip' + (historyFilter.type === c.type && historyFilter.val === c.val ? ' active' : '');
    btn.dataset.filterType = c.type;
    btn.dataset.filterVal  = c.val;
    btn.textContent = c.label;
    btn.addEventListener('click', () => {
      historyFilter = { type: c.type, val: c.val };
      buildHistoryFilters();
      renderHistory();
      beep(900);
    });
    wrap.appendChild(btn);
  }
}
function renderHistory() {
  const monthExpenses = expensesForMonth(worldMonthKey);
  const monthSettlements = settlementsForMonth(worldMonthKey);
  const all = [...monthExpenses, ...monthSettlements].sort((a,b) => b.timestamp - a.timestamp);
  const filtered = applyHistoryFilter(all);
  const list = document.getElementById('historyList');
  const totals = document.getElementById('historyTotals');
  if (!list) return;
  const tIsi = filtered.filter(e => e.type !== 'settlement' && e.tutor === 'Isi').reduce((s,e)=>s+e.amount, 0);
  const tGay = filtered.filter(e => e.type !== 'settlement' && e.tutor === 'Gayle').reduce((s,e)=>s+e.amount, 0);
  const tAll = tIsi + tGay;
  totals.innerHTML = `
    <div class="total-pill"><span class="lbl">${t('history.total_isi')}</span>${fmt(tIsi)} €</div>
    <div class="total-pill"><span class="lbl">${t('history.total_gayle')}</span>${fmt(tGay)} €</div>
    <div class="total-pill"><span class="lbl">${t('history.total_all')}</span>${fmt(tAll)} €</div>`;
  if (filtered.length === 0) { list.innerHTML = `<div class="history-empty">${t('history.empty')}</div>`; return; }
  list.innerHTML = '';
  for (const e of filtered) {
    const d = new Date(e.timestamp);
    const dStr = String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0');
    const row = document.createElement('div');

    if (e.type === 'settlement') {
      row.className = 'history-row settlement';
      row.innerHTML = `
        <span class="h-date">${dStr}</span>
        <span class="h-name">💸 ${e.fromTutor} ⇒ ${e.toTutor}${e.name ? ' · '+e.name : ''}</span>
        <span class="h-recur"></span>
        <span class="h-split"></span>
        <span class="h-tutor ${e.fromTutor.toLowerCase()}">${e.fromTutor === 'Isi' ? t('tutor.short.isi') : t('tutor.short.gayle')}</span>
        <span class="h-amount">${fmt(e.amount)} €</span>
        <button class="h-del" title="${t('confirm.delete_settlement')}">×</button>`;
      row.querySelector('.h-del').addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (confirm(t('confirm.delete_settlement'))) returnToPapa(e.id);
      });
      list.appendChild(row);
      continue;
    }

    const papa = getPapaById(e.papaId);
    const recurring = isRecurringInstance(e, worldMonthKey);
    row.className = `history-row ${papa?.cls || 't-rosa'}` + (e.bornSick ? ' sick' : '') + (recurring ? ' recurring' : '');
    row.innerHTML = `
      <span class="h-date">${dStr}</span>
      <span class="h-name" title="${e.name} · ${papa?.name || '?'}">${e.name}${e.bornSick ? ' ⚠' : ''}</span>
      <span class="h-recur">${recurring ? '♺' : ''}</span>
      <span class="h-split">${splitLabel(e.split)}</span>
      <span class="h-tutor ${e.tutor.toLowerCase()}">${e.tutor === 'Isi' ? t('tutor.short.isi') : t('tutor.short.gayle')}</span>
      <span class="h-amount">${fmt(e.amount)} €</span>
      <button class="h-edit" title="Editar">✎</button>
      <button class="h-del"  title="Devolver al papa">×</button>`;
    row.querySelector('.h-edit').addEventListener('click', (ev) => { ev.stopPropagation(); openEditModal(e.id); });
    row.querySelector('.h-del').addEventListener('click', (ev) => {
      ev.stopPropagation();
      const verb = e.papaId === 'suscri' ? t('confirm.cancel_sub') : t('confirm.return_papa');
      if (confirm(t('confirm.action_question', { verb, name: e.name }))) returnToPapa(e.id);
    });
    list.appendChild(row);
  }
}
function toggleHistory() {
  const p = document.getElementById('historyPanel');
  const isOpen = p.classList.toggle('show');
  if (isOpen) { buildHistoryFilters(); renderHistory(); chime(); } else beep(700);
}

/* ============================================
   13. STATS
   ============================================ */
function renderStats() {
  const expenses = state.expenses.filter(e => e.type !== 'settlement');
  let totalAllTime = 0;
  for (const e of expenses) totalAllTime += e.amount;

  const monthTotals = {};
  const monthKeysOrdered = [];
  if (expenses.length > 0) {
    const earliest = [...expenses].sort((a,b)=>a.timestamp-b.timestamp)[0];
    let k = monthKey(new Date(earliest.timestamp));
    const today = monthKey(new Date());
    while (k <= today) {
      monthKeysOrdered.push(k);
      monthTotals[k] = expensesForMonth(k).reduce((s,e)=>s+e.amount, 0);
      k = shiftMonth(k, 1);
      if (monthKeysOrdered.length > 60) break;
    }
  }

  document.getElementById('statTotal').textContent = fmt(totalAllTime) + ' €';
  const last6 = monthKeysOrdered.slice(-6);
  const avg = last6.length > 0 ? last6.reduce((s,k)=>s+monthTotals[k], 0) / last6.length : 0;
  document.getElementById('statAvg').textContent = fmt(avg) + ' €';
  document.getElementById('statAvgRange').textContent = last6.length > 0 ? t('stats.last_n_months', { n: last6.length }) : t('pwa.dash');

  let maxKey = null, maxVal = 0;
  for (const k of monthKeysOrdered) if (monthTotals[k] > maxVal) { maxVal = monthTotals[k]; maxKey = k; }
  document.getElementById('statMaxMonth').textContent = maxKey ? monthLabel(maxKey) : t('pwa.dash');
  document.getElementById('statMaxMonthVal').textContent = maxKey ? fmt(maxVal) + ' €' : t('pwa.dash');

  const recurringCount = expenses.filter(e => e.papaId === 'suscri').length;
  document.getElementById('statThrongs').textContent = expenses.length;
  document.getElementById('statRecurring').textContent = t('stats.recurring_count', { n: recurringCount });

  const chart = document.getElementById('monthlyChart');
  const last12 = monthKeysOrdered.slice(-12);
  if (last12.length === 0) {
    chart.innerHTML = `<div class="chart-empty">${t('stats.no_data')}</div>`;
  } else {
    const maxBar = Math.max(...last12.map(k => monthTotals[k]), 1);
    const currentK = monthKey(new Date());
    chart.innerHTML = last12.map(k => {
      const v = monthTotals[k];
      const pct = (v / maxBar) * 100;
      const shortLabel = monthLabel(k).slice(0,3) + ' ' + k.slice(2,4);
      const isCurrent = k === currentK;
      return `<div class="chart-bar ${isCurrent ? 'current' : ''}" style="height:${Math.max(2, pct)}%"><div class="bar-amt">${v > 0 ? fmt(v) + '€' : ''}</div><div class="bar-label">${shortLabel}</div></div>`;
    }).join('');
  }

  const papaSums = {};
  for (const p of state.papas) papaSums[p.id] = 0;
  for (const e of expenses) if (papaSums[e.papaId] !== undefined) papaSums[e.papaId] += e.amount;
  const papaTotal = Object.values(papaSums).reduce((s,v)=>s+v,0) || 1;
  const papaEl = document.getElementById('papaBreakdown');
  papaEl.innerHTML = state.papas.map(p => {
    const v = papaSums[p.id];
    const pct = (v / papaTotal) * 100;
    return `<div class="breakdown-row"><span class="breakdown-label ${p.cls}">${p.name}</span><div class="breakdown-bar-track"><div class="breakdown-bar-fill ${p.cls}" style="width:${pct}%"></div></div><span class="breakdown-amount">${fmt(v)} € · ${pct.toFixed(0)}%</span></div>`;
  }).join('');

  const tutorSums = { Isi: 0, Gayle: 0 };
  for (const e of expenses) tutorSums[e.tutor] += e.amount;
  const tutorTotal = tutorSums.Isi + tutorSums.Gayle || 1;
  const tutorEl = document.getElementById('tutorBreakdown');
  tutorEl.innerHTML = ['Isi', 'Gayle'].map(t => {
    const v = tutorSums[t]; const pct = (v / tutorTotal) * 100;
    return `<div class="breakdown-row"><span class="breakdown-label" style="color:${t==='Isi'?'#00d4ff':'#ff9933'}">${t.toUpperCase()}</span><div class="breakdown-bar-track"><div class="breakdown-bar-fill ${t.toLowerCase()}" style="width:${pct}%"></div></div><span class="breakdown-amount">${fmt(v)} € · ${pct.toFixed(0)}%</span></div>`;
  }).join('');

  const top5 = [...expenses].sort((a,b) => b.amount - a.amount).slice(0, 5);
  const topEl = document.getElementById('topExpenses');
  if (top5.length === 0) topEl.innerHTML = `<div class="chart-empty">${t('stats.no_expenses')}</div>`;
  else topEl.innerHTML = top5.map((e, i) => {
    const p = getPapaById(e.papaId);
    const d = new Date(e.timestamp);
    return `<div class="top-row ${p?.cls || ''}"><span class="top-rank">#${i+1}</span><span class="top-name">${e.name}</span><span class="top-meta">${e.tutor} · ${monthLabel(monthKey(d))}</span><span class="top-amount">${fmt(e.amount)} €</span></div>`;
  }).join('');
}

/* ============================================
   14. EDIT MODAL (expense)
   ============================================ */
let editingExpenseId = null;
let editPapa = null;
let editTutor = null;
function openEditModal(expenseId) {
  const e = state.expenses.find(x => x.id === expenseId);
  if (!e || e.type === 'settlement') return;
  editingExpenseId = expenseId;
  editPapa = e.papaId; editTutor = e.tutor;
  document.getElementById('editConcepto').value = e.name;
  document.getElementById('editAmount').value = e.amount;
  document.getElementById('editDate').value = ymd(new Date(e.timestamp));
  document.getElementById('editSplit').value = splitKey(e.split);
  buildEditPapaSelector();
  document.querySelectorAll('#editPapaSelector .papa-btn').forEach(b => b.classList.toggle('active', b.dataset.editPapa === e.papaId));
  document.querySelectorAll('#editTutorSelector .tutor-btn').forEach(b => b.classList.toggle('active', b.dataset.editTutor === e.tutor));
  document.getElementById('editModal').hidden = false;
  setTimeout(() => document.getElementById('editConcepto').focus(), 50);
  beep(900);
}
function closeEditModal() { document.getElementById('editModal').hidden = true; editingExpenseId = null; }
function saveEdit() {
  if (!editingExpenseId) return;
  const e = state.expenses.find(x => x.id === editingExpenseId);
  if (!e) return;
  const name = document.getElementById('editConcepto').value.trim();
  const amount = parseFloat(document.getElementById('editAmount').value);
  if (!name || isNaN(amount) || amount <= 0) { alert(t('alert.invalid_data')); return; }
  e.name = name; e.amount = amount;
  e.papaId = editPapa || e.papaId;
  e.tutor  = editTutor || e.tutor;
  e.split  = splitObj(document.getElementById('editSplit').value);
  const dateStr = document.getElementById('editDate').value;
  if (dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const now = new Date(e.timestamp);
    e.timestamp = new Date(y, m-1, d, now.getHours(), now.getMinutes(), now.getSeconds()).getTime();
  }
  save();
  cloudPushExpense(e);
  chime();
  speak('PLOK!', t('speak.thronglet_modified'));
  closeEditModal();
  renderColony(); renderDeudas(); renderHistory();
  if (currentView === 'world') renderWorld();
  if (currentView === 'stats') renderStats();
}

/* ============================================
   15. PAPA EDIT MODAL
   ============================================ */
let papaEditingId = null;
let papaSelectedCls = null;
let papaSelectedSprite = null;

function buildPapasList() {
  const wrap = document.getElementById('papasList');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (const p of state.papas) {
    const row = document.createElement('div');
    row.className = `papa-list-row ${p.cls}`;
    row.innerHTML = `
      <div class="papa-thumb"><img src="${SPRITES[p.sprite]}" alt=""></div>
      <div class="papa-meta">
        <div><b>${p.name}</b></div>
        <div class="sub">${p.budget}€/mes · sprite ${p.sprite}</div>
      </div>
      <button class="edit-btn" data-edit-papa-id="${p.id}">✎</button>
    `;
    row.querySelector('button').addEventListener('click', () => openPapaModal(p.id));
    wrap.appendChild(row);
  }
  const addBtn = document.getElementById('addPapaBtn');
  if (addBtn) {
    addBtn.disabled = state.papas.length >= MAX_PAPAS;
    addBtn.textContent = state.papas.length >= MAX_PAPAS ? t('settings.max_reached', { n: MAX_PAPAS }) : t('settings.add_papa');
  }
}
function openPapaModal(papaId = null) {
  papaEditingId = papaId;
  const p = papaId ? getPapaById(papaId) : null;
  document.getElementById('papaModalTitle').textContent = p ? t('modal.papa_edit_title', { name: p.name }) : t('modal.papa_new_title');
  document.getElementById('papaName').value = p?.name || '';
  document.getElementById('papaBudget').value = p?.budget ?? 100;
  papaSelectedCls = p?.cls || getAvailableColorSlots(null)[0] || 't-coral';
  papaSelectedSprite = p?.sprite || 'A_think';
  // Build color picker
  const colorWrap = document.getElementById('papaColorPicker');
  colorWrap.innerHTML = '';
  const available = getAvailableColorSlots(papaId);
  for (const cls of COLOR_SLOT_ORDER) {
    const slot = document.createElement('div');
    const taken = !available.includes(cls) && cls !== papaSelectedCls;
    slot.className = `color-slot ${cls}` + (cls === papaSelectedCls ? ' selected' : '') + (taken ? ' taken' : '');
    slot.dataset.cls = cls;
    if (!taken) {
      slot.addEventListener('click', () => {
        papaSelectedCls = cls;
        colorWrap.querySelectorAll('.color-slot').forEach(s => s.classList.remove('selected'));
        slot.classList.add('selected');
      });
    }
    colorWrap.appendChild(slot);
  }
  // Build sprite picker
  const spriteWrap = document.getElementById('papaSpritePicker');
  spriteWrap.innerHTML = '';
  for (const s of AVAILABLE_SPRITES) {
    const opt = document.createElement('div');
    opt.className = 'sprite-option' + (s.key === papaSelectedSprite ? ' selected' : '');
    opt.title = s.label;
    opt.innerHTML = `<img src="${s.file}" alt="">`;
    opt.addEventListener('click', () => {
      papaSelectedSprite = s.key;
      spriteWrap.querySelectorAll('.sprite-option').forEach(x => x.classList.remove('selected'));
      opt.classList.add('selected');
    });
    spriteWrap.appendChild(opt);
  }
  // Show delete button only when editing AND no expenses use this papa
  const delBtn = document.getElementById('papaDelete');
  delBtn.hidden = !p || papaHasExpenses(papaId);
  document.getElementById('papaModal').hidden = false;
  beep(900);
}
function closePapaModal() { document.getElementById('papaModal').hidden = true; papaEditingId = null; }
function savePapa() {
  const name = document.getElementById('papaName').value.trim();
  const budget = Math.max(0, parseFloat(document.getElementById('papaBudget').value) || 0);
  if (!name) { alert(t('alert.papa_needs_name')); return; }
  if (papaEditingId) {
    const p = getPapaById(papaEditingId);
    p.name = name; p.budget = budget;
    p.cls = papaSelectedCls; p.sprite = papaSelectedSprite;
  } else {
    if (state.papas.length >= MAX_PAPAS) { alert(t('alert.max_papas', { n: MAX_PAPAS })); return; }
    const slug = 'p' + Date.now().toString(36);
    state.papas.push({ id: slug, name, cls: papaSelectedCls, budget, sprite: papaSelectedSprite });
  }
  save();
  cloudPushAllPapas();
  rebuildPapaUI();
  closePapaModal();
  chime();
  speak('KRII-MOK!', papaEditingId ? t('speak.papa_updated') : t('speak.papa_new'));
}
function deletePapa() {
  if (!papaEditingId) return;
  if (papaHasExpenses(papaEditingId)) { alert(t('alert.cannot_delete_papa')); return; }
  if (!confirm(t('confirm.delete_papa'))) return;
  const deletedId = papaEditingId;
  state.papas = state.papas.filter(p => p.id !== deletedId);
  save();
  cloudDeletePapa(deletedId);
  rebuildPapaUI();
  closePapaModal();
  alertCry();
}
function rebuildPapaUI() {
  buildColonyDOM();
  buildFeedPapaSelector();
  buildPapasList();
  if (document.getElementById('historyPanel').classList.contains('show')) buildHistoryFilters();
  renderColony();
}

/* ============================================
   16. SETTLEMENT
   ============================================ */
let settleDir = 'gayle-to-isi';
function openSettleModal() {
  document.getElementById('settleAmount').value = '';
  document.getElementById('settleNote').value = '';
  document.getElementById('settleDate').value = todayYMD();
  document.querySelectorAll('#settleDir .tutor-btn').forEach(b => b.classList.toggle('active', b.dataset.settle === settleDir));
  document.getElementById('settleModal').hidden = false;
  setTimeout(() => document.getElementById('settleAmount').focus(), 50);
  beep(900);
}
function closeSettleModal() { document.getElementById('settleModal').hidden = true; }
function saveSettlement() {
  const amount = parseFloat(document.getElementById('settleAmount').value);
  if (isNaN(amount) || amount <= 0) { alert(t('alert.invalid_amount')); return; }
  const note = document.getElementById('settleNote').value.trim();
  const dateStr = document.getElementById('settleDate').value;
  let timestamp = Date.now();
  if (dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const now = new Date();
    timestamp = new Date(y, m-1, d, now.getHours(), now.getMinutes(), now.getSeconds()).getTime();
  }
  const [from, , to] = settleDir.split('-');
  const fromTutor = from === 'gayle' ? 'Gayle' : 'Isi';
  const toTutor   = to   === 'gayle' ? 'Gayle' : 'Isi';
  const settlement = {
    id: 's' + Date.now() + Math.random().toString(36).slice(2,6),
    papaId: 'settlement',
    type: 'settlement',
    fromTutor, toTutor,
    name: note,
    amount,
    tutor: fromTutor,
    timestamp,
    bornSick: false,
    split: null
  };
  state.expenses.push(settlement); save();
  cloudPushExpense(settlement);
  chime();
  speak('PLOK-MOK!', t('speak.settlement_done', { from: fromTutor, to: toTutor, amount: fmt(amount) }));
  closeSettleModal();
  renderDeudas(); renderHistory();
}

/* ============================================
   17. SETTINGS
   ============================================ */
function populateSettings() {
  buildPapasList();
  document.querySelectorAll('input[name="splitModel"]').forEach(r => r.checked = (r.value === state.settings.splitModel));
  document.getElementById('masterVolume').value  = Math.round((state.settings.masterVolume || 0.6) * 100);
  document.getElementById('volLabel').textContent = Math.round((state.settings.masterVolume || 0.6) * 100);
  document.getElementById('worldChatter').value  = state.settings.worldChatter || 'normal';
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === currentLang()));
  updateSaveLabel();
}
function saveSettings() {
  const sel = document.querySelector('input[name="splitModel"]:checked');
  if (sel) state.settings.splitModel = sel.value;
  state.settings.masterVolume = parseInt(document.getElementById('masterVolume').value, 10) / 100;
  state.settings.worldChatter = document.getElementById('worldChatter').value;
  setMasterVolume(state.settings.masterVolume);
  save();
  cloudPushSettings();
  renderColony(); renderDeudas();
  chime();
  speak('PLOK-MOK!', t('speak.settings_saved'));
}
function wipeAll() {
  if (!confirm(t('confirm.wipe_all_1'))) return;
  if (!confirm(t('confirm.wipe_all_2'))) return;
  const allIds = state.expenses.map(e => e.id);
  state.expenses = []; save();
  cloudDeleteExpensesByIds(allIds);
  alertCry(); setTimeout(chitter, 200);
  rebuildConceptHints();
  renderColony(); renderDeudas(); renderWorld();
}
function resetMonthBtn() {
  const key = monthKey(new Date());
  if (!confirm(t('confirm.wipe_month', { month: monthLabel(key) }))) return;
  const removed = state.expenses.filter(e => monthKey(new Date(e.timestamp)) === key).map(e => e.id);
  state.expenses = state.expenses.filter(e => monthKey(new Date(e.timestamp)) !== key);
  save();
  cloudDeleteExpensesByIds(removed);
  alertCry(); setTimeout(chitter, 200);
  rebuildConceptHints();
  renderColony(); renderDeudas(); renderWorld();
}

/* ============================================
   18. EXPORT / IMPORT
   ============================================ */
function isMobileViewport() { return window.matchMedia('(max-width: 600px)').matches; }

/* ============================================
   AMBIENT PARTICLES (floating throng dust)
   ============================================ */
function spawnAmbientParticles() {
  // limpia previos por si reinit
  document.querySelectorAll('.particle.ambient').forEach(p => p.remove());
  const count = isMobileViewport() ? 5 : 8;
  const colors = ['#ff6ec7', '#7df9aa', '#c89cff', '#fff66d', '#66ddff'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle ambient';
    p.style.left = (4 + Math.random() * 92) + '%';
    p.style.color = colors[Math.floor(Math.random() * colors.length)];
    p.style.setProperty('--dur', (10 + Math.random() * 8) + 's');
    p.style.setProperty('--delay', (-Math.random() * 12) + 's');
    p.style.setProperty('--drift', ((Math.random() - 0.5) * 80) + 'px');
    p.style.width = (3 + Math.random() * 3) + 'px';
    p.style.height = p.style.width;
    document.body.appendChild(p);
  }
}

/* ============================================
   26. PWA INSTALL PROMPT
   ============================================ */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

window.addEventListener('appinstalled', () => {
  hideInstallPrompt();
  deferredInstallPrompt = null;
});

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         document.referrer.startsWith('android-app://');
}
function isIOSDevice() { return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; }
function isAndroidDevice() { return /Android/.test(navigator.userAgent); }

function maybeShowInstallPrompt() {
  // Don't show if already installed
  if (isStandalone()) return;
  // Show on mobile always, on desktop only if browser supports install
  const modal = document.getElementById('installPrompt');
  const instructions = document.getElementById('installInstructions');
  const installBtn = document.getElementById('installNow');
  const laterBtn = document.getElementById('installLater');
  if (!modal) return;

  if (isIOSDevice()) {
    // iOS: no beforeinstallprompt → show manual instructions
    instructions.innerHTML = t('install.ios_steps');
    installBtn.textContent = t('install.got_it');
    installBtn.dataset.iosOnly = '1';
  } else if (deferredInstallPrompt) {
    // Android/Desktop with native prompt available
    instructions.textContent = isAndroidDevice() ? t('install.android_hint') : t('install.desktop_hint');
    installBtn.textContent = t('install.now');
    delete installBtn.dataset.iosOnly;
  } else if (isAndroidDevice()) {
    // Android but prompt not yet available — show hint anyway
    instructions.textContent = t('install.android_hint');
    installBtn.textContent = t('install.now');
    delete installBtn.dataset.iosOnly;
  } else {
    // Desktop without beforeinstallprompt (Firefox, etc.): skip
    return;
  }
  laterBtn.textContent = t('install.later');
  modal.hidden = false;
}
function hideInstallPrompt() {
  const m = document.getElementById('installPrompt');
  if (m) m.hidden = true;
}
async function triggerInstall() {
  const btn = document.getElementById('installNow');
  if (btn && btn.dataset.iosOnly === '1') {
    // iOS: just dismiss (no programmatic install possible)
    hideInstallPrompt();
    return;
  }
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    try {
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') hideInstallPrompt();
    } catch (e) { console.warn('install prompt', e); }
    deferredInstallPrompt = null;
  } else {
    // No prompt available — just close
    hideInstallPrompt();
  }
}

async function forceRefresh() {
  if (!confirm(t('confirm.force_refresh'))) return;
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch (e) {
    console.warn('forceRefresh cleanup', e);
  }
  // bypass cache on reload
  location.reload();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `throngwallet-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  chime();
  speak('PLOK!', t('speak.copy_exported'));
}
function triggerImport() { document.getElementById('importFile').click(); }
function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      const migrated = migrate(parsed);
      if (!migrated) throw new Error('Formato inválido');
      if (!confirm(t('confirm.import', { local: state.expenses.length, remote: migrated.expenses.length }))) return;
      state = migrated;
      save();
      rebuildConceptHints();
      rebuildPapaUI();
      renderColony(); renderDeudas(); populateSettings();
      if (currentView === 'world') renderWorld();
      if (currentView === 'stats') renderStats();
      chime();
      speak('KRII-MOK!', t('speak.thronglets_awakened', { n: state.expenses.length }));
      if (cloudConnected) {
        await pushAllLocalToCloud();
        speak('PLOK-MOK!', t('speak.imported_synced'));
      }
    } catch (err) {
      alert(t('alert.import_error', { msg: err.message }));
    }
  };
  reader.readAsText(file);
}

async function pushAllLocalToCloud() {
  if (!cloudConnected || !supabaseClient) return;
  const { household } = getCloudCreds();
  if (!household) return;
  try {
    // Borrar de la nube lo que ya no existe localmente
    const [expRes, papasRes] = await Promise.all([
      supabaseClient.from('expenses').select('id').eq('household_id', household),
      supabaseClient.from('papas').select('id').eq('household_id', household)
    ]);
    const cloudExpIds = new Set((expRes.data || []).map(r => r.id));
    const cloudPapaIds = new Set((papasRes.data || []).map(r => r.id));
    const localExpIds = new Set(state.expenses.map(e => e.id));
    const localPapaIds = new Set(state.papas.map(p => p.id));
    const expsToDelete = [...cloudExpIds].filter(id => !localExpIds.has(id));
    const papasToDelete = [...cloudPapaIds].filter(id => !localPapaIds.has(id));
    if (expsToDelete.length > 0) {
      expsToDelete.forEach(id => ignoreEcho.add('e:DELETE:' + id));
      await supabaseClient.from('expenses').delete().eq('household_id', household).in('id', expsToDelete);
    }
    if (papasToDelete.length > 0) {
      papasToDelete.forEach(id => ignoreEcho.add('p:DELETE:' + id));
      await supabaseClient.from('papas').delete().eq('household_id', household).in('id', papasToDelete);
    }
    // Subir todo lo local
    if (state.expenses.length > 0) {
      state.expenses.forEach(e => { ignoreEcho.add('e:INSERT:' + e.id); ignoreEcho.add('e:UPDATE:' + e.id); });
      await supabaseClient.from('expenses').upsert(state.expenses.map(expenseToRow));
    }
    if (state.papas.length > 0) {
      state.papas.forEach(p => { ignoreEcho.add('p:INSERT:' + p.id); ignoreEcho.add('p:UPDATE:' + p.id); });
      await supabaseClient.from('papas').upsert(state.papas.map(papaToRow));
    }
    ignoreEcho.add('s');
    await supabaseClient.from('app_settings').upsert(settingsRowOut());
  } catch (e) {
    console.warn('pushAllLocalToCloud', e);
    alert(t('alert.post_import_cloud'));
  }
}

/* ============================================
   19. AUTOCOMPLETE (concepto)
   ============================================ */
function rebuildConceptHints() {
  const list = document.getElementById('conceptHints');
  if (!list) return;
  const seen = new Set();
  for (const e of state.expenses) {
    if (e.type !== 'expense') continue;
    if (e.name && e.name.length > 0) seen.add(e.name);
  }
  list.innerHTML = '';
  for (const name of [...seen].sort()) {
    const opt = document.createElement('option');
    opt.value = name;
    list.appendChild(opt);
  }
  renderQuickChips();
}

/* Quick-add chips: top 5 most-frequent concepts of last 6 months
   Tap → fills concepto + last amount + last papa + last tutor in one go. */
function renderQuickChips() {
  const container = document.getElementById('quickChips');
  if (!container) return;
  const counts = {};
  const last6 = new Set();
  let m = monthKey(new Date());
  for (let i = 0; i < 6; i++) { last6.add(m); m = shiftMonth(m, -1); }
  for (const e of state.expenses) {
    if (e.type === 'settlement') continue;
    if (!e.name) continue;
    if (!last6.has(monthKey(new Date(e.timestamp)))) continue;
    if (!counts[e.name]) counts[e.name] = { count: 0, lastAmount: e.amount, lastPapa: e.papaId, lastTutor: e.tutor, lastSplit: e.split, lastTs: e.timestamp };
    counts[e.name].count++;
    if (e.timestamp > counts[e.name].lastTs) {
      counts[e.name].lastAmount = e.amount;
      counts[e.name].lastPapa = e.papaId;
      counts[e.name].lastTutor = e.tutor;
      counts[e.name].lastSplit = e.split;
      counts[e.name].lastTs = e.timestamp;
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  container.innerHTML = '';
  if (top.length === 0) { container.style.display = 'none'; return; }
  container.style.display = '';
  for (const [name, info] of top) {
    const papa = getPapaById(info.lastPapa);
    const chip = document.createElement('button');
    chip.className = 'quick-chip ' + (papa?.cls || '');
    chip.type = 'button';
    chip.title = name + ' · ' + fmt(info.lastAmount) + '€ · ' + (papa?.name || '');
    chip.innerHTML = `<span class="chip-name">${name}</span><span class="chip-amount">${fmt(info.lastAmount)}€</span>`;
    chip.addEventListener('click', () => {
      document.getElementById('concepto').value = name;
      document.getElementById('amount').value = info.lastAmount;
      if (info.lastPapa && getPapaById(info.lastPapa)) selectPapaUI(info.lastPapa);
      if (info.lastTutor) selectTutorUI(info.lastTutor);
      if (info.lastSplit) {
        const key = splitKey(info.lastSplit);
        const sel = document.getElementById('splitSelect');
        if (sel) { sel.value = key; selectedSplit = key; }
      }
      beep(1300);
      // pequeño "wiggle" del chip
      chip.classList.add('chip-pop');
      setTimeout(() => chip.classList.remove('chip-pop'), 250);
      // foco en el feed
      document.getElementById('amount').focus();
    });
    container.appendChild(chip);
  }
}

/* ============================================
   20. EVENT BINDING
   ============================================ */
function bindEvents() {
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => showView(t.dataset.view)));
  document.querySelectorAll('.tutor-btn[data-tutor]').forEach(b => b.addEventListener('click', () => { selectTutorUI(b.dataset.tutor); beep(b.dataset.tutor === 'Isi' ? 1400 : 900); }));
  document.getElementById('splitSelect').addEventListener('change', (e) => { selectedSplit = e.target.value; beep(900); });

  document.getElementById('feedBtn').addEventListener('click', feed);
  document.getElementById('concepto').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('amount').focus(); });
  document.getElementById('amount').addEventListener('keydown', e => { if (e.key === 'Enter') feed(); });

  document.getElementById('prevMonth').addEventListener('click', () => { worldMonthKey = shiftMonth(worldMonthKey, -1); renderWorld(); beep(700); });
  document.getElementById('nextMonth').addEventListener('click', () => { worldMonthKey = shiftMonth(worldMonthKey, +1); renderWorld(); beep(1100); });
  document.getElementById('todayBtn').addEventListener('click', () => { worldMonthKey = monthKey(new Date()); renderWorld(); beep(1500); });
  document.getElementById('historyBtn').addEventListener('click', toggleHistory);
  document.getElementById('historyClose').addEventListener('click', toggleHistory);
  document.getElementById('historySearch').addEventListener('input', (e) => { historySearch = e.target.value; renderHistory(); });

  document.getElementById('masterVolume').addEventListener('input', (e) => {
    document.getElementById('volLabel').textContent = e.target.value;
    if (audio) setMasterVolume(parseInt(e.target.value,10) / 100);
  });
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('wipeAllBtn').addEventListener('click', wipeAll);
  document.getElementById('resetMonthBtn').addEventListener('click', resetMonthBtn);

  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', triggerImport);
  document.getElementById('importFile').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (f) handleImportFile(f); e.target.value = '';
  });

  document.getElementById('returnBtn').addEventListener('click', () => { if (currentSpeechExpenseId) returnToPapa(currentSpeechExpenseId); });

  // Edit expense modal
  document.getElementById('editClose').addEventListener('click', closeEditModal);
  document.getElementById('editCancel').addEventListener('click', closeEditModal);
  document.getElementById('editSave').addEventListener('click', saveEdit);
  document.getElementById('editModal').addEventListener('click', (e) => { if (e.target.id === 'editModal') closeEditModal(); });
  document.querySelectorAll('#editTutorSelector .tutor-btn').forEach(b => b.addEventListener('click', () => {
    editTutor = b.dataset.editTutor;
    document.querySelectorAll('#editTutorSelector .tutor-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  }));

  // Papa modal
  document.getElementById('addPapaBtn').addEventListener('click', () => openPapaModal(null));
  document.getElementById('papaClose').addEventListener('click', closePapaModal);
  document.getElementById('papaCancel').addEventListener('click', closePapaModal);
  document.getElementById('papaSave').addEventListener('click', savePapa);
  document.getElementById('papaDelete').addEventListener('click', deletePapa);
  document.getElementById('papaModal').addEventListener('click', (e) => { if (e.target.id === 'papaModal') closePapaModal(); });

  // Settlement
  document.getElementById('settleBtn').addEventListener('click', openSettleModal);
  document.getElementById('settleClose').addEventListener('click', closeSettleModal);
  document.getElementById('settleCancel').addEventListener('click', closeSettleModal);
  document.getElementById('settleSave').addEventListener('click', saveSettlement);
  document.getElementById('settleModal').addEventListener('click', (e) => { if (e.target.id === 'settleModal') closeSettleModal(); });
  document.querySelectorAll('#settleDir .tutor-btn').forEach(b => b.addEventListener('click', () => {
    settleDir = b.dataset.settle;
    document.querySelectorAll('#settleDir .tutor-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  }));

  // Language toggle
  document.querySelectorAll('.lang-btn').forEach(b => b.addEventListener('click', () => {
    setLanguage(b.dataset.lang);
    beep(b.dataset.lang === 'en' ? 1200 : 900);
  }));

  // Force refresh button
  const frBtn = document.getElementById('forceRefreshBtn');
  if (frBtn) frBtn.addEventListener('click', forceRefresh);

  // Install prompt buttons
  const installNowBtn = document.getElementById('installNow');
  const installLaterBtn = document.getElementById('installLater');
  if (installNowBtn) installNowBtn.addEventListener('click', triggerInstall);
  if (installLaterBtn) installLaterBtn.addEventListener('click', hideInstallPrompt);


  // Boot
  document.getElementById('boot').addEventListener('click', () => {
    ensureAudio();
    document.getElementById('boot').classList.add('hide');
    modemDial();
    spawnAmbientParticles();
    setTimeout(() => speakSet('idle'), 600);
    setTimeout(() => maybeShowInstallPrompt(), 1200);
  });

  window.addEventListener('resize', () => {
    if (currentView === 'world') renderWorld();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('editModal').hidden) closeEditModal();
      else if (!document.getElementById('papaModal').hidden) closePapaModal();
      else if (!document.getElementById('settleModal').hidden) closeSettleModal();
      else if (document.getElementById('historyPanel').classList.contains('show')) toggleHistory();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopWorldTick();
    else if (currentView === 'world') startWorldTick();
  });
}

/* ============================================
   22. CLOUD SYNC (Supabase)
   ============================================ */
const CLOUD_SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
const SB_URL_KEY = 'thrungs-sb-url';
const SB_KEY_KEY = 'thrungs-sb-key';
const SB_HH_KEY  = 'thrungs-sb-household';

let supabaseClient = null;
let cloudConnected = false;
let realtimeChannel = null;
const ignoreEcho = new Set(); // mute realtime echo of our own writes

function getCloudCreds() {
  return {
    url: localStorage.getItem(SB_URL_KEY) || '',
    key: localStorage.getItem(SB_KEY_KEY) || '',
    household: localStorage.getItem(SB_HH_KEY) || ''
  };
}
function setCloudCreds({ url, key, household }) {
  if (url !== undefined) { url ? localStorage.setItem(SB_URL_KEY, url) : localStorage.removeItem(SB_URL_KEY); }
  if (key !== undefined) { key ? localStorage.setItem(SB_KEY_KEY, key) : localStorage.removeItem(SB_KEY_KEY); }
  if (household !== undefined) { household ? localStorage.setItem(SB_HH_KEY, household) : localStorage.removeItem(SB_HH_KEY); }
}

async function loadCloudSDK() {
  if (window.supabase) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CLOUD_SDK_URL;
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = () => reject(new Error('No se pudo cargar Supabase SDK (¿offline?)'));
    document.head.appendChild(s);
  });
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function updateCloudUI(status, msg) {
  const pill = document.getElementById('cloudPill');
  const statusEl = document.getElementById('cloudStatus');
  const householdEl = document.getElementById('cloudHousehold');
  const inviteBtn = document.getElementById('inviteBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const connectBtn = document.getElementById('connectBtn');
  const { household, url, key } = getCloudCreds();

  if (pill) {
    pill.classList.remove('cloud-online', 'cloud-syncing', 'cloud-offline', 'cloud-error');
    if (status === 'connected')      { pill.classList.add('cloud-online');  pill.textContent = t('cloud.live'); }
    else if (status === 'connecting'){ pill.classList.add('cloud-syncing'); pill.textContent = t('cloud.connecting'); }
    else if (status === 'error')     { pill.classList.add('cloud-error');   pill.textContent = t('cloud.error'); }
    else                              { pill.classList.add('cloud-offline'); pill.textContent = t('cloud.local'); }
  }
  if (statusEl) {
    statusEl.textContent = status === 'connected' ? t('cloud.status.connected')
                         : status === 'connecting' ? t('cloud.status.connecting')
                         : status === 'error' ? t('cloud.status.error', { msg: msg || '?' })
                         : t('cloud.status.disconnected');
  }
  if (householdEl) householdEl.textContent = household || t('pwa.dash');
  if (document.getElementById('cloudUrl') && !document.getElementById('cloudUrl').value) document.getElementById('cloudUrl').value = url;
  if (document.getElementById('cloudKey') && !document.getElementById('cloudKey').value) document.getElementById('cloudKey').value = key;
  if (inviteBtn) inviteBtn.disabled = status !== 'connected';
  if (disconnectBtn) disconnectBtn.disabled = status !== 'connected';
  if (connectBtn) connectBtn.textContent = status === 'connected' ? t('cloud.connected_btn') : t('cloud.connect');
}
function flashCloud() {
  const pill = document.getElementById('cloudPill');
  if (!pill || !cloudConnected) return;
  pill.classList.remove('flash');
  void pill.offsetWidth;
  pill.classList.add('flash');
}

/* === Row conversions === */
function expenseToRow(e) {
  const { household } = getCloudCreds();
  return {
    id: e.id, household_id: household,
    papa_id: e.papaId, name: e.name, amount: e.amount,
    tutor: e.tutor, ts: e.timestamp, born_sick: !!e.bornSick,
    split: e.split || null, type: e.type || 'expense',
    from_tutor: e.fromTutor || null, to_tutor: e.toTutor || null,
    updated_at: new Date().toISOString()
  };
}
function rowToExpense(r) {
  return {
    id: r.id, papaId: r.papa_id, name: r.name, amount: parseFloat(r.amount),
    tutor: r.tutor, timestamp: parseInt(r.ts, 10),
    bornSick: !!r.born_sick, split: r.split,
    type: r.type || 'expense',
    fromTutor: r.from_tutor || undefined,
    toTutor: r.to_tutor || undefined
  };
}
function papaToRow(p, idx) {
  const { household } = getCloudCreds();
  return {
    id: p.id, household_id: household, name: p.name, cls: p.cls,
    budget: p.budget, sprite: p.sprite, position: idx,
    updated_at: new Date().toISOString()
  };
}
function rowToPapa(r) {
  return { id: r.id, name: r.name, cls: r.cls, budget: parseFloat(r.budget), sprite: r.sprite };
}
function settingsRowOut() {
  const { household } = getCloudCreds();
  return {
    household_id: household,
    split_model: state.settings.splitModel,
    master_volume: state.settings.masterVolume,
    world_chatter: state.settings.worldChatter,
    updated_at: new Date().toISOString()
  };
}
function settingsRowIn(r) {
  return { splitModel: r.split_model, masterVolume: parseFloat(r.master_volume), worldChatter: r.world_chatter };
}

/* === Connect / Disconnect === */
async function connectCloud(creds) {
  const url = creds?.url ?? localStorage.getItem(SB_URL_KEY);
  const key = creds?.key ?? localStorage.getItem(SB_KEY_KEY);
  let household = creds?.household ?? localStorage.getItem(SB_HH_KEY);
  if (!url || !key) { updateCloudUI('error', 'Faltan URL o KEY'); return false; }
  try {
    updateCloudUI('connecting');
    await loadCloudSDK();
    supabaseClient = window.supabase.createClient(url, key, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
    if (!household) {
      const newId = uuid();
      const { error } = await supabaseClient.from('households').insert({ id: newId });
      if (error && !String(error.message || '').includes('duplicate')) throw error;
      household = newId;
    }
    setCloudCreds({ url, key, household });
    cloudConnected = true;
    await mergeWithCloud();
    setupRealtime(household);
    updateCloudUI('connected');
    return true;
  } catch (err) {
    console.error('connectCloud', err);
    cloudConnected = false;
    supabaseClient = null;
    updateCloudUI('error', err.message);
    return false;
  }
}
function disconnectCloud() {
  if (realtimeChannel && supabaseClient) supabaseClient.removeChannel(realtimeChannel);
  realtimeChannel = null;
  supabaseClient = null;
  cloudConnected = false;
  updateCloudUI('disconnected');
  speak('PONG...', t('speak.cloud_disconnected'), '');
}

/* === Merge on connect: cloud wins on conflicts, local-only items get pushed === */
async function mergeWithCloud() {
  if (!supabaseClient) return;
  const { household } = getCloudCreds();
  if (!household) return;
  const [expRes, papasRes, settingsRes] = await Promise.all([
    supabaseClient.from('expenses').select('*').eq('household_id', household),
    supabaseClient.from('papas').select('*').eq('household_id', household).order('position'),
    supabaseClient.from('app_settings').select('*').eq('household_id', household).maybeSingle()
  ]);
  if (expRes.error) throw expRes.error;
  if (papasRes.error) throw papasRes.error;

  const cloudExpenses = (expRes.data || []).map(rowToExpense);
  const cloudPapas = (papasRes.data || []).map(rowToPapa);

  // Expenses merge: cloud wins, push local-only
  const cloudExpIds = new Set(cloudExpenses.map(e => e.id));
  const localOnlyExp = state.expenses.filter(e => !cloudExpIds.has(e.id));
  state.expenses = [...cloudExpenses, ...localOnlyExp];

  if (cloudPapas.length > 0) {
    const cloudPapaIds = new Set(cloudPapas.map(p => p.id));
    const localOnlyPapas = state.papas.filter(p => !cloudPapaIds.has(p.id));
    state.papas = [...cloudPapas, ...localOnlyPapas].slice(0, MAX_PAPAS);
  }
  if (settingsRes.data) state.settings = Object.assign({}, state.settings, settingsRowIn(settingsRes.data));

  // Push local-only items so the other side gets them too
  if (localOnlyExp.length > 0) {
    await supabaseClient.from('expenses').upsert(localOnlyExp.map(expenseToRow));
  }
  if (cloudPapas.length === 0 && state.papas.length > 0) {
    await supabaseClient.from('papas').upsert(state.papas.map(papaToRow));
  }
  if (!settingsRes.data) {
    await supabaseClient.from('app_settings').upsert(settingsRowOut());
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(BACKUP_KEY, JSON.stringify({ data: state, savedAt: Date.now() }));
  lastSavedAt = Date.now();
  pulseSaveIndicator();

  rebuildPapaUI();
  renderColony(); renderDeudas();
  rebuildConceptHints();
  if (currentView === 'world') renderWorld();
  if (currentView === 'stats') renderStats();
  if (document.getElementById('historyPanel').classList.contains('show')) { buildHistoryFilters(); renderHistory(); }
}

/* === Realtime subscription === */
function setupRealtime(household) {
  if (realtimeChannel && supabaseClient) supabaseClient.removeChannel(realtimeChannel);
  realtimeChannel = supabaseClient
    .channel('thrungs:' + household)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses',     filter: `household_id=eq.${household}` }, onRemoteExpense)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'papas',        filter: `household_id=eq.${household}` }, onRemotePapa)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: `household_id=eq.${household}` }, onRemoteSettings)
    .subscribe();
}
function onRemoteExpense(payload) {
  const { eventType, new: row, old: oldRow } = payload;
  const id = (row?.id) || (oldRow?.id);
  if (!id) return;
  const echoKey = 'e:' + eventType + ':' + id;
  if (ignoreEcho.has(echoKey)) { ignoreEcho.delete(echoKey); return; }
  if (eventType === 'DELETE') {
    state.expenses = state.expenses.filter(e => e.id !== id);
  } else {
    const incoming = rowToExpense(row);
    const idx = state.expenses.findIndex(e => e.id === id);
    if (idx >= 0) state.expenses[idx] = incoming;
    else state.expenses.push(incoming);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  rebuildConceptHints();
  refreshAfterRemote();
  flashCloud();
}
function onRemotePapa(payload) {
  const { eventType, new: row, old: oldRow } = payload;
  const id = (row?.id) || (oldRow?.id);
  if (!id) return;
  const echoKey = 'p:' + eventType + ':' + id;
  if (ignoreEcho.has(echoKey)) { ignoreEcho.delete(echoKey); return; }
  if (eventType === 'DELETE') state.papas = state.papas.filter(p => p.id !== id);
  else {
    const incoming = rowToPapa(row);
    const idx = state.papas.findIndex(p => p.id === id);
    if (idx >= 0) state.papas[idx] = incoming;
    else state.papas.push(incoming);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  rebuildPapaUI();
  refreshAfterRemote();
  flashCloud();
}
function onRemoteSettings(payload) {
  if (payload.eventType === 'DELETE') return;
  if (ignoreEcho.has('s')) { ignoreEcho.delete('s'); return; }
  state.settings = Object.assign({}, state.settings, settingsRowIn(payload.new));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (currentView === 'settings') populateSettings();
  if (audio) setMasterVolume(state.settings.masterVolume);
  renderDeudas();
  flashCloud();
}
function refreshAfterRemote() {
  if (currentView === 'colony') { renderColony(); renderDeudas(); }
  else if (currentView === 'world') renderWorld();
  else if (currentView === 'stats') renderStats();
  if (document.getElementById('historyPanel').classList.contains('show')) renderHistory();
}

/* === Push helpers (called from mutation points) === */
async function cloudPushExpense(expense) {
  if (!cloudConnected || !supabaseClient) return;
  ignoreEcho.add('e:INSERT:' + expense.id);
  ignoreEcho.add('e:UPDATE:' + expense.id);
  try { await supabaseClient.from('expenses').upsert(expenseToRow(expense)); }
  catch (e) { console.warn('cloudPushExpense', e); }
}
async function cloudDeleteExpense(expenseId) {
  if (!cloudConnected || !supabaseClient) return;
  ignoreEcho.add('e:DELETE:' + expenseId);
  const { household } = getCloudCreds();
  try { await supabaseClient.from('expenses').delete().eq('household_id', household).eq('id', expenseId); }
  catch (e) { console.warn('cloudDeleteExpense', e); }
}
async function cloudDeleteExpensesByIds(ids) {
  if (!cloudConnected || !supabaseClient || ids.length === 0) return;
  ids.forEach(id => ignoreEcho.add('e:DELETE:' + id));
  const { household } = getCloudCreds();
  try { await supabaseClient.from('expenses').delete().eq('household_id', household).in('id', ids); }
  catch (e) { console.warn('cloudDeleteExpensesByIds', e); }
}
async function cloudPushAllPapas() {
  if (!cloudConnected || !supabaseClient) return;
  state.papas.forEach(p => { ignoreEcho.add('p:INSERT:' + p.id); ignoreEcho.add('p:UPDATE:' + p.id); });
  try { await supabaseClient.from('papas').upsert(state.papas.map(papaToRow)); }
  catch (e) { console.warn('cloudPushAllPapas', e); }
}
async function cloudDeletePapa(papaId) {
  if (!cloudConnected || !supabaseClient) return;
  ignoreEcho.add('p:DELETE:' + papaId);
  const { household } = getCloudCreds();
  try { await supabaseClient.from('papas').delete().eq('household_id', household).eq('id', papaId); }
  catch (e) { console.warn('cloudDeletePapa', e); }
}
async function cloudPushSettings() {
  if (!cloudConnected || !supabaseClient) return;
  ignoreEcho.add('s');
  try { await supabaseClient.from('app_settings').upsert(settingsRowOut()); }
  catch (e) { console.warn('cloudPushSettings', e); }
}

/* === Invitation URL === */
function buildInvitationUrl() {
  const { url, key, household } = getCloudCreds();
  if (!url || !key || !household) return '';
  const base = window.location.origin + window.location.pathname;
  const p = new URLSearchParams({ sb_url: url, sb_key: key, h: household });
  return base + '?' + p.toString();
}
async function copyInvitationUrl() {
  const link = buildInvitationUrl();
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    chime();
    speak('KRII!', t('speak.url_copied'), '');
  } catch {
    prompt(t('speak.url_copied'), link);
  }
}

function consumeUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const url = params.get('sb_url');
  const key = params.get('sb_key');
  const household = params.get('h');
  if (url || key || household) {
    setCloudCreds({
      url: url || undefined,
      key: key || undefined,
      household: household || undefined
    });
    window.history.replaceState({}, '', window.location.pathname);
    return true;
  }
  return false;
}

/* ============================================
   23. CLOUD UI BINDINGS
   ============================================ */
function bindCloudEvents() {
  document.getElementById('connectBtn').addEventListener('click', async () => {
    const url = document.getElementById('cloudUrl').value.trim();
    const key = document.getElementById('cloudKey').value.trim();
    if (!url || !key) { alert(t('alert.connect_missing')); return; }
    setCloudCreds({ url, key });
    const ok = await connectCloud({ url, key });
    if (ok) { chime(); speak('KRII-MOK!', t('speak.cloud_connected'), ''); }
  });
  document.getElementById('disconnectBtn').addEventListener('click', () => {
    if (confirm(t('confirm.disconnect_cloud'))) disconnectCloud();
  });
  document.getElementById('inviteBtn').addEventListener('click', copyInvitationUrl);
}

/* ============================================
   25. INIT
   ============================================ */
function init() {
  bindEvents();
  bindCloudEvents();

  // Si nos abren con ?sb_url=...&sb_key=...&h=..., guardamos las credenciales
  const camePresetFromURL = consumeUrlParams();

  applyTranslations();

  buildColonyDOM();
  buildFeedPapaSelector();
  buildPapasList();
  rebuildConceptHints();
  selectTutorUI('Isi');
  document.getElementById('expenseDate').value = todayYMD();
  document.getElementById('splitSelect').value = '50/50';
  renderColony(); renderDeudas();
  populateSettings();

  if (state.expenses.length > 0) {
    try { const wrap = JSON.parse(localStorage.getItem(BACKUP_KEY)); if (wrap?.savedAt) lastSavedAt = wrap.savedAt; } catch(e) {}
  }
  updateSaveLabel();
  updateCloudUI('disconnected');

  // Auto-connect si hay credenciales guardadas (o vinieron por URL)
  const creds = getCloudCreds();
  if (creds.url && creds.key) {
    connectCloud().then(ok => {
      if (ok && camePresetFromURL) {
        speak('KRII-MOK!', t('speak.cloud_connected'), '');
      }
    }).catch(e => console.warn('auto-connect', e));
  }
}
init();

setInterval(() => { if (!document.hidden) ambientTick(); }, 2200);
setInterval(maybePlayMelody, 4500);
setInterval(() => { if (currentView === 'colony' && audio && Math.random() < 0.12 && !document.hidden) chitter(); }, 9000);
setInterval(updateSaveLabel, 10000);
