/* ===============================================
   THRONG-WALLET // app.js (v1.7)
   ─────────────────────────────────────────────
   Highlights:
   - PWA (network-first SW, offline)
   - Papas custom (state.papas dinámico, max 6 slots)
   - Reparto por gasto (50/50, 100% Isi, 100% Gayle)
   - Liquidaciones entre tutores — solo desde HISTORY
     (cualquier ciclo, retroactivo)
   - Mandelbrot background en mundos liquidados,
     paleta basada en los papas de ese mes
   - Settle ritual: animación cinemática full-screen
     (vignette + rays + monedas volando + sonido)
   - Templo del Ahorro (metas comunes)
   - Cloud sync Supabase + i18n ES/EN + Música BG
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
  lang: 'es',
  musicPlaying: true,
  musicVolume: 0.4
};

const BGM_FILE = '05. Welcome Progress.mp3';

/* ============================================
   1b. i18n (LOCALES, t() helper)
   ============================================ */
const LOCALES = {
  es: {
    'tab.colony': 'COLONIA', 'tab.world': 'MUNDO', 'tab.universe': 'UNIVERSO', 'tab.stats': 'STATS', 'tab.temple': 'TEMPLO', 'tab.settings': 'AJUSTES',
    'universe.title': 'UNIVERSO THRONG',
    'universe.total': 'THRONGS',
    'universe.moons': 'LUNAS',
    'universe.hint': 'arrastra el mapa · toca un throng',
    'universe.legend_tip': 'TODA la historia en un solo mapa',
    'universe.empty': 'Aún no hay Throngs en el universo.',
    'hud.projection': 'PROY',
    'temple.title': '🏛 TEMPLO DEL AHORRO',
    'temple.hint': 'Metas comunes de ahorro. Cada vez que metáis dinero, los Thronglets peregrinan al templo.',
    'temple.add_goal': '➕ NUEVA META',
    'temple.empty': 'Aún no hay metas. Crea la primera y empezad a peregrinar.',
    'goal.title': 'META DE AHORRO',
    'goal.new': 'NUEVA META',
    'goal.edit': 'EDITAR META',
    'goal.name': 'Nombre de la meta',
    'goal.target': 'Objetivo (€)',
    'goal.deadline_opt': 'Fecha objetivo (opcional)',
    'goal.emoji': 'Emoji / símbolo',
    'goal.until': 'hasta',
    'goal.add_savings': 'AÑADIR AHORRO',
    'goal.completed': 'COMPLETADA',
    'confirm.delete_goal': '¿Borrar esta meta? Se perderán todas las aportaciones registradas.',
    'savings.title': '💰 AÑADIR AHORRO',
    'savings.amount': 'Importe (€)',
    'savings.tutor': 'Quien aporta',
    'savings.both': 'AMBOS',
    'savings.note': 'Nota (opcional)',
    'savings.add': 'AÑADIR',
    'settings.music': '🎵 MÚSICA DE FONDO',
    'settings.music_hint': 'Música ambiental Throng. Empieza al entrar a la app.',
    'settings.music_play': 'REPRODUCIR',
    'settings.music_vol': 'VOL. MÚSICA',
    'settings.music_manual': '▶ INICIAR MÚSICA',
    'speak.goal_created': 'Meta creada en el templo.',
    'speak.goal_updated': 'Meta actualizada.',
    'speak.goal_completed': '¡META «{name}» COMPLETADA, tutor!',
    'speak.goal_progress': '«{name}»: te quedan {remaining} €.',
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
    'deudas.settle_hint_history': 'liquida desde 📜 HISTÓRICO',
    'ritual.title': 'LIQUIDACIÓN',
    'ritual.tagline': 'EL CICLO SE CIERRA',
    'celeb.title': '¡META ALCANZADA!',
    'month_end.eyebrow': 'CICLO CERRADO',
    'month_end.tagline': 'EL THRONG RECUERDA',
    'month_end.continue': 'CONTINUAR',
    'month_end.spent': 'GASTADO',
    'month_end.thronglets': 'THRONGS NACIDOS',
    'month_end.balance': 'BALANCE',
    'month_end.balanced': 'EN EQUILIBRIO',
    'cycles.title': 'CICLOS HISTÓRICOS',
    'cycles.balanced': '⚖ EQUILIBRADO',
    'cycles.settled': '✓ LIQUIDADO',
    'cycles.pending': '⚠ PENDIENTE',
    'cycles.overpaid': 'SOBREPAGADO',
    'cycles.no_expenses': '— sin gastos —',
    'feed.papa': 'PAPA', 'feed.tutor': 'TUTOR', 'feed.amount': '€', 'feed.date': 'FECHA', 'feed.split': 'REPARTO', 'feed.feed': 'ALIMENTAR',
    'feed.sheet_title': 'NUEVO GASTO',
    'feed.concept_placeholder': 'concepto (cena indio, netflix...)',
    'feed.split.5050': '50 / 50', 'feed.split.100isi': '100% ISI', 'feed.split.100gayle': '100% GAYLE',
    'split.half': 'A MEDIAS',
    'split.owed_full': 'ME LO DEBE ENTERO',
    'split.absorb': 'LO ASUMO YO (sin deuda)',
    'split.no_debt': 'SIN DEUDA',
    'split.g_owes_all': 'G DEBE 100%',
    'split.i_owes_all': 'I DEBE 100%',
    'split.explain_half': '{payer} pagó · {other} le debe la mitad',
    'split.explain_owed': '{payer} pagó · {other} le debe TODO',
    'split.explain_absorb': '{payer} pagó y lo asume · no genera deuda',
    'review.title': '🔍 REVISAR REPARTOS AL 100%',
    'review.hint': 'Estos gastos tienen reparto del 100% (no van a medias). Antes de v2.2 la etiqueta era ambigua, así que revisa que cada uno haga lo que esperas. Toca un gastito para cambiarlo.',
    'review.none': 'No hay gastos con reparto al 100%. Todo va a medias. ✓',
    'review.effect_no_debt': 'no genera deuda',
    'review.effect_owes': '{debtor} debe {amount} €',
    'review.flip': '⇄ CAMBIAR',
    'review.paid_by': 'pagó {tutor}',
    'world.title_prefix': 'MUNDO · ', 'world.today': 'HOY', 'world.history': '📜 HISTÓRICO',
    'world.empty': 'esta luna aún no ha visto Thronglets',
    'world.empty_hint': 've a la COLONIA y aliméntalos',
    'world.legend_recurring': '♺ SUSCRI = recurrente',
    'world.legend_tip': 'clica para oír · cuando chocan cantan',
    'history.title_prefix': 'HISTÓRICO · ', 'history.search_placeholder': 'buscar concepto...',
    'history.filter.all': 'TODOS', 'history.filter.settlement': 'LIQUID.',
    'history.empty': 'Sin Thronglets en esta selección.',
    'history.total_isi': 'ISI', 'history.total_gayle': 'GAYLE', 'history.total_all': 'TOTAL',
    'history.settle_cycle': '💸 LIQUIDAR ESTE CICLO',
    'history.settle_cycle_done': '✓ CICLO LIQUIDADO',
    'history.cycle_balanced': '⚖ CICLO EN EQUILIBRIO',
    'history.cycle_debt': '⚠ DEUDA DEL CICLO',
    'settle.balance_for': 'Balance de {month}:',
    'settle.prefilled_hint': '(ya rellenado, edítalo si quieres)',
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
    'backup.auto_title': '🛡 AUTO-BACKUP (recomendado)',
    'backup.auto_hint': 'Elige una carpeta del disco una sola vez. Cada cambio se guarda ahí en silencio + 7 snapshots diarios rotativos. Nunca más te preocupas.',
    'backup.pick_folder': '🗂 ELEGIR CARPETA',
    'backup.change_folder': '🔁 CAMBIAR CARPETA',
    'backup.forget_folder': 'OLVIDAR',
    'backup.fs_unsupported': 'Este navegador no soporta File System Access. En su lugar te descargará un JSON automático cada semana al Downloads.',
    'backup.folder_set': 'Carpeta configurada: {name}. Auto-backup activo.',
    'backup.restored': 'Datos restaurados del backup local.',
    'dataloss.title': '⚠ POSIBLE PÉRDIDA DE DATOS',
    'dataloss.explain': 'La sesión anterior tenía {prev} Thronglets. Ahora hay 0. Algo ha borrado tus datos.',
    'dataloss.backup_line': 'Copia interna: {count} Thronglets · guardada {date}',
    'dataloss.restore': '↻ RESTAURAR DEL BACKUP INTERNO',
    'dataloss.import_json': '⬆ IMPORTAR JSON DEL DISCO',
    'dataloss.dismiss': 'ignorar (empezar en blanco)',
    'settings.backup': '📦 COPIA DE SEGURIDAD LOCAL',
    'settings.backup_hint': 'Aunque tengas la nube activa, exporta de vez en cuando un JSON por si acaso.',
    'settings.export': '⬇ EXPORTAR JSON', 'settings.import': '⬆ IMPORTAR JSON',
    'settings.last_backup': 'Última copia local:',
    'settings.install': '📲 INSTALAR COMO APP',
    'settings.install_hint': 'En Chrome/Edge móvil: menú · "Añadir a pantalla de inicio". En Safari iOS: compartir · "Añadir a inicio". En PC: icono de instalación en la barra de direcciones. Funciona offline.',
    'settings.sacrifice_zone': 'ZONA SACRIFICIO',
    'settings.sacrifice_hint': 'Aquí mueren los Thronglets. No se puede deshacer. Se te pedirá escribir la palabra clave y te ofrecerá un backup automático antes.',
    'settings.sacrifice_month': 'SACRIFICAR ESTE MES', 'settings.sacrifice_all': 'SACRIFICAR TODA LA COLONIA',
    'sacrifice.title': '⚠ SACRIFICIO — SIN VUELTA ATRÁS',
    'sacrifice.type_label': 'Escribe la palabra en mayúsculas para confirmar:',
    'sacrifice.backup_first': 'Bajarme JSON de backup antes de sacrificar (recomendado)',
    'sacrifice.confirm': 'SACRIFICAR',
    'sacrifice.warn_month': 'Vas a borrar {count} Thronglets del ciclo {month}. Esta acción NO se puede deshacer.',
    'sacrifice.warn_all': 'Vas a borrar TODOS los Thronglets de TODOS los ciclos ({count} en total). Esta acción NO se puede deshacer.',
    'sacrifice.count_summary': '{count} registros · desde {first} hasta {last}',
    'sacrifice.keyword_month': 'SACRIFICAR MES',
    'sacrifice.keyword_all': 'SACRIFICAR TODO',
    'sacrifice.no_data': 'No hay Thronglets que sacrificar aquí.',
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
    'tab.colony': 'COLONY', 'tab.world': 'WORLD', 'tab.universe': 'UNIVERSE', 'tab.stats': 'STATS', 'tab.temple': 'TEMPLE', 'tab.settings': 'SETTINGS',
    'universe.title': 'THRONG UNIVERSE',
    'universe.total': 'THRONGS',
    'universe.moons': 'MOONS',
    'universe.hint': 'drag the map · tap a throng',
    'universe.legend_tip': 'ALL the history on one map',
    'universe.empty': 'No Throngs in the universe yet.',
    'hud.projection': 'PROJ',
    'temple.title': '🏛 SAVINGS TEMPLE',
    'temple.hint': 'Shared savings goals. Every time you add money, the Thronglets pilgrimage to the temple.',
    'temple.add_goal': '➕ NEW GOAL',
    'temple.empty': 'No goals yet. Create the first and start the pilgrimage.',
    'goal.title': 'SAVINGS GOAL',
    'goal.new': 'NEW GOAL',
    'goal.edit': 'EDIT GOAL',
    'goal.name': 'Goal name',
    'goal.target': 'Target (€)',
    'goal.deadline_opt': 'Target date (optional)',
    'goal.emoji': 'Emoji / symbol',
    'goal.until': 'until',
    'goal.add_savings': 'ADD SAVINGS',
    'goal.completed': 'COMPLETED',
    'confirm.delete_goal': 'Delete this goal? All recorded contributions will be lost.',
    'savings.title': '💰 ADD SAVINGS',
    'savings.amount': 'Amount (€)',
    'savings.tutor': 'Who contributes',
    'savings.both': 'BOTH',
    'savings.note': 'Note (optional)',
    'savings.add': 'ADD',
    'settings.music': '🎵 BACKGROUND MUSIC',
    'settings.music_hint': 'Ambient Throng music. Starts when entering the app.',
    'settings.music_play': 'PLAY',
    'settings.music_vol': 'MUSIC VOL.',
    'settings.music_manual': '▶ START MUSIC',
    'speak.goal_created': 'Goal created in the temple.',
    'speak.goal_updated': 'Goal updated.',
    'speak.goal_completed': 'GOAL «{name}» COMPLETED, tutor!',
    'speak.goal_progress': '«{name}»: {remaining} € to go.',
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
    'deudas.settle_hint_history': 'settle from 📜 HISTORY',
    'ritual.title': 'SETTLEMENT',
    'ritual.tagline': 'THE CYCLE CLOSES',
    'celeb.title': 'GOAL REACHED!',
    'month_end.eyebrow': 'CYCLE CLOSED',
    'month_end.tagline': 'THE THRONG REMEMBERS',
    'month_end.continue': 'CONTINUE',
    'month_end.spent': 'SPENT',
    'month_end.thronglets': 'THRONGS BORN',
    'month_end.balance': 'BALANCE',
    'month_end.balanced': 'BALANCED',
    'cycles.title': 'HISTORICAL CYCLES',
    'cycles.balanced': '⚖ BALANCED',
    'cycles.settled': '✓ SETTLED',
    'cycles.pending': '⚠ PENDING',
    'cycles.overpaid': 'OVERPAID',
    'cycles.no_expenses': '— no expenses —',
    'feed.papa': 'PAPA', 'feed.tutor': 'TUTOR', 'feed.amount': '€', 'feed.date': 'DATE', 'feed.split': 'SPLIT', 'feed.feed': 'FEED',
    'feed.sheet_title': 'NEW EXPENSE',
    'feed.concept_placeholder': 'description (taco tuesday, netflix...)',
    'feed.split.5050': '50 / 50', 'feed.split.100isi': '100% ISI', 'feed.split.100gayle': '100% GAYLE',
    'split.half': 'SPLIT IN HALF',
    'split.owed_full': 'THEY OWE ME ALL',
    'split.absorb': 'I ABSORB IT (no debt)',
    'split.no_debt': 'NO DEBT',
    'split.g_owes_all': 'G OWES 100%',
    'split.i_owes_all': 'I OWES 100%',
    'split.explain_half': '{payer} paid · {other} owes half',
    'split.explain_owed': '{payer} paid · {other} owes ALL of it',
    'split.explain_absorb': '{payer} paid and absorbs it · no debt',
    'review.title': '🔍 REVIEW 100% SPLITS',
    'review.hint': 'These expenses have a 100% split (not halved). Before v2.2 the label was ambiguous, so check each one does what you expect. Tap an expense to change it.',
    'review.none': 'No expenses with a 100% split. Everything is halved. ✓',
    'review.effect_no_debt': 'generates no debt',
    'review.effect_owes': '{debtor} owes {amount} €',
    'review.flip': '⇄ FLIP',
    'review.paid_by': 'paid by {tutor}',
    'world.title_prefix': 'WORLD · ', 'world.today': 'TODAY', 'world.history': '📜 HISTORY',
    'world.empty': "this moon hasn't seen Thronglets yet",
    'world.empty_hint': 'go to COLONY and feed them',
    'world.legend_recurring': '♺ SUSCRI = recurring',
    'world.legend_tip': 'click to hear · they sing when they collide',
    'history.title_prefix': 'HISTORY · ', 'history.search_placeholder': 'search...',
    'history.filter.all': 'ALL', 'history.filter.settlement': 'SETTLE',
    'history.empty': 'No Thronglets in this selection.',
    'history.total_isi': 'ISI', 'history.total_gayle': 'GAYLE', 'history.total_all': 'TOTAL',
    'history.settle_cycle': '💸 SETTLE THIS CYCLE',
    'history.settle_cycle_done': '✓ CYCLE SETTLED',
    'history.cycle_balanced': '⚖ CYCLE BALANCED',
    'history.cycle_debt': '⚠ CYCLE DEBT',
    'settle.balance_for': '{month} balance:',
    'settle.prefilled_hint': '(pre-filled, edit if you want)',
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
    'backup.auto_title': '🛡 AUTO-BACKUP (recommended)',
    'backup.auto_hint': 'Pick a folder on disk once. Every change writes there silently + 7 rotating daily snapshots. Never worry again.',
    'backup.pick_folder': '🗂 PICK FOLDER',
    'backup.change_folder': '🔁 CHANGE FOLDER',
    'backup.forget_folder': 'FORGET',
    'backup.fs_unsupported': 'This browser lacks File System Access. Instead, a JSON auto-downloads weekly to Downloads.',
    'backup.folder_set': 'Folder set: {name}. Auto-backup active.',
    'backup.restored': 'Data restored from local backup.',
    'dataloss.title': '⚠ POSSIBLE DATA LOSS',
    'dataloss.explain': 'Previous session had {prev} Thronglets. Now there are 0. Something wiped your data.',
    'dataloss.backup_line': 'Internal copy: {count} Thronglets · saved {date}',
    'dataloss.restore': '↻ RESTORE FROM INTERNAL BACKUP',
    'dataloss.import_json': '⬆ IMPORT JSON FROM DISK',
    'dataloss.dismiss': 'dismiss (start fresh)',
    'settings.backup': '📦 LOCAL BACKUP',
    'settings.backup_hint': 'Even with cloud sync, export a JSON every now and then just in case.',
    'settings.export': '⬇ EXPORT JSON', 'settings.import': '⬆ IMPORT JSON',
    'settings.last_backup': 'Last local backup:',
    'settings.install': '📲 INSTALL AS APP',
    'settings.install_hint': 'In mobile Chrome/Edge: menu · "Add to home screen". In Safari iOS: share · "Add to home". On PC: install icon in the address bar. Works offline.',
    'settings.sacrifice_zone': 'SACRIFICE ZONE',
    'settings.sacrifice_hint': 'Here Thronglets die. Cannot be undone. You will be asked to type the keyword and offered an auto-backup first.',
    'settings.sacrifice_month': 'SACRIFICE THIS MONTH', 'settings.sacrifice_all': 'SACRIFICE WHOLE COLONY',
    'sacrifice.title': '⚠ SACRIFICE — NO GOING BACK',
    'sacrifice.type_label': 'Type the keyword in uppercase to confirm:',
    'sacrifice.backup_first': 'Download a backup JSON before sacrificing (recommended)',
    'sacrifice.confirm': 'SACRIFICE',
    'sacrifice.warn_month': 'You are about to delete {count} Thronglets from cycle {month}. This action CANNOT be undone.',
    'sacrifice.warn_all': 'You are about to delete ALL Thronglets from ALL cycles ({count} total). This action CANNOT be undone.',
    'sacrifice.count_summary': '{count} records · from {first} to {last}',
    'sacrifice.keyword_month': 'SACRIFICE MONTH',
    'sacrifice.keyword_all': 'SACRIFICE ALL',
    'sacrifice.no_data': 'Nothing to sacrifice here.',
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
  const oldBudgets = data.settings.budgets || {};
  if (!Array.isArray(data.papas)) {
    data.papas = JSON.parse(JSON.stringify(DEFAULT_PAPAS));
    for (const p of data.papas) {
      if (oldBudgets[p.id] !== undefined) p.budget = oldBudgets[p.id];
    }
  }
  delete data.settings.budgets;
  data.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
  for (const e of data.expenses) {
    if (typeof e.bornSick === 'undefined') e.bornSick = false;
    if (!e.split) e.split = { isi: 0.5, gayle: 0.5 };
    if (!e.type) e.type = (e.papaId === 'settlement') ? 'settlement' : 'expense';
  }
  if (!Array.isArray(data.goals)) data.goals = [];
  for (const g of data.goals) {
    if (!Array.isArray(g.contributions)) g.contributions = [];
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
let saveThrottle = null;
function save() {
  const json = JSON.stringify(state);
  try {
    localStorage.setItem(STORAGE_KEY, json);
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ data: state, savedAt: Date.now() }));
    lastSavedAt = Date.now();
    pulseSaveIndicator();
    // Persist "last session size" for the data-loss detector
    try {
      const nonSettlements = state.expenses.filter(e => e.type !== 'settlement').length;
      localStorage.setItem('throngwallet-last-count', String(nonSettlements));
    } catch (e) {}
    // Layer A: throttled push to auto-backup folder if configured
    if (saveThrottle) clearTimeout(saveThrottle);
    saveThrottle = setTimeout(() => { autoBackupWrite(json).catch(e => console.warn('autoBackupWrite', e)); }, 800);
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

/* ============================================
   2b. AUTO-BACKUP SYSTEM
   ─────────────────────────────────────────────
   3 layers of defense against data loss:
   A. File System Access API — user picks a folder ONCE, then every
      save() silently writes latest.json + rotating daily snapshots.
   B. Weekly auto-download — silent fallback for browsers without
      the API (iOS Safari).
   C. Data-loss detection — on boot, if last-session had >=5 throngs
      and now there are 0, show a big modal offering restore.
   ============================================ */

const IDB_NAME = 'throngwallet-idb';
const IDB_STORE = 'handles';
const IDB_KEY = 'backupDir';
const LAST_AUTO_DL_KEY = 'throngwallet-last-auto-dl';
const AUTO_DL_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

let backupDirHandle = null;
let backupWriting = false;

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key) {
  try {
    const db = await idbOpen();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return null; }
}
async function idbSet(key, value) {
  try {
    const db = await idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { console.warn('idbSet', e); }
}
async function idbDelete(key) {
  try {
    const db = await idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {}
}

function fsApiAvailable() {
  return typeof window.showDirectoryPicker === 'function';
}

async function pickBackupFolder() {
  if (!fsApiAvailable()) {
    alert(t('backup.fs_unsupported'));
    return false;
  }
  try {
    const handle = await window.showDirectoryPicker({ id: 'throng-backup', mode: 'readwrite' });
    backupDirHandle = handle;
    await idbSet(IDB_KEY, handle);
    // Trigger an immediate write so we know it works
    await autoBackupWrite(JSON.stringify(state));
    updateAutoBackupUI('active', handle.name);
    chime();
    speak('KRII-MOK!', t('backup.folder_set', { name: handle.name }));
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('pickBackupFolder', e);
    return false;
  }
}

async function forgetBackupFolder() {
  backupDirHandle = null;
  await idbDelete(IDB_KEY);
  updateAutoBackupUI('inactive');
}

async function verifyBackupPermission() {
  if (!backupDirHandle) return false;
  try {
    if ((await backupDirHandle.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
    // Requesting requires user gesture — return false until re-picked
    return false;
  } catch (e) {
    return false;
  }
}

async function autoBackupWrite(json) {
  if (backupWriting) return;
  if (!backupDirHandle) return;
  backupWriting = true;
  try {
    const granted = await verifyBackupPermission();
    if (!granted) { updateAutoBackupUI('permission-needed'); return; }
    // Latest.json (always overwritten)
    const latest = await backupDirHandle.getFileHandle('throngwallet-latest.json', { create: true });
    let w = await latest.createWritable();
    await w.write(json);
    await w.close();
    // Daily snapshot
    const dayName = 'throngwallet-' + new Date().toISOString().slice(0,10) + '.json';
    const daily = await backupDirHandle.getFileHandle(dayName, { create: true });
    w = await daily.createWritable();
    await w.write(json);
    await w.close();
    // Rotate: keep last 7 dailies
    await rotateBackupSnapshots(7);
    updateAutoBackupUI('active', backupDirHandle.name);
  } catch (e) {
    console.warn('autoBackupWrite', e);
    updateAutoBackupUI('error', e.message);
  } finally {
    backupWriting = false;
  }
}

async function rotateBackupSnapshots(keep) {
  if (!backupDirHandle) return;
  try {
    const snapshots = [];
    for await (const [name, entry] of backupDirHandle.entries()) {
      if (entry.kind !== 'file') continue;
      const m = name.match(/^throngwallet-(\d{4}-\d{2}-\d{2})\.json$/);
      if (m) snapshots.push({ name, date: m[1] });
    }
    snapshots.sort((a, b) => a.date.localeCompare(b.date));
    while (snapshots.length > keep) {
      const old = snapshots.shift();
      try { await backupDirHandle.removeEntry(old.name); } catch (e) {}
    }
  } catch (e) { console.warn('rotateBackupSnapshots', e); }
}

async function initAutoBackup() {
  const stored = await idbGet(IDB_KEY);
  if (stored) {
    backupDirHandle = stored;
    const granted = await verifyBackupPermission();
    updateAutoBackupUI(granted ? 'active' : 'permission-needed', stored.name);
  } else {
    updateAutoBackupUI(fsApiAvailable() ? 'inactive' : 'unsupported');
  }
  // Layer B: weekly auto-download fallback (silent)
  maybeWeeklyAutoDownload();
}

function maybeWeeklyAutoDownload() {
  try {
    if (backupDirHandle) return; // Layer A already active
    const last = parseInt(localStorage.getItem(LAST_AUTO_DL_KEY) || '0', 10);
    if (Date.now() - last < AUTO_DL_INTERVAL_MS) return;
    const nonSettle = state.expenses.filter(e => e.type !== 'settlement');
    if (nonSettle.length < 3) return; // don't spam downloads for empty apps
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `throngwallet-auto-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    localStorage.setItem(LAST_AUTO_DL_KEY, String(Date.now()));
  } catch (e) { console.warn('weekly auto-download', e); }
}

function updateAutoBackupUI(status, detail) {
  const dot = document.getElementById('backupDot');
  const label = document.getElementById('backupLabel');
  const pickBtn = document.getElementById('backupPickBtn');
  const forgetBtn = document.getElementById('backupForgetBtn');
  if (!dot || !label) return;
  dot.className = 'backup-dot ' + status;
  const es = {
    active: `activo · ${detail || ''}`,
    'permission-needed': 'permiso caducado — pulsa ELEGIR CARPETA otra vez',
    inactive: 'no configurado — se recomienda elegir carpeta',
    unsupported: 'navegador no soporta — sale un JSON semanal automático al Downloads',
    error: `error: ${detail || ''}`
  };
  const en = {
    active: `active · ${detail || ''}`,
    'permission-needed': 'permission expired — click PICK FOLDER again',
    inactive: 'not configured — recommend picking a folder',
    unsupported: 'browser unsupported — a weekly JSON drops to Downloads automatically',
    error: `error: ${detail || ''}`
  };
  const msg = (currentLang() === 'en' ? en : es)[status] || status;
  label.textContent = msg;
  if (pickBtn) pickBtn.hidden = (status === 'active');
  if (forgetBtn) forgetBtn.hidden = (status !== 'active' && status !== 'permission-needed');
}

/* Layer C: data-loss detection at boot */
function checkDataLoss() {
  try {
    const lastCount = parseInt(localStorage.getItem('throngwallet-last-count') || '0', 10);
    const nowCount = state.expenses.filter(e => e.type !== 'settlement').length;
    if (lastCount >= 5 && nowCount === 0) {
      showDataLossModal(lastCount);
    }
  } catch (e) {}
}

function showDataLossModal(lastCount) {
  const backup = (() => {
    try { return JSON.parse(localStorage.getItem(BACKUP_KEY)); } catch (e) { return null; }
  })();
  const backupCount = backup?.data?.expenses?.filter(e => e.type !== 'settlement').length || 0;
  const backupDate = backup?.savedAt ? new Date(backup.savedAt).toLocaleString() : '—';
  const overlay = document.getElementById('dataLossModal');
  if (!overlay) return;
  document.getElementById('dataLossExplain').textContent = t('dataloss.explain', { prev: lastCount });
  document.getElementById('dataLossBackupLine').textContent = t('dataloss.backup_line', { count: backupCount, date: backupDate });
  document.getElementById('dataLossRestoreBtn').hidden = backupCount === 0;
  overlay.hidden = false;
  alertCry();
}

function restoreFromLocalBackup() {
  try {
    const backup = JSON.parse(localStorage.getItem(BACKUP_KEY));
    if (!backup?.data) return;
    const migrated = migrate(backup.data);
    if (!migrated) return;
    state = migrated;
    save();
    document.getElementById('dataLossModal').hidden = true;
    rebuildConceptHints(); rebuildPapaUI();
    renderColony(); renderDeudas(); populateSettings();
    chime();
    speak('KRII-MOK!', t('backup.restored'));
  } catch (e) {
    console.warn('restoreFromLocalBackup', e);
  }
}

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
/* ─── SPLIT MODEL ───────────────────────────────
   Internally `split` = { isi, gayle } fractions of who BEARS the cost.
   Debt = paid − borne. The UI, however, is payer-relative, because
   "100% ISI" is ambiguous: it produces opposite debt directions
   depending on who paid. The payer-relative keys are:

     '50/50'      → half each
     'owed_full'  → the OTHER tutor bears it all → payer is owed 100%
     'absorb'     → the PAYER bears it all       → generates no debt

   Legacy keys '100isi' / '100gayle' are still accepted on the way in
   so old data and old links keep working.
   ─────────────────────────────────────────────── */
function splitObj(key, payer) {
  const payerIsIsi = (payer || 'Isi') === 'Isi';
  switch (key) {
    case 'owed_full':
      // Other tutor bears the whole thing
      return payerIsIsi ? { isi: 0.0, gayle: 1.0 } : { isi: 1.0, gayle: 0.0 };
    case 'absorb':
      // Payer bears the whole thing → nets to zero
      return payerIsIsi ? { isi: 1.0, gayle: 0.0 } : { isi: 0.0, gayle: 1.0 };
    // Legacy absolute keys
    case '100isi':   return { isi: 1.0, gayle: 0.0 };
    case '100gayle': return { isi: 0.0, gayle: 1.0 };
    default:         return { isi: 0.5, gayle: 0.5 };
  }
}
/* Reverse: split object + payer → payer-relative select key */
function splitKey(s, payer) {
  if (!s) return '50/50';
  const payerIsIsi = (payer || 'Isi') === 'Isi';
  if (s.isi === 1.0) return payerIsIsi ? 'absorb' : 'owed_full';
  if (s.gayle === 1.0) return payerIsIsi ? 'owed_full' : 'absorb';
  return '50/50';
}
/* Display label for history rows / speech. Shows the actual debt
   outcome, which needs both the split AND who paid. */
function splitLabel(s, payer) {
  if (!s) return '50/50';
  if (s.isi !== 1.0 && s.gayle !== 1.0) return '50/50';
  const payerIsIsi = (payer || 'Isi') === 'Isi';
  const payerBearsAll = payerIsIsi ? (s.isi === 1.0) : (s.gayle === 1.0);
  if (payerBearsAll) return t('split.no_debt');
  return payerIsIsi ? t('split.g_owes_all') : t('split.i_owes_all');
}
/* Plain-language sentence of what the current form selection will do */
function splitExplain(key, payer) {
  const p = payer || 'Isi';
  const other = p === 'Isi' ? 'Gayle' : 'Isi';
  if (key === 'owed_full') return t('split.explain_owed',   { payer: p, other });
  if (key === 'absorb')    return t('split.explain_absorb', { payer: p, other });
  return t('split.explain_half', { payer: p, other });
}
function refreshSplitExplain() {
  const feedEl = document.getElementById('feedSplitExplain');
  if (feedEl) feedEl.textContent = splitExplain(selectedSplit, selectedTutor);
  const editEl = document.getElementById('editSplitExplain');
  if (editEl && !document.getElementById('editModal').hidden) {
    const sel = document.getElementById('editSplit');
    editEl.textContent = splitExplain(sel ? sel.value : '50/50', editTutor);
  }
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
  renderProjection();
}

/* Reusable: compute split-aware balance for a given month.
   Returns { isiPaid, gaylePaid, isiNet, debtAmt, owesFrom, owesTo, balanced }
   - isiNet > 0 → Gayle owes Isi |isiNet|
   - 'difference' mode returns |isiPaid-gaylePaid| as debtAmt
*/
function computeMonthBalance(mKey) {
  const monthly = expensesForMonth(mKey);
  const settlements = settlementsForMonth(mKey);
  let isiPaid = 0, gaylePaid = 0;
  for (const e of monthly) {
    if (e.tutor === 'Isi') isiPaid += e.amount;
    else gaylePaid += e.amount;
  }
  let isiOwed = 0;
  for (const e of monthly) {
    const sp = e.split || { isi: 0.5, gayle: 0.5 };
    isiOwed += e.amount * (sp.isi ?? 0.5);
  }
  let isiNet = isiPaid - isiOwed;
  for (const s of settlements) {
    if (s.fromTutor === 'Gayle' && s.toTutor === 'Isi') isiNet -= s.amount;
    if (s.fromTutor === 'Isi' && s.toTutor === 'Gayle') isiNet += s.amount;
  }
  const model = state.settings.splitModel;
  const debtAmt = model === 'half' ? Math.abs(isiNet) : Math.abs(isiPaid - gaylePaid);
  const balanced = debtAmt < 0.01;
  let owesFrom = null, owesTo = null;
  if (!balanced) {
    const gayleOwes = (model === 'half') ? (isiNet > 0) : (isiPaid > gaylePaid);
    owesFrom = gayleOwes ? 'Gayle' : 'Isi';
    owesTo   = gayleOwes ? 'Isi'   : 'Gayle';
  }
  return { isiPaid, gaylePaid, isiNet, debtAmt, owesFrom, owesTo, balanced, model };
}

function renderDeudas() {
  const bal = computeMonthBalance(monthKey(new Date()));
  document.getElementById('isiTotal').textContent = fmt(bal.isiPaid);
  document.getElementById('gayleTotal').textContent = fmt(bal.gaylePaid);
  document.getElementById('balanceMode').textContent =
    bal.model === 'half' ? t('deudas.by_split') : t('deudas.gross');

  const msg = document.getElementById('balanceMsg');
  const card = document.querySelector('.balance-card');
  if (bal.balanced) {
    msg.textContent = t('deudas.balanced');
    card.classList.remove('unbalanced');
  } else {
    msg.textContent = t('deudas.owes', { from: bal.owesFrom, to: bal.owesTo, amount: fmt(bal.debtAmt) });
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
  refreshSplitExplain();
}
function selectSplitUI(key) {
  selectedSplit = key;
  document.getElementById('splitSelect').value = key;
  refreshSplitExplain();
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

  const split = splitObj(selectedSplit, selectedTutor);
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
  if (name === 'universe') { renderUniverse(); startUniverseTick(); }
  else stopUniverseTick();
  if (name === 'settings') populateSettings();
  if (name === 'stats') renderStats();
  if (name === 'temple') buildTempleView();
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
let trailFrameCounter = 0;
const COLLISION_THROTTLE_MS = 50;
const COLLISION_COOLDOWN_MS = 1500;

function spawnTrailParticle(throng) {
  if (!worldStageEl) return;
  // Solo los Throngs de Isi dejan estela (Gayle = originales limpios)
  if (throng.expense.tutor !== 'Isi') return;
  const p = document.createElement('div');
  p.className = 'trail-particle isi';
  p.style.left = (throng.x + throng.size / 2) + 'px';
  p.style.top = (throng.y + throng.size / 2 + throng.size * 0.3) + 'px';
  worldStageEl.appendChild(p);
  setTimeout(() => p.remove(), 700);
}

function renderWorld() {
  worldStageEl = document.getElementById('worldStage');
  worldStageEl.querySelectorAll('.mini-throng, .mini-bubble, .music-note, .trail-particle').forEach(el => el.remove());
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
    el.dataset.tutor = e.tutor.toLowerCase();
    const evoLvl = evolutionLevel(e);
    if (evoLvl > 1) el.dataset.evo = evoLvl;
    const crown = evolutionCrown(evoLvl);
    el.innerHTML = `
      <div class="mini-tag">${e.name.substring(0,18)}</div>
      ${crown ? `<div class="evo-crown">${crown}</div>` : ''}
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
  renderMandelbrotBackground();
  refreshHistorySettleBtn();
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

  // Trail particles ~8 veces/s, solo si el throng se mueve
  trailFrameCounter++;
  if (trailFrameCounter % 7 === 0) {
    for (const t of worldThrongs) {
      if (t.el.classList.contains('leaving')) continue;
      const sp = Math.hypot(t.vx, t.vy);
      if (sp > 0.35) spawnTrailParticle(t);
    }
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
  const sp = splitLabel(expense.split, expense.tutor);
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
   11a. UNIVERSE VIEW
   ─────────────────────────────────────────────
   ALL thronglets from ALL months on one huge 2D
   pixel-art village map. Drag to pan. Wander +
   collide + duet like the world view. Click for
   story.
   ============================================ */
const UNIVERSE_MAP_W = 2000;
const UNIVERSE_MAP_H = 1400;
let universeThrongs = [];
let universeRaf = null;
let universeMapEl = null;
let universeWrapEl = null;
let universePan = { x: 0, y: 0 };
let universeDrag = null;
let universeLastCollisionCheck = 0;
let universeBuilt = false;

function buildUniverseMapSVG() {
  const W = UNIVERSE_MAP_W;
  const H = UNIVERSE_MAP_H;

  // Deterministic pseudo-random (position by index → stable render across sessions)
  const rng = (seed) => {
    let s = seed | 0;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  };

  // Stars in the sky area
  const starR = rng(7);
  let stars = '';
  for (let i = 0; i < 90; i++) {
    const x = starR() * W;
    const y = starR() * 340;
    const r = 0.6 + starR() * 1.8;
    const o = 0.4 + starR() * 0.6;
    stars += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="#fff66d" opacity="${o.toFixed(2)}"/>`;
  }

  // Trees scattered in ground zones (avoid river band + village plaza + water)
  const treeR = rng(31);
  let trees = '';
  for (let i = 0; i < 80; i++) {
    const x = 60 + treeR() * (W - 120);
    const y = 720 + treeR() * (H - 780);
    // Skip an area around the village
    const dvx = x - 1100, dvy = y - 950;
    if (Math.hypot(dvx, dvy) < 220) continue;
    // Skip an area around the river
    if (Math.abs(y - 620) < 40) continue;
    const scale = 0.7 + treeR() * 0.6;
    const trunk = 'M -3 0 L 3 0 L 3 8 L -3 8 Z';
    const leaves = `M 0 -22 L 14 0 L -14 0 Z`;
    trees += `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${scale.toFixed(2)})">
      <path d="${trunk}" fill="#5a3018"/>
      <path d="${leaves}" fill="#4a8028"/>
      <path d="M 0 -18 L 10 -4 L -10 -4 Z" fill="#7df9aa" opacity="0.6"/>
    </g>`;
  }

  // Distant mountain range (2 layers for depth)
  const mnR = rng(11);
  let mntPts1 = `0,340`;
  for (let x = 0; x <= W; x += 90) {
    mntPts1 += ` ${x},${(140 + mnR() * 140).toFixed(0)}`;
  }
  mntPts1 += ` ${W},340`;
  const mnR2 = rng(19);
  let mntPts2 = `0,340`;
  for (let x = 0; x <= W; x += 60) {
    mntPts2 += ` ${x},${(200 + mnR2() * 100).toFixed(0)}`;
  }
  mntPts2 += ` ${W},340`;

  // Snow caps: small triangles on some highest points
  let snow = '';
  for (let x = 100; x < W; x += 200) {
    const peak = 140 + mnR() * 40;
    snow += `<polygon points="${x-12},${peak+18} ${x},${peak} ${x+12},${peak+18}" fill="#c89cff"/>`;
  }

  // Village houses cluster
  const houses = [
    { x: 1000, y: 900, roof: '#ff6ec7', wall: '#ff9dbc' },
    { x: 1080, y: 940, roof: '#ff8866', wall: '#ffb098' },
    { x: 1160, y: 895, roof: '#c89cff', wall: '#dbb3ff' },
    { x: 950, y: 970, roof: '#7df9aa', wall: '#a5f5c0' },
    { x: 1220, y: 950, roof: '#fff66d', wall: '#fff9a0' },
    { x: 1120, y: 1010, roof: '#66ddff', wall: '#a0eaff' },
    { x: 1030, y: 1030, roof: '#ff6ec7', wall: '#ff9dbc' }
  ];
  let houseSvg = '';
  for (const h of houses) {
    houseSvg += `<g transform="translate(${h.x},${h.y})">
      <rect x="0" y="12" width="52" height="34" fill="${h.wall}" stroke="#1a0033" stroke-width="1.5"/>
      <polygon points="-4,12 26,-8 56,12" fill="${h.roof}" stroke="#1a0033" stroke-width="1.5"/>
      <rect x="20" y="26" width="12" height="20" fill="#4a2810" stroke="#1a0033" stroke-width="1"/>
      <rect x="6" y="20" width="8" height="8" fill="#fff66d" opacity="0.8"/>
      <rect x="38" y="20" width="8" height="8" fill="#fff66d" opacity="0.8"/>
      <line x1="20" y1="36" x2="21" y2="36" stroke="#fff66d" stroke-width="2"/>
    </g>`;
  }

  // Farm fields (grid of colored rectangles)
  const fieldColors = ['#5a7828', '#8b6218', '#7db878', '#c8a428'];
  let fields = '';
  const fx0 = 220, fy0 = 1100;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const fc = fieldColors[(row * 5 + col) % fieldColors.length];
      fields += `<rect x="${fx0 + col*90}" y="${fy0 + row*70}" width="82" height="62" fill="${fc}" stroke="#1a0033" stroke-width="1" opacity="0.7"/>
        <path d="M ${fx0 + col*90 + 10} ${fy0 + row*70 + 8} L ${fx0 + col*90 + 72} ${fy0 + row*70 + 8}" stroke="#1a0033" stroke-width="0.5" opacity="0.3"/>
        <path d="M ${fx0 + col*90 + 10} ${fy0 + row*70 + 30} L ${fx0 + col*90 + 72} ${fy0 + row*70 + 30}" stroke="#1a0033" stroke-width="0.5" opacity="0.3"/>
        <path d="M ${fx0 + col*90 + 10} ${fy0 + row*70 + 52} L ${fx0 + col*90 + 72} ${fy0 + row*70 + 52}" stroke="#1a0033" stroke-width="0.5" opacity="0.3"/>`;
    }
  }

  // Fireflies scattered
  const ffR = rng(43);
  let fireflies = '';
  for (let i = 0; i < 20; i++) {
    const x = ffR() * W;
    const y = 500 + ffR() * (H - 550);
    const d = 3 + ffR() * 4;
    fireflies += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${d.toFixed(1)}" fill="#fff66d" opacity="0.6" class="firefly">
      <animate attributeName="opacity" values="0.2;0.9;0.2" dur="${(2 + ffR() * 3).toFixed(1)}s" repeatCount="indefinite" begin="${(ffR() * 3).toFixed(1)}s"/>
    </circle>`;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges">
      <defs>
        <pattern id="grassPat" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#1a3018"/>
          <rect x="4" y="8" width="1.5" height="3" fill="#3a6a2a"/>
          <rect x="14" y="16" width="1.5" height="3" fill="#3a6a2a"/>
          <rect x="20" y="4" width="1.5" height="3" fill="#4a8028"/>
        </pattern>
        <pattern id="waterPat" width="32" height="20" patternUnits="userSpaceOnUse">
          <rect width="32" height="20" fill="#3a80a8"/>
          <path d="M 0 10 Q 8 6 16 10 T 32 10" fill="none" stroke="#66ddff" stroke-width="1.2" opacity="0.7"/>
          <path d="M 0 16 Q 8 12 16 16 T 32 16" fill="none" stroke="#a0e8ff" stroke-width="0.6" opacity="0.5"/>
        </pattern>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0a0014"/>
          <stop offset="70%" stop-color="#1a0033"/>
          <stop offset="100%" stop-color="#3a1058"/>
        </linearGradient>
      </defs>

      <!-- Sky -->
      <rect width="${W}" height="340" fill="url(#skyGrad)"/>

      <!-- Stars -->
      <g class="stars">${stars}</g>

      <!-- Moon -->
      <circle cx="240" cy="120" r="38" fill="#fff66d" opacity="0.95"/>
      <circle cx="230" cy="110" r="7" fill="#c89cff" opacity="0.4"/>
      <circle cx="255" cy="130" r="5" fill="#c89cff" opacity="0.4"/>
      <circle cx="240" cy="120" r="52" fill="none" stroke="#fff66d" stroke-width="1" opacity="0.15"/>

      <!-- Distant mountain silhouette -->
      <polygon points="${mntPts1}" fill="#3a1058"/>
      <polygon points="${mntPts2}" fill="#5a2088"/>
      <g class="snow-caps">${snow}</g>

      <!-- Ground -->
      <rect y="340" width="${W}" height="${H-340}" fill="url(#grassPat)"/>

      <!-- Rolling hill shapes -->
      <path d="M 0 640 Q 200 580 400 620 T 800 610 T 1200 630 T 1600 605 T 2000 620 L 2000 700 L 0 700 Z" fill="#254028" opacity="0.6"/>
      <path d="M 0 820 Q 300 780 600 810 T 1200 795 T 1800 820 L 2000 820 L 2000 900 L 0 900 Z" fill="#2a4830" opacity="0.4"/>

      <!-- River -->
      <path d="M -50 580 Q 300 540 500 600 T 900 610 T 1300 580 T 1700 605 T 2050 590 L 2050 660 T 1700 660 T 1300 645 T 900 665 T 500 660 T -50 640 Z" fill="url(#waterPat)"/>

      <!-- Bridge over river -->
      <g transform="translate(720, 590)">
        <rect x="0" y="-4" width="90" height="8" fill="#7a5028"/>
        <rect x="0" y="4" width="90" height="30" fill="#c8a06c"/>
        <line x1="10" y1="4" x2="10" y2="34" stroke="#7a5028" stroke-width="2"/>
        <line x1="30" y1="4" x2="30" y2="34" stroke="#7a5028" stroke-width="2"/>
        <line x1="60" y1="4" x2="60" y2="34" stroke="#7a5028" stroke-width="2"/>
        <line x1="80" y1="4" x2="80" y2="34" stroke="#7a5028" stroke-width="2"/>
      </g>

      <!-- Path from bridge to village -->
      <path d="M 780 630 Q 850 750 950 900" fill="none" stroke="#c8a06c" stroke-width="14" opacity="0.6"/>
      <path d="M 780 630 Q 850 750 950 900" fill="none" stroke="#fff66d" stroke-width="1.5" stroke-dasharray="8 8" opacity="0.5"/>

      <!-- Windmill on hill -->
      <g transform="translate(400, 720)">
        <rect x="-2" y="0" width="30" height="76" fill="#a08890" stroke="#1a0033" stroke-width="1.5"/>
        <polygon points="-6,0 13,-20 32,0" fill="#c85040" stroke="#1a0033" stroke-width="1.5"/>
        <circle cx="13" cy="14" r="4" fill="#fff66d"/>
        <g transform="translate(13, 14)" class="windmill-blades">
          <rect x="-2" y="-42" width="4" height="42" fill="#fff9d0" stroke="#1a0033" stroke-width="1"/>
          <rect x="0" y="-2" width="42" height="4" fill="#fff9d0" stroke="#1a0033" stroke-width="1"/>
          <rect x="-2" y="0" width="4" height="42" fill="#fff9d0" stroke="#1a0033" stroke-width="1"/>
          <rect x="-42" y="-2" width="42" height="4" fill="#fff9d0" stroke="#1a0033" stroke-width="1"/>
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="18s" repeatCount="indefinite"/>
        </g>
        <rect x="10" y="52" width="10" height="16" fill="#4a2810"/>
      </g>

      <!-- Farm fields (bottom right) -->
      <g class="fields">${fields}</g>

      <!-- Farmhouse near fields -->
      <g transform="translate(180, 1080)">
        <rect x="0" y="12" width="42" height="30" fill="#c8a06c" stroke="#1a0033" stroke-width="1.5"/>
        <polygon points="-3,12 21,-6 45,12" fill="#c85040" stroke="#1a0033" stroke-width="1.5"/>
        <rect x="16" y="24" width="10" height="18" fill="#4a2810" stroke="#1a0033" stroke-width="1"/>
        <rect x="4" y="18" width="7" height="6" fill="#fff66d" opacity="0.8"/>
        <rect x="31" y="18" width="7" height="6" fill="#fff66d" opacity="0.8"/>
      </g>

      <!-- Central plaza well -->
      <g transform="translate(1100, 950)">
        <ellipse cx="0" cy="0" rx="14" ry="4" fill="#1a0033"/>
        <rect x="-12" y="-30" width="24" height="30" fill="#7a5028" stroke="#1a0033" stroke-width="1.5"/>
        <rect x="-14" y="-32" width="28" height="4" fill="#4a2810"/>
        <rect x="-2" y="-45" width="4" height="20" fill="#c89cff"/>
        <path d="M -12 -50 L 12 -50 L 8 -40 L -8 -40 Z" fill="#5a2088" stroke="#1a0033" stroke-width="1.5"/>
      </g>

      <!-- Trees scattered -->
      <g class="trees">${trees}</g>

      <!-- Big central shrine (Throng temple) -->
      <g transform="translate(1400, 800)">
        <rect x="-40" y="0" width="80" height="60" fill="#c89cff" stroke="#1a0033" stroke-width="2"/>
        <polygon points="-48,0 0,-40 48,0" fill="#5a2088" stroke="#1a0033" stroke-width="2"/>
        <rect x="-8" y="20" width="16" height="40" fill="#1a0033"/>
        <circle cx="0" cy="35" r="5" fill="#fff66d" opacity="0.9">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>
        <rect x="-32" y="60" width="64" height="8" fill="#7a5028" stroke="#1a0033" stroke-width="1.5"/>
        <rect x="-38" y="68" width="76" height="6" fill="#4a2810"/>
      </g>

      <!-- Fireflies -->
      <g class="fireflies">${fireflies}</g>

      <!-- Waterfall from mountain into river -->
      <g class="waterfall">
        <!-- rocky ledge -->
        <path d="M 1650 340 L 1720 340 L 1710 420 L 1660 420 Z" fill="#5a2088" stroke="#1a0033" stroke-width="1.5"/>
        <!-- falling water column -->
        <rect x="1665" y="410" width="42" height="180" fill="#66ddff" opacity="0.75">
          <animate attributeName="opacity" values="0.65;0.85;0.65" dur="0.8s" repeatCount="indefinite"/>
        </rect>
        <rect x="1670" y="410" width="12" height="180" fill="#a0eaff" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.1s" repeatCount="indefinite"/>
        </rect>
        <rect x="1690" y="410" width="8" height="180" fill="#a0eaff" opacity="0.5">
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="0.6s" repeatCount="indefinite"/>
        </rect>
        <!-- foam at the base -->
        <ellipse cx="1686" cy="600" rx="34" ry="9" fill="#fff9d0" opacity="0.7">
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.3s" repeatCount="indefinite"/>
        </ellipse>
        <!-- spray particles -->
        <circle cx="1665" cy="595" r="2" fill="#a0eaff">
          <animate attributeName="cy" values="595;585;600" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite"/>
        </circle>
        <circle cx="1707" cy="598" r="2" fill="#a0eaff">
          <animate attributeName="cy" values="598;588;603" dur="1.6s" repeatCount="indefinite" begin="0.4s"/>
          <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" begin="0.4s"/>
        </circle>
      </g>

      <!-- Sailboat drifting the river left→right, then loop -->
      <g class="sailboat">
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="-120,0; ${W+120},0" dur="42s" repeatCount="indefinite"/>
          <!-- hull -->
          <path d="M 0 610 L 60 610 L 52 626 L 8 626 Z" fill="#7a5028" stroke="#1a0033" stroke-width="1.5"/>
          <!-- mast -->
          <line x1="30" y1="610" x2="30" y2="560" stroke="#4a2810" stroke-width="2"/>
          <!-- sail (triangle) -->
          <path d="M 30 560 L 30 604 L 60 600 Z" fill="#ff6ec7" stroke="#1a0033" stroke-width="1.5"/>
          <path d="M 30 560 L 30 590 L 14 594 Z" fill="#c89cff" stroke="#1a0033" stroke-width="1"/>
          <!-- flag -->
          <rect x="29" y="558" width="2" height="4" fill="#4a2810"/>
          <path d="M 31 559 L 40 561 L 31 563 Z" fill="#fff66d">
            <animate attributeName="d" values="M 31 559 L 40 561 L 31 563 Z; M 31 559 L 42 559 L 31 563 Z; M 31 559 L 40 561 L 31 563 Z" dur="1.6s" repeatCount="indefinite"/>
          </path>
          <!-- wake -->
          <ellipse cx="4" cy="628" rx="10" ry="2" fill="#a0eaff" opacity="0.6">
            <animate attributeName="opacity" values="0.4;0.7;0.4" dur="1.3s" repeatCount="indefinite"/>
          </ellipse>
        </g>
      </g>

      <!-- Chimney smoke from village houses -->
      <g class="smoke">
        <!-- house 1 chimney smoke -->
        <circle cx="1018" cy="895" r="4" fill="#c89cff" opacity="0.6">
          <animate attributeName="cy" values="895;855;830" dur="4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.4;0" dur="4s" repeatCount="indefinite"/>
          <animate attributeName="r" values="3;6;9" dur="4s" repeatCount="indefinite"/>
        </circle>
        <circle cx="1018" cy="895" r="4" fill="#c89cff" opacity="0.5">
          <animate attributeName="cy" values="895;855;830" dur="4s" begin="1.3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.5;0.3;0" dur="4s" begin="1.3s" repeatCount="indefinite"/>
          <animate attributeName="r" values="3;6;9" dur="4s" begin="1.3s" repeatCount="indefinite"/>
        </circle>
        <!-- house 4 (menta) chimney smoke -->
        <circle cx="972" cy="965" r="3" fill="#a0a0b8" opacity="0.55">
          <animate attributeName="cy" values="965;925;900" dur="5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.55;0.35;0" dur="5s" repeatCount="indefinite"/>
          <animate attributeName="r" values="3;6;10" dur="5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="972" cy="965" r="3" fill="#a0a0b8" opacity="0.5">
          <animate attributeName="cy" values="965;925;900" dur="5s" begin="1.7s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.5;0.3;0" dur="5s" begin="1.7s" repeatCount="indefinite"/>
          <animate attributeName="r" values="3;6;10" dur="5s" begin="1.7s" repeatCount="indefinite"/>
        </circle>
        <!-- house 6 (aqua) chimney smoke -->
        <circle cx="1140" cy="1005" r="3" fill="#c89cff" opacity="0.55">
          <animate attributeName="cy" values="1005;965;935" dur="4.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.55;0.3;0" dur="4.5s" repeatCount="indefinite"/>
          <animate attributeName="r" values="3;5;9" dur="4.5s" repeatCount="indefinite"/>
        </circle>
      </g>

      <!-- Flock of birds crossing the sky -->
      <g class="birds">
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="${W+80},0; -200,60" dur="55s" repeatCount="indefinite"/>
          <path d="M 0 180 q 6 -6 12 0 q 6 -6 12 0" fill="none" stroke="#fff66d" stroke-width="1.5" opacity="0.85">
            <animate attributeName="d" values="M 0 180 q 6 -6 12 0 q 6 -6 12 0; M 0 180 q 6 -3 12 0 q 6 -3 12 0; M 0 180 q 6 -6 12 0 q 6 -6 12 0" dur="0.7s" repeatCount="indefinite"/>
          </path>
          <path d="M 32 195 q 5 -5 10 0 q 5 -5 10 0" fill="none" stroke="#fff66d" stroke-width="1.2" opacity="0.75">
            <animate attributeName="d" values="M 32 195 q 5 -5 10 0 q 5 -5 10 0; M 32 195 q 5 -2 10 0 q 5 -2 10 0; M 32 195 q 5 -5 10 0 q 5 -5 10 0" dur="0.7s" begin="0.1s" repeatCount="indefinite"/>
          </path>
          <path d="M 60 175 q 5 -5 10 0 q 5 -5 10 0" fill="none" stroke="#fff66d" stroke-width="1.4" opacity="0.9">
            <animate attributeName="d" values="M 60 175 q 5 -5 10 0 q 5 -5 10 0; M 60 175 q 5 -2 10 0 q 5 -2 10 0; M 60 175 q 5 -5 10 0 q 5 -5 10 0" dur="0.65s" begin="0.15s" repeatCount="indefinite"/>
          </path>
          <path d="M 88 205 q 4 -4 8 0 q 4 -4 8 0" fill="none" stroke="#fff66d" stroke-width="1.1" opacity="0.7">
            <animate attributeName="d" values="M 88 205 q 4 -4 8 0 q 4 -4 8 0; M 88 205 q 4 -1 8 0 q 4 -1 8 0; M 88 205 q 4 -4 8 0 q 4 -4 8 0" dur="0.75s" begin="0.05s" repeatCount="indefinite"/>
          </path>
        </g>
      </g>

      <!-- Aurora borealis above the mountains -->
      <g class="aurora" opacity="0.5">
        <path d="M 0 60 Q 300 20 600 70 T 1200 50 T 1800 80 T 2000 60 L 2000 190 Q 1700 150 1400 185 T 800 165 T 200 195 T 0 175 Z"
              fill="#7df9aa" opacity="0.22">
          <animate attributeName="opacity" values="0.10;0.30;0.10" dur="9s" repeatCount="indefinite"/>
        </path>
        <path d="M 0 95 Q 400 55 800 105 T 1600 85 T 2000 110 L 2000 215 Q 1600 180 1200 210 T 400 195 T 0 220 Z"
              fill="#c89cff" opacity="0.18">
          <animate attributeName="opacity" values="0.06;0.26;0.06" dur="13s" repeatCount="indefinite" begin="2s"/>
        </path>
        <path d="M 0 130 Q 500 100 1000 145 T 2000 130 L 2000 200 Q 1500 175 1000 200 T 0 195 Z"
              fill="#66ddff" opacity="0.14">
          <animate attributeName="opacity" values="0.04;0.20;0.04" dur="11s" repeatCount="indefinite" begin="4.5s"/>
        </path>
      </g>

      <!-- Stone path connecting bridge → village → temple -->
      <g class="stone-path" opacity="0.55">
        <path d="M 950 900 Q 1150 880 1250 850 T 1400 810" fill="none" stroke="#8a8a9a" stroke-width="12" stroke-linecap="round"/>
        <path d="M 950 900 Q 1150 880 1250 850 T 1400 810" fill="none" stroke="#b8b8c8" stroke-width="7"
              stroke-dasharray="6 9" stroke-linecap="round"/>
      </g>

      <!-- Campfire in the village plaza -->
      <g class="campfire" transform="translate(1180, 930)">
        <!-- stone ring -->
        <ellipse cx="0" cy="6" rx="17" ry="6" fill="#5a5a68" stroke="#1a0033" stroke-width="1"/>
        <ellipse cx="0" cy="5" rx="12" ry="4" fill="#2a2a34"/>
        <!-- logs -->
        <rect x="-11" y="0" width="22" height="4" fill="#5a3018" transform="rotate(14)"/>
        <rect x="-11" y="0" width="22" height="4" fill="#4a2810" transform="rotate(-20)"/>
        <!-- flames -->
        <path d="M 0 2 Q -7 -8 -3 -16 Q 0 -10 0 -18 Q 3 -10 4 -16 Q 8 -8 0 2 Z" fill="#ff8866">
          <animate attributeName="d"
            values="M 0 2 Q -7 -8 -3 -16 Q 0 -10 0 -18 Q 3 -10 4 -16 Q 8 -8 0 2 Z;
                    M 0 2 Q -8 -9 -2 -20 Q 0 -12 1 -22 Q 4 -12 5 -18 Q 9 -8 0 2 Z;
                    M 0 2 Q -7 -8 -3 -16 Q 0 -10 0 -18 Q 3 -10 4 -16 Q 8 -8 0 2 Z"
            dur="0.55s" repeatCount="indefinite"/>
        </path>
        <path d="M 0 2 Q -4 -6 -1 -12 Q 0 -7 1 -13 Q 4 -6 0 2 Z" fill="#fff66d">
          <animate attributeName="d"
            values="M 0 2 Q -4 -6 -1 -12 Q 0 -7 1 -13 Q 4 -6 0 2 Z;
                    M 0 2 Q -5 -7 0 -15 Q 1 -8 2 -14 Q 5 -6 0 2 Z;
                    M 0 2 Q -4 -6 -1 -12 Q 0 -7 1 -13 Q 4 -6 0 2 Z"
            dur="0.4s" repeatCount="indefinite"/>
        </path>
        <!-- sparks -->
        <circle cx="0" cy="-18" r="1.4" fill="#fff66d">
          <animate attributeName="cy" values="-18;-46" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="cx" values="0;7" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="0" cy="-18" r="1.2" fill="#ff8866">
          <animate attributeName="cy" values="-18;-42" dur="1.8s" begin="0.6s" repeatCount="indefinite"/>
          <animate attributeName="cx" values="0;-6" dur="1.8s" begin="0.6s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0" dur="1.8s" begin="0.6s" repeatCount="indefinite"/>
        </circle>
        <!-- warm ground glow -->
        <ellipse cx="0" cy="8" rx="40" ry="13" fill="#ff8866" opacity="0.13">
          <animate attributeName="opacity" values="0.08;0.20;0.08" dur="1.1s" repeatCount="indefinite"/>
        </ellipse>
      </g>

      <!-- Clock tower — hands set to the real current time -->
      <g class="clock-tower" transform="translate(1290, 1000)">
        <rect x="-16" y="0" width="32" height="120" fill="#a89890" stroke="#1a0033" stroke-width="1.5"/>
        <rect x="-16" y="0" width="32" height="8" fill="#7a6a62"/>
        <polygon points="-22,0 0,-30 22,0" fill="#5a2088" stroke="#1a0033" stroke-width="1.5"/>
        <rect x="-5" y="88" width="10" height="32" fill="#4a2810" stroke="#1a0033" stroke-width="1"/>
        <!-- clock face -->
        <circle cx="0" cy="34" r="13" fill="#fff9d0" stroke="#1a0033" stroke-width="1.5"/>
        <circle cx="0" cy="22.5" r="0.9" fill="#1a0033"/>
        <circle cx="0" cy="45.5" r="0.9" fill="#1a0033"/>
        <circle cx="-11.5" cy="34" r="0.9" fill="#1a0033"/>
        <circle cx="11.5" cy="34" r="0.9" fill="#1a0033"/>
        <!-- hour hand -->
        <line x1="0" y1="34" x2="0" y2="27" stroke="#1a0033" stroke-width="2" stroke-linecap="round"
              transform="rotate(${(((new Date()).getHours() % 12) * 30 + (new Date()).getMinutes() * 0.5).toFixed(1)} 0 34)"/>
        <!-- minute hand, creeps forward in real time -->
        <line x1="0" y1="34" x2="0" y2="24" stroke="#1a0033" stroke-width="1.3" stroke-linecap="round"
              transform="rotate(${((new Date()).getMinutes() * 6).toFixed(1)} 0 34)">
          <animateTransform attributeName="transform" type="rotate" additive="sum"
            from="0 0 34" to="360 0 34" dur="3600s" repeatCount="indefinite"/>
        </line>
        <circle cx="0" cy="34" r="1.6" fill="#1a0033"/>
        <!-- bell glow -->
        <circle cx="0" cy="-12" r="3.5" fill="#fff66d" opacity="0.85">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite"/>
        </circle>
      </g>

      <!-- Moored rowboats on the riverbank -->
      <g class="rowboats">
        <g transform="translate(320, 648)">
          <path d="M 0 0 L 34 0 L 29 9 L 5 9 Z" fill="#8a6038" stroke="#1a0033" stroke-width="1.2"/>
          <line x1="6" y1="2" x2="28" y2="2" stroke="#5a3018" stroke-width="1"/>
          <line x1="24" y1="1" x2="40" y2="-6" stroke="#5a3018" stroke-width="1.5"/>
          <animateTransform attributeName="transform" type="translate" additive="sum"
            values="0,0; 0,2.5; 0,0" dur="3.4s" repeatCount="indefinite"/>
        </g>
        <g transform="translate(1520, 636)">
          <path d="M 0 0 L 30 0 L 26 8 L 4 8 Z" fill="#7a5028" stroke="#1a0033" stroke-width="1.2"/>
          <line x1="5" y1="2" x2="25" y2="2" stroke="#4a2810" stroke-width="1"/>
          <animateTransform attributeName="transform" type="translate" additive="sum"
            values="0,0; 0,-2.5; 0,0" dur="4.1s" repeatCount="indefinite" begin="1.2s"/>
        </g>
      </g>

      <!-- Throng flag on the windmill -->
      <g class="throng-flag" transform="translate(410, 685)">
        <rect x="0" y="0" width="2" height="26" fill="#4a2810"/>
        <path d="M 2 2 L 24 4 L 20 10 L 24 16 L 2 14 Z" fill="#ff6ec7" stroke="#1a0033" stroke-width="0.8">
          <animate attributeName="d"
            values="M 2 2 L 24 4 L 20 10 L 24 16 L 2 14 Z;
                    M 2 2 L 22 6 L 26 10 L 22 14 L 2 14 Z;
                    M 2 2 L 24 4 L 20 10 L 24 16 L 2 14 Z"
            dur="2.2s" repeatCount="indefinite"/>
        </path>
        <circle cx="12" cy="9" r="3" fill="#fff66d" opacity="0.9"/>
        <circle cx="12" cy="9" r="1.5" fill="#0a0014"/>
      </g>

      <!-- Vignette overlay -->
      <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
        <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(10,0,20,0.7)"/>
      </radialGradient>
      <rect width="${W}" height="${H}" fill="url(#vignette)"/>
    </svg>
  `;
}

function renderUniverse() {
  const wrap = document.getElementById('universeMapWrap');
  const map = document.getElementById('universeMap');
  if (!wrap || !map) return;
  universeWrapEl = wrap;
  universeMapEl = map;

  // Build the map SVG once
  if (!universeBuilt) {
    map.innerHTML = buildUniverseMapSVG();
    map.style.width = UNIVERSE_MAP_W + 'px';
    map.style.height = UNIVERSE_MAP_H + 'px';
    universeBuilt = true;
    setupUniversePan();
    // Start centered
    universePan.x = -(UNIVERSE_MAP_W / 2 - wrap.clientWidth / 2);
    universePan.y = -(UNIVERSE_MAP_H / 2 - wrap.clientHeight / 2);
    applyUniversePan();
  }

  // Remove any previous thronglets
  map.querySelectorAll('.uni-throng, .uni-bubble').forEach(el => el.remove());
  universeThrongs = [];

  // Gather all thronglets across all months (dedupe suscri recurring — show only original)
  const all = state.expenses.filter(e => e.type !== 'settlement');
  const monthsSet = new Set(all.map(e => monthKey(new Date(e.timestamp))));
  document.getElementById('universeTotal').textContent = all.length;
  document.getElementById('universeMonths').textContent = monthsSet.size;

  // Position seeded by expense.id so positions are stable across renders
  const idHash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) >>> 0; return h; };

  for (const e of all) {
    const papa = getPapaById(e.papaId);
    if (!papa) continue;
    const size = Math.min(72, Math.max(38, 32 + Math.sqrt(e.amount) * 2));
    const h = idHash(e.id);
    // Avoid sky area (< 380) and edge margins
    const x = 100 + ((h & 0xffff) / 0xffff) * (UNIVERSE_MAP_W - size - 200);
    const y = 400 + ((h >>> 16) / 0xffff) * (UNIVERSE_MAP_H - 460);
    const angle = ((h >>> 8) & 0xff) / 255 * Math.PI * 2;
    const speed = 0.15 + Math.random() * 0.25;

    const tutorColor = e.tutor === 'Isi' ? '#00d4ff' : '#ff9933';
    const el = document.createElement('div');
    el.className = `uni-throng ${papa.cls}` + (e.bornSick ? ' sick' : '');
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.style.setProperty('--tutor-color', tutorColor);
    el.dataset.expenseId = e.id;
    el.dataset.tutor = e.tutor.toLowerCase();
    const eMonth = monthKey(new Date(e.timestamp));
    el.innerHTML = `
      <div class="mini-tag">${e.name.substring(0,14)}</div>
      <div class="mini-frame"><img class="sprite" src="${SPRITES[papa.sprite] || SPRITES.A_think}" alt=""></div>
      <div class="uni-month">${eMonth}</div>
    `;
    el.addEventListener('click', (ev) => {
      if (universeDrag && universeDrag.moved) return; // don't fire click after drag
      ev.stopPropagation();
      tellStory(e, el);
    });
    map.appendChild(el);
    universeThrongs.push({
      el, expense: e, x, y, size,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      stopUntil: 0
    });
  }
}

function tickUniverse() {
  if (currentView !== 'universe' || document.hidden) return;
  const now = Date.now();
  const MARGIN_X = 60, TOP_MARGIN = 380, BOT_MARGIN = 40;
  for (const t of universeThrongs) {
    if (now < t.stopUntil) continue;
    if (Math.random() < 0.015) {
      t.vx += (Math.random() - 0.5) * 0.3;
      t.vy += (Math.random() - 0.5) * 0.3;
    }
    t.vx *= 0.988; t.vy *= 0.988;
    const sp = Math.hypot(t.vx, t.vy);
    if (sp > 1.0) { t.vx = (t.vx/sp) * 1.0; t.vy = (t.vy/sp) * 1.0; }
    if (sp < 0.08) {
      const a = Math.random() * Math.PI * 2;
      t.vx += Math.cos(a) * 0.12;
      t.vy += Math.sin(a) * 0.12;
    }
    t.x += t.vx; t.y += t.vy;
    if (t.x < MARGIN_X) { t.x = MARGIN_X; t.vx = Math.abs(t.vx); }
    if (t.x > UNIVERSE_MAP_W - t.size - MARGIN_X) { t.x = UNIVERSE_MAP_W - t.size - MARGIN_X; t.vx = -Math.abs(t.vx); }
    if (t.y < TOP_MARGIN) { t.y = TOP_MARGIN; t.vy = Math.abs(t.vy); }
    if (t.y > UNIVERSE_MAP_H - t.size - BOT_MARGIN) { t.y = UNIVERSE_MAP_H - t.size - BOT_MARGIN; t.vy = -Math.abs(t.vy); }
    t.el.style.transform = `translate3d(${t.x.toFixed(1)}px, ${t.y.toFixed(1)}px, 0)`;
  }
  // Collision-driven duets, throttled and rare (there could be 500+ throngs)
  if (now - universeLastCollisionCheck > 500) {
    universeLastCollisionCheck = now;
    detectUniverseCollisions(now);
  }
}
function detectUniverseCollisions(now) {
  // Cheap grid partition to avoid O(n²) with many throngs
  const CELL = 100;
  const grid = new Map();
  for (const t of universeThrongs) {
    const k = ((t.x / CELL) | 0) + '_' + ((t.y / CELL) | 0);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(t);
  }
  for (const [key, bucket] of grid) {
    if (bucket.length < 2) continue;
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i], b = bucket[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < (a.size + b.size) / 2 - 4) {
          const nx = (a.x - b.x) / (dist || 1);
          const ny = (a.y - b.y) / (dist || 1);
          a.vx += nx * 0.2; a.vy += ny * 0.2;
          b.vx -= nx * 0.2; b.vy -= ny * 0.2;
          // Random rare duet
          if (Math.random() < 0.05) {
            a.stopUntil = now + 800; b.stopUntil = now + 800;
            try { playDuet(a, b); } catch (e) {}
          }
        }
      }
    }
  }
}
function startUniverseTick() {
  if (universeRaf) return;
  const loop = () => {
    tickUniverse();
    if (currentView === 'universe' && !document.hidden) universeRaf = requestAnimationFrame(loop);
    else universeRaf = null;
  };
  universeRaf = requestAnimationFrame(loop);
}
function stopUniverseTick() {
  if (universeRaf) cancelAnimationFrame(universeRaf);
  universeRaf = null;
}

function applyUniversePan() {
  if (!universeMapEl || !universeWrapEl) return;
  // Clamp so the map can't be dragged off the visible area entirely
  const wrap = universeWrapEl;
  const minX = Math.min(0, wrap.clientWidth - UNIVERSE_MAP_W);
  const minY = Math.min(0, wrap.clientHeight - UNIVERSE_MAP_H);
  if (universePan.x > 0) universePan.x = 0;
  if (universePan.y > 0) universePan.y = 0;
  if (universePan.x < minX) universePan.x = minX;
  if (universePan.y < minY) universePan.y = minY;
  universeMapEl.style.transform = `translate3d(${universePan.x}px, ${universePan.y}px, 0)`;
}

function setupUniversePan() {
  const wrap = universeWrapEl;
  if (!wrap) return;
  const onDown = (e) => {
    // Don't start pan drag on a thronglet click
    if (e.target.closest('.uni-throng')) return;
    const pt = e.touches ? e.touches[0] : e;
    universeDrag = {
      startX: pt.clientX, startY: pt.clientY,
      panX: universePan.x, panY: universePan.y,
      moved: false
    };
    wrap.classList.add('grabbing');
  };
  const onMove = (e) => {
    if (!universeDrag) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - universeDrag.startX;
    const dy = pt.clientY - universeDrag.startY;
    if (!universeDrag.moved && Math.hypot(dx, dy) > 4) universeDrag.moved = true;
    universePan.x = universeDrag.panX + dx;
    universePan.y = universeDrag.panY + dy;
    applyUniversePan();
    if (e.touches) e.preventDefault();
  };
  const onUp = () => {
    if (universeDrag) {
      setTimeout(() => { universeDrag = null; }, 50);
      wrap.classList.remove('grabbing');
    }
  };
  wrap.addEventListener('mousedown', onDown);
  wrap.addEventListener('mousemove', onMove);
  wrap.addEventListener('mouseup', onUp);
  wrap.addEventListener('mouseleave', onUp);
  wrap.addEventListener('touchstart', onDown, { passive: true });
  wrap.addEventListener('touchmove', onMove, { passive: false });
  wrap.addEventListener('touchend', onUp);
}


/* ============================================
   11b. MANDELBROT BACKGROUND (settled worlds)
   ─────────────────────────────────────────────
   Worlds (months) with at least one settlement get
   a fractal canvas painted with that month's papa
   palette as backdrop. Soft, drifty, low-res.
   ============================================ */
function hexToRgb(hex) {
  const h = (hex || '#ff6ec7').replace('#', '');
  const m = h.length === 3
    ? h.split('').map(c => parseInt(c + c, 16))
    : (h.match(/.{2}/g) || []).map(c => parseInt(c, 16));
  return { r: m[0] || 0, g: m[1] || 0, b: m[2] || 0 };
}

function buildPapaPalette(monthExpenses) {
  // Final palette: low iteration → bright papa color, high iteration → fades to deep purple
  const counts = {};
  let total = 0;
  for (const e of monthExpenses) {
    if (e.type === 'settlement') continue;
    counts[e.papaId] = (counts[e.papaId] || 0) + 1;
    total++;
  }

  // If no expenses this month, use a default fallback palette
  let papaColors;
  if (total === 0) {
    papaColors = [
      hexToRgb(COLOR_SLOTS['t-rosa'].color),
      hexToRgb(COLOR_SLOTS['t-menta'].color),
      hexToRgb(COLOR_SLOTS['t-lila'].color)
    ].map(c => ({ ...c, weight: 1 }));
  } else {
    papaColors = [];
    for (const papa of state.papas) {
      const c = counts[papa.id] || 0;
      if (c === 0) continue;
      const slot = COLOR_SLOTS[papa.cls];
      if (!slot) continue;
      const rgb = hexToRgb(slot.color);
      papaColors.push({ r: rgb.r, g: rgb.g, b: rgb.b, weight: c / total });
    }
    if (papaColors.length === 0) {
      papaColors = [{ ...hexToRgb(COLOR_SLOTS['t-rosa'].color), weight: 1 }];
    }
  }

  // Build a weighted, ordered palette by repeating each color proportional to weight
  const SLOTS = 32;
  const palette = [];
  for (const pc of papaColors) {
    const repeats = Math.max(1, Math.round(pc.weight * SLOTS));
    for (let i = 0; i < repeats; i++) palette.push([pc.r, pc.g, pc.b]);
  }
  // Shuffle slightly so neighboring colors swirl
  const out = [];
  for (let i = 0; i < palette.length; i++) {
    const j = (i * 7 + 3) % palette.length;
    out.push(palette[j]);
  }
  return out;
}

function drawMandelbrot(canvas, palette) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  const data = img.data;
  const maxIter = 56;

  // Centered, slightly zoomed onto the main bulb (classic look)
  const aspect = w / h;
  const yRange = 2.2;
  const xRange = yRange * aspect;
  const xCenter = -0.6;
  const yCenter = 0;
  const xMin = xCenter - xRange / 2;
  const xMax = xCenter + xRange / 2;
  const yMin = yCenter - yRange / 2;
  const yMax = yCenter + yRange / 2;

  for (let py = 0; py < h; py++) {
    const y0 = yMin + (yMax - yMin) * (py / h);
    for (let px = 0; px < w; px++) {
      const x0 = xMin + (xMax - xMin) * (px / w);
      let x = 0, y = 0, iter = 0;
      while (x * x + y * y < 4 && iter < maxIter) {
        const xNew = x * x - y * y + x0;
        y = 2 * x * y + y0;
        x = xNew;
        iter++;
      }
      const p = (py * w + px) * 4;
      if (iter === maxIter) {
        // Inside the Mandelbrot set → fully transparent (lets stage gradient show)
        data[p] = 0; data[p + 1] = 0; data[p + 2] = 0; data[p + 3] = 0;
      } else {
        const t = iter / maxIter;
        const idx = Math.min(palette.length - 1, Math.floor(t * palette.length));
        const c = palette[idx] || [180, 120, 220];
        // Brighter near edge, dimmer deep
        const brightness = 0.4 + 0.6 * (1 - Math.pow(t, 0.6));
        data[p]     = Math.min(255, Math.round(c[0] * brightness));
        data[p + 1] = Math.min(255, Math.round(c[1] * brightness));
        data[p + 2] = Math.min(255, Math.round(c[2] * brightness));
        data[p + 3] = Math.round(255 * (0.4 + 0.6 * (1 - t)));
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

let lastMandelbrotKey = null;
function renderMandelbrotBackground() {
  const stage = document.getElementById('worldStage');
  const canvas = document.getElementById('mandelbrotBg');
  if (!stage || !canvas) return;

  const settles = settlementsForMonth(worldMonthKey);
  if (settles.length === 0) {
    stage.classList.remove('has-settle');
    lastMandelbrotKey = null;
    return;
  }
  stage.classList.add('has-settle');

  // Only paint when world view is visible (avoid wasted work)
  if (currentView !== 'world') return;

  // Cache key: monthKey + settle count + #expenses + total amount → invalidates when month changes meaningfully
  const monthExp = expensesForMonth(worldMonthKey);
  const sum = monthExp.reduce((s, e) => s + e.amount, 0);
  const stageW = stage.clientWidth;
  const stageH = stage.clientHeight;
  if (!stageW || !stageH) {
    // Stage not yet laid out — try again on next tick
    requestAnimationFrame(() => renderMandelbrotBackground());
    return;
  }
  const key = `${worldMonthKey}|${settles.length}|${monthExp.length}|${sum.toFixed(2)}|${stageW}x${stageH}`;
  if (key === lastMandelbrotKey && canvas.width > 0) return;
  lastMandelbrotKey = key;

  // Render at reduced resolution for speed + pixelated aesthetic
  const targetMax = 160;
  let cw, ch;
  if (stageW >= stageH) { cw = targetMax; ch = Math.max(80, Math.round(targetMax * stageH / stageW)); }
  else { ch = targetMax; cw = Math.max(80, Math.round(targetMax * stageW / stageH)); }
  canvas.width = cw;
  canvas.height = ch;

  const palette = buildPapaPalette(monthExp);
  drawMandelbrot(canvas, palette);
}

function refreshHistorySettleBtn() {
  const btn = document.getElementById('historySettleBtn');
  if (!btn) return;
  const bal = computeMonthBalance(worldMonthKey);
  const settles = settlementsForMonth(worldMonthKey);

  // Build a "BALANCE DEL CICLO" status row that lives just above the button
  let statusEl = document.getElementById('historyCycleStatus');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'historyCycleStatus';
    statusEl.className = 'history-cycle-status';
    btn.parentNode.insertBefore(statusEl, btn);
  }
  if (bal.balanced) {
    statusEl.className = 'history-cycle-status balanced';
    statusEl.innerHTML = `<span class="cs-label">${t('history.cycle_balanced')}</span>`;
  } else {
    statusEl.className = 'history-cycle-status unbalanced';
    statusEl.innerHTML = `
      <span class="cs-label">${t('history.cycle_debt')}</span>
      <span class="cs-arrow">${bal.owesFrom} → ${bal.owesTo}</span>
      <span class="cs-amount">${fmt(bal.debtAmt)} €</span>`;
  }

  // Button label
  if (bal.balanced) {
    // Already even — show neutral state (allow extra settle anyway)
    btn.textContent = (settles.length > 0
      ? t('history.settle_cycle_done')
      : t('history.settle_cycle'));
    btn.classList.add('balanced');
    btn.classList.remove('has-debt');
  } else {
    btn.textContent = `${t('history.settle_cycle')} · ${fmt(bal.debtAmt)} €`;
    btn.classList.add('has-debt');
    btn.classList.remove('balanced');
  }
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
  refreshHistorySettleBtn();
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
      <span class="h-split">${splitLabel(e.split, e.tutor)}</span>
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
  if (isOpen) { buildHistoryFilters(); renderHistory(); refreshHistorySettleBtn(); chime(); } else beep(700);
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

  renderCyclesSection(monthKeysOrdered);
}

/* Cycles section: per-month status (balanced / settled / pending / overpaid) */
function renderCyclesSection(monthKeys) {
  const el = document.getElementById('cyclesList');
  if (!el) return;
  if (!monthKeys || monthKeys.length === 0) {
    el.innerHTML = `<div class="chart-empty">${t('stats.no_data')}</div>`;
    return;
  }
  // Most-recent first
  const ordered = [...monthKeys].reverse();
  el.innerHTML = ordered.map(mKey => {
    const bal = computeMonthBalance(mKey);
    const settles = settlementsForMonth(mKey);
    const monthExp = expensesForMonth(mKey);
    if (monthExp.length === 0 && settles.length === 0) {
      return `<div class="cycle-row"><span class="cy-month">${monthLabel(mKey)}</span><span class="cy-msg">${t('cycles.no_expenses')}</span><span class="cy-status">—</span></div>`;
    }
    let cls, statusKey, msg;
    if (bal.balanced) {
      cls = settles.length > 0 ? 'settled' : 'balanced';
      statusKey = settles.length > 0 ? 'cycles.settled' : 'cycles.balanced';
      msg = settles.length > 0
        ? `${settles.length} liquidación${settles.length > 1 ? 'es' : ''}`
        : t('deudas.balanced');
    } else {
      cls = 'pending';
      statusKey = 'cycles.pending';
      msg = `${bal.owesFrom} → ${bal.owesTo} · <span class="cy-amount">${fmt(bal.debtAmt)} €</span>`;
    }
    return `
      <div class="cycle-row ${cls}">
        <span class="cy-month">${monthLabel(mKey)}</span>
        <span class="cy-msg">${msg}</span>
        <span class="cy-status">${t(statusKey)}</span>
      </div>`;
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
  document.getElementById('editSplit').value = splitKey(e.split, e.tutor);
  buildEditPapaSelector();
  document.querySelectorAll('#editPapaSelector .papa-btn').forEach(b => b.classList.toggle('active', b.dataset.editPapa === e.papaId));
  document.querySelectorAll('#editTutorSelector .tutor-btn').forEach(b => b.classList.toggle('active', b.dataset.editTutor === e.tutor));
  document.getElementById('editModal').hidden = false;
  refreshSplitExplain();
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
  e.split  = splitObj(document.getElementById('editSplit').value, e.tutor);
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
    opt.style.setProperty('--sprite-preview', `url("${s.file}")`);
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
   15b. SETTLE RITUAL
   ─────────────────────────────────────────────
   Full-screen cinematic moment fired right after
   a settlement is recorded. Vignette + radial burst
   + conic rays + tutor-to-tutor coin shower + sound.
   Duration ≈ 2.6s.
   ============================================ */
let ritualBusy = false;

function ritualSound() {
  let ctx;
  try { ctx = ensureAudio(); } catch (e) { return; }
  const t0 = ctx.currentTime;

  // 1) Deep impact (boom) on entrance
  try {
    const boom = ctx.createOscillator();
    const boomG = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(110, t0);
    boom.frequency.exponentialRampToValueAtTime(38, t0 + 0.55);
    boom.connect(boomG).connect(out());
    env(boomG, t0, 0.005, 0.12, 0.5, 0.42, 0.32);
    boom.start(t0); boom.stop(t0 + 0.7);
  } catch (e) {}

  // 2) Sub-bass shimmer pad
  try {
    const pad = ctx.createOscillator();
    const padG = ctx.createGain();
    pad.type = 'triangle';
    pad.frequency.setValueAtTime(196, t0 + 0.05);
    pad.connect(padG).connect(out());
    env(padG, t0 + 0.05, 0.15, 0.4, 0.4, 1.6, 0.1);
    pad.start(t0 + 0.05); pad.stop(t0 + 2.4);
  } catch (e) {}

  // 3) Ascending sparkle arpeggio (counting the gold)
  const arpFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
  arpFreqs.forEach((f, i) => {
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(g).connect(out());
      const start = t0 + 0.35 + i * 0.085;
      env(g, start, 0.005, 0.06, 0.4, 0.18, 0.16);
      osc.start(start); osc.stop(start + 0.3);
    } catch (e) {}
  });

  // 4) Final ringing chord (release)
  setTimeout(() => {
    try {
      const ctx2 = ensureAudio();
      const tx = ctx2.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const osc = ctx2.createOscillator();
        const g = ctx2.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        osc.connect(g).connect(out());
        env(g, tx + i * 0.02, 0.01, 0.4, 0.5, 0.8, 0.14);
        osc.start(tx); osc.stop(tx + 1.4);
      });
    } catch (e) {}
  }, 1150);

  // 5) Sparkle dust at the end
  setTimeout(() => {
    try {
      const ctx2 = ensureAudio();
      const tx = ctx2.currentTime;
      for (let i = 0; i < 8; i++) {
        const osc = ctx2.createOscillator();
        const g = ctx2.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 1600 + Math.random() * 1200;
        osc.connect(g).connect(out());
        env(g, tx + i * 0.04, 0.003, 0.04, 0.3, 0.06, 0.09);
        osc.start(tx + i * 0.04); osc.stop(tx + i * 0.04 + 0.12);
      }
    } catch (e) {}
  }, 1900);
}

function spawnRitualCoins(fromIsRight) {
  const wrap = document.getElementById('ritualCoins');
  if (!wrap) return;
  wrap.innerHTML = '';

  const W = window.innerWidth;
  const H = window.innerHeight;
  const cx = W / 2;
  const cy = H / 2;

  // From-tutor side (start point) and to-tutor side (end point)
  // Both rendered around the centered actor row, ~70-160 px offset to either side
  const sideOffset = Math.min(220, W * 0.32);
  const startX = fromIsRight ? cx + sideOffset : cx - sideOffset;
  const endX   = fromIsRight ? cx - sideOffset : cx + sideOffset;
  const baseY  = cy - 4;

  const NUM_COINS = 14;
  for (let i = 0; i < NUM_COINS; i++) {
    const coin = document.createElement('div');
    coin.className = 'ritual-coin';
    // Arc apex randomised
    const xJit = (Math.random() - 0.5) * 80;
    const yJit = (Math.random() - 0.5) * 40;
    const xmid = (startX + endX) / 2 + xJit;
    const ymid = baseY - 160 - Math.random() * 100;
    const yEnd = baseY + yJit + 20;
    // Place at the center for the transform-translate offsets to make sense
    coin.style.left = '0';
    coin.style.top  = '0';
    coin.style.setProperty('--x0', startX + 'px');
    coin.style.setProperty('--y0', baseY + 'px');
    coin.style.setProperty('--xmid', xmid + 'px');
    coin.style.setProperty('--ymid', ymid + 'px');
    coin.style.setProperty('--x1', endX + 'px');
    coin.style.setProperty('--y1', yEnd + 'px');
    coin.style.setProperty('--delay', (200 + i * 75) + 'ms');
    coin.style.setProperty('--dur', (900 + Math.random() * 350) + 'ms');
    wrap.appendChild(coin);
  }
  // Trigger animation in next frame so the browser registers initial position first
  requestAnimationFrame(() => {
    wrap.querySelectorAll('.ritual-coin').forEach(c => c.classList.add('animate'));
  });
}

function playSettleRitual({ fromTutor, toTutor, amount }) {
  if (ritualBusy) return;
  const overlay = document.getElementById('settleRitual');
  if (!overlay) return;
  ritualBusy = true;

  // Set actors
  const fromEl = document.getElementById('ritualFrom');
  const toEl   = document.getElementById('ritualTo');
  const amtEl  = document.getElementById('ritualAmount');
  if (fromEl) {
    fromEl.textContent = fromTutor.toUpperCase();
    fromEl.className = 'ritual-tutor from ' + fromTutor.toLowerCase();
  }
  if (toEl) {
    toEl.textContent = toTutor.toUpperCase();
    toEl.className = 'ritual-tutor to ' + toTutor.toLowerCase();
  }
  if (amtEl) amtEl.textContent = fmt(amount) + ' €';

  // Reset animations (force restart by removing/re-adding hidden + reflow)
  overlay.hidden = false;
  // Force reflow so animations re-trigger if ritual was just played
  overlay.querySelectorAll('.ritual-burst, .ritual-rays, .ritual-vignette, .ritual-content, .ritual-title, .ritual-amount, .ritual-tagline')
    .forEach(el => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });

  // Coins fly from the FROM tutor (left or right) toward the TO tutor.
  // Default layout in markup: FROM on the left, TO on the right.
  spawnRitualCoins(/* fromIsRight= */ false);

  // Sound
  ritualSound();

  // Auto-hide
  clearTimeout(playSettleRitual._t);
  playSettleRitual._t = setTimeout(() => {
    overlay.hidden = true;
    const wrap = document.getElementById('ritualCoins');
    if (wrap) wrap.innerHTML = '';
    ritualBusy = false;
  }, 2700);
}


/* ============================================
   15c. GOAL CELEBRATION + MONTH-END RITUAL
   ─────────────────────────────────────────────
   - Goal celebration: confetti burst when a saving
     goal reaches 100%.
   - Month-end ritual: when the user opens the app
     in a new month (vs last_visited_month stored
     in settings), show a recap cutscene of the
     previous cycle (total spent, throngs born,
     balance/settle status).
   ============================================ */
const CONFETTI_COLORS = ['#ff6ec7', '#7df9aa', '#c89cff', '#fff66d', '#66ddff', '#ff8866'];
let goalCelebBusy = false;

function spawnConfetti(count = 60) {
  const wrap = document.getElementById('confettiWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const W = window.innerWidth;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    const startX = Math.random() * W;
    const endX = startX + (Math.random() - 0.5) * 200;
    const fallY = window.innerHeight + 60;
    const rot = (Math.random() * 720) - 360;
    const dur = 1800 + Math.random() * 1400;
    const delay = Math.random() * 600;
    piece.style.left = startX + 'px';
    piece.style.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.transform = `translateY(-30px) rotate(0deg)`;
    piece.style.transition = `transform ${dur}ms cubic-bezier(0.2, 0.6, 0.4, 1) ${delay}ms, opacity 0.4s ease ${delay + dur - 400}ms`;
    wrap.appendChild(piece);
    requestAnimationFrame(() => {
      piece.style.transform = `translate(${endX - startX}px, ${fallY}px) rotate(${rot}deg)`;
      piece.style.opacity = '0';
    });
  }
}

function celebrationSound() {
  let ctx;
  try { ctx = ensureAudio(); } catch (e) { return; }
  const t0 = ctx.currentTime;
  // Triumphant arpeggio: C major in two octaves
  const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
  notes.forEach((f, i) => {
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.connect(g).connect(out());
      const start = t0 + i * 0.08;
      env(g, start, 0.005, 0.08, 0.5, 0.25, 0.18);
      osc.start(start); osc.stop(start + 0.35);
    } catch (e) {}
  });
  // Final chord
  setTimeout(() => {
    try {
      const ctx2 = ensureAudio();
      const tx = ctx2.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach(f => {
        const osc = ctx2.createOscillator();
        const g = ctx2.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        osc.connect(g).connect(out());
        env(g, tx, 0.005, 0.3, 0.5, 0.6, 0.15);
        osc.start(tx); osc.stop(tx + 1.0);
      });
    } catch (e) {}
  }, 600);
}

function showGoalCelebration(goal) {
  if (goalCelebBusy) return;
  const overlay = document.getElementById('goalCelebration');
  if (!overlay) return;
  goalCelebBusy = true;
  document.getElementById('celebEmoji').textContent = goal.emoji || '🎉';
  document.getElementById('celebName').textContent = `«${goal.name}»`;
  document.getElementById('celebAmount').textContent = fmt(goal.target) + ' €';
  overlay.hidden = false;
  overlay.querySelectorAll('.celeb-vignette, .celeb-content, .celeb-emoji')
    .forEach(el => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
  spawnConfetti(70);
  celebrationSound();
  clearTimeout(showGoalCelebration._t);
  showGoalCelebration._t = setTimeout(() => {
    overlay.hidden = true;
    const wrap = document.getElementById('confettiWrap');
    if (wrap) wrap.innerHTML = '';
    goalCelebBusy = false;
  }, 2500);
}

/* === MONTH-END RITUAL === */
function getLastVisitedMonth() {
  return state.settings?.lastVisitedMonth || null;
}
function setLastVisitedMonth(mKey) {
  state.settings = state.settings || {};
  state.settings.lastVisitedMonth = mKey;
  save();
  // Cloud-sync this single setting if connected
  if (typeof cloudPushSettings === 'function') cloudPushSettings();
}

function maybeShowMonthEndRitual() {
  // Compare current month vs last visited; if different (skipping null/first run),
  // show recap of the previous month.
  const current = monthKey(new Date());
  const last = getLastVisitedMonth();
  setLastVisitedMonth(current);
  if (!last) return;            // first run, nothing to recap
  if (last === current) return; // same month, no transition
  // Sanity: only recap if the user has been away ≤ 6 months (otherwise pointless)
  const monthsAway = (() => {
    let count = 0; let m = last;
    while (m !== current && count < 12) { m = shiftMonth(m, +1); count++; }
    return count;
  })();
  if (monthsAway === 0 || monthsAway > 6) return;
  showMonthEndRitual(last);
}

function showMonthEndRitual(mKey) {
  const overlay = document.getElementById('monthEndRitual');
  if (!overlay) return;
  const titleEl = document.getElementById('monthEndTitle');
  const statsEl = document.getElementById('monthEndStats');
  if (titleEl) titleEl.textContent = monthLabel(mKey);

  // Compute recap stats
  const expenses = expensesForMonth(mKey);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const throngsBorn = expenses.length;
  const bal = computeMonthBalance(mKey);

  // Build stats grid
  const balCls = bal.balanced ? 'balanced' : 'unbalanced';
  const balValue = bal.balanced
    ? t('month_end.balanced')
    : `${bal.owesFrom} → ${bal.owesTo}<br>${fmt(bal.debtAmt)} €`;
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="me-stat">
        <div class="label">${t('month_end.spent')}</div>
        <div class="value">${fmt(totalSpent)} €</div>
      </div>
      <div class="me-stat">
        <div class="label">${t('month_end.thronglets')}</div>
        <div class="value">${throngsBorn}</div>
      </div>
      <div class="me-stat balance ${balCls}">
        <div class="label">${t('month_end.balance')}</div>
        <div class="value">${balValue}</div>
      </div>
    `;
  }

  overlay.hidden = false;
  // Soft modem-dial as opening sound
  try { modemDial(); } catch (e) {}
}

function closeMonthEndRitual() {
  const overlay = document.getElementById('monthEndRitual');
  if (overlay) overlay.hidden = true;
  beep(900);
}


/* ============================================
   16. SETTLEMENT
   ============================================ */
let settleDir = 'gayle-to-isi';
function lastDayOfMonthYMD(mKey) {
  const [y, m] = mKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return mKey + '-' + String(lastDay).padStart(2, '0');
}
function openSettleModal(opts) {
  opts = opts || {};
  const amountInput = document.getElementById('settleAmount');
  const dateInput = document.getElementById('settleDate');
  const noteInput = document.getElementById('settleNote');
  const balLine = document.getElementById('settleBalanceLine');

  amountInput.value = opts.prefilledAmount && opts.prefilledAmount > 0
    ? opts.prefilledAmount.toFixed(2)
    : '';
  noteInput.value = '';
  dateInput.value = opts.prefilledDate || todayYMD();

  // Direction: opts.prefilledDir overrides; otherwise leave last selected
  if (opts.prefilledDir) settleDir = opts.prefilledDir;
  document.querySelectorAll('#settleDir .tutor-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.settle === settleDir)
  );

  // Balance info banner inside the modal
  if (balLine) {
    if (opts.balanceInfo) {
      balLine.hidden = false;
      balLine.className = 'settle-balance-line ' + (opts.balanceInfo.balanced ? 'balanced' : 'unbalanced');
      balLine.innerHTML = opts.balanceInfo.html;
    } else {
      balLine.hidden = true;
      balLine.innerHTML = '';
    }
  }

  document.getElementById('settleModal').hidden = false;
  setTimeout(() => amountInput.focus(), 50);
  beep(900);
}
function openSettleModalForMonth(mKey) {
  const bal = computeMonthBalance(mKey);
  const sameMonth = (mKey === monthKey(new Date()));
  const date = sameMonth ? todayYMD() : lastDayOfMonthYMD(mKey);
  const monthName = monthLabel(mKey);
  let balanceInfo;
  if (bal.balanced) {
    balanceInfo = {
      balanced: true,
      html: `<span class="bal-label">${t('settle.balance_for', { month: monthName })}</span>
             <span class="bal-msg">${t('deudas.balanced')}</span>`
    };
  } else {
    const dirKey = (bal.owesFrom === 'Gayle') ? 'gayle-to-isi' : 'isi-to-gayle';
    balanceInfo = {
      balanced: false,
      html: `<span class="bal-label">${t('settle.balance_for', { month: monthName })}</span>
             <span class="bal-msg">${t('deudas.owes', { from: bal.owesFrom, to: bal.owesTo, amount: fmt(bal.debtAmt) })}</span>
             <span class="bal-hint">${t('settle.prefilled_hint')}</span>`
    };
    openSettleModal({
      prefilledDate: date,
      prefilledAmount: bal.debtAmt,
      prefilledDir: dirKey,
      balanceInfo
    });
    return;
  }
  openSettleModal({ prefilledDate: date, balanceInfo });
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
  closeSettleModal();

  // Hide history panel so the world (+ new Mandelbrot) is the stage behind the ritual
  const histPanel = document.getElementById('historyPanel');
  const reopenHistory = histPanel && histPanel.classList.contains('show');
  if (reopenHistory) histPanel.classList.remove('show');

  // Pre-render Mandelbrot so it's ready underneath when the ritual fades
  if (currentView === 'world') renderMandelbrotBackground();

  // Epic ritual moment (visual + sound)
  playSettleRitual({ fromTutor, toTutor, amount });

  // After the ritual fades, update views and optionally re-open history
  renderDeudas(); renderHistory();
  refreshHistorySettleBtn();
  if (reopenHistory) {
    setTimeout(() => { histPanel.classList.add('show'); }, 2800);
  }
}

/* ============================================
   17. SETTINGS
   ============================================ */
/* ─── 100% SPLIT REVIEW TOOL ──────────────────
   Lists every expense whose split is 100% (either direction) across
   all months, showing the resulting debt in plain language, with a
   one-click flip. Nothing mutates until the user clicks. */
function buildReviewList() {
  const wrap = document.getElementById('reviewList');
  if (!wrap) return;
  const flagged = state.expenses
    .filter(e => e.type !== 'settlement')
    .filter(e => e.split && (e.split.isi === 1.0 || e.split.gayle === 1.0))
    .sort((a, b) => b.timestamp - a.timestamp);

  if (flagged.length === 0) {
    wrap.innerHTML = `<div class="review-empty">${t('review.none')}</div>`;
    return;
  }

  wrap.innerHTML = flagged.map(e => {
    const papa = getPapaById(e.papaId);
    const d = new Date(e.timestamp);
    const dStr = String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
    const payerIsIsi = e.tutor === 'Isi';
    const payerBearsAll = payerIsIsi ? (e.split.isi === 1.0) : (e.split.gayle === 1.0);
    const effect = payerBearsAll
      ? t('review.effect_no_debt')
      : t('review.effect_owes', {
          debtor: payerIsIsi ? 'Gayle' : 'Isi',
          amount: fmt(e.amount)
        });
    return `
      <div class="review-row ${papa?.cls || ''} ${payerBearsAll ? 'no-debt' : 'has-debt'}" data-review-id="${e.id}">
        <div class="rv-main">
          <span class="rv-name">${e.name}</span>
          <span class="rv-amount">${fmt(e.amount)} €</span>
        </div>
        <div class="rv-meta">
          <span class="rv-date">${dStr}</span>
          <span class="rv-tutor ${e.tutor.toLowerCase()}">${t('review.paid_by', { tutor: e.tutor })}</span>
        </div>
        <div class="rv-effect">→ ${effect}</div>
        <button class="rv-flip" type="button" data-flip-id="${e.id}">${t('review.flip')}</button>
      </div>`;
  }).join('');

  wrap.querySelectorAll('[data-flip-id]').forEach(btn => {
    btn.addEventListener('click', () => flipExpenseSplit(btn.dataset.flipId));
  });
}

function flipExpenseSplit(expenseId) {
  const e = state.expenses.find(x => x.id === expenseId);
  if (!e || !e.split) return;
  // Flip which tutor bears the full cost
  if (e.split.isi === 1.0)        e.split = { isi: 0.0, gayle: 1.0 };
  else if (e.split.gayle === 1.0) e.split = { isi: 1.0, gayle: 0.0 };
  else return;
  save();
  beep(1100);
  buildReviewList();
  renderColony(); renderDeudas();
  if (currentView === 'stats') renderStats();
  const hp = document.getElementById('historyPanel');
  if (hp && hp.classList.contains('show')) renderHistory();
}

function populateSettings() {
  buildPapasList();
  buildReviewList();
  document.querySelectorAll('input[name="splitModel"]').forEach(r => r.checked = (r.value === state.settings.splitModel));
  document.getElementById('masterVolume').value  = Math.round((state.settings.masterVolume || 0.6) * 100);
  document.getElementById('volLabel').textContent = Math.round((state.settings.masterVolume || 0.6) * 100);
  document.getElementById('worldChatter').value  = state.settings.worldChatter || 'normal';
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === currentLang()));
  const musicChk = document.getElementById('musicPlaying');
  if (musicChk) musicChk.checked = state.settings.musicPlaying !== false;
  const musicVol = document.getElementById('musicVolume');
  if (musicVol) musicVol.value = Math.round((state.settings.musicVolume ?? 0.4) * 100);
  const musicLbl = document.getElementById('musicVolLabel');
  if (musicLbl) musicLbl.textContent = Math.round((state.settings.musicVolume ?? 0.4) * 100);
  updateSaveLabel();
}
function saveSettings() {
  const sel = document.querySelector('input[name="splitModel"]:checked');
  if (sel) state.settings.splitModel = sel.value;
  state.settings.masterVolume = parseInt(document.getElementById('masterVolume').value, 10) / 100;
  state.settings.worldChatter = document.getElementById('worldChatter').value;
  const musicChk = document.getElementById('musicPlaying');
  const musicVol = document.getElementById('musicVolume');
  if (musicChk) state.settings.musicPlaying = musicChk.checked;
  if (musicVol) state.settings.musicVolume = parseInt(musicVol.value, 10) / 100;
  setMasterVolume(state.settings.masterVolume);
  setMusicVolume(state.settings.musicVolume);
  if (state.settings.musicPlaying) resumeBackgroundMusic();
  else pauseBackgroundMusic();
  save();
  cloudPushSettings();
  renderColony(); renderDeudas();
  chime();
  speak('PLOK-MOK!', t('speak.settings_saved'));
}
/* Sacrifice modal — typed keyword confirmation + optional auto-backup.
   Used for both "wipe current month" and "wipe all". */
let sacrificeCtx = null; // { scope: 'month'|'all', ids: [], keyword: str, onConfirm: fn }

function openSacrificeModal(scope) {
  const isAll = scope === 'all';
  let ids, warn, count, first, last, keyword;
  if (isAll) {
    const all = state.expenses.slice().sort((a,b) => a.timestamp - b.timestamp);
    ids = all.map(e => e.id);
    count = all.length;
    if (count === 0) { alert(t('sacrifice.no_data')); return; }
    first = new Date(all[0].timestamp).toLocaleDateString();
    last  = new Date(all[all.length-1].timestamp).toLocaleDateString();
    keyword = t('sacrifice.keyword_all');
    warn = t('sacrifice.warn_all', { count });
  } else {
    const key = monthKey(new Date());
    const monthList = state.expenses
      .filter(e => monthKey(new Date(e.timestamp)) === key)
      .sort((a,b) => a.timestamp - b.timestamp);
    ids = monthList.map(e => e.id);
    count = monthList.length;
    if (count === 0) { alert(t('sacrifice.no_data')); return; }
    first = new Date(monthList[0].timestamp).toLocaleDateString();
    last  = new Date(monthList[monthList.length-1].timestamp).toLocaleDateString();
    keyword = t('sacrifice.keyword_month');
    warn = t('sacrifice.warn_month', { count, month: monthLabel(key) });
  }
  sacrificeCtx = {
    scope, ids, keyword,
    onConfirm: () => {
      if (isAll) {
        state.expenses = [];
      } else {
        const idSet = new Set(ids);
        state.expenses = state.expenses.filter(e => !idSet.has(e.id));
      }
      save();
      alertCry(); setTimeout(chitter, 200);
      rebuildConceptHints();
      renderColony(); renderDeudas();
      if (currentView === 'world') renderWorld();
      if (currentView === 'universe') renderUniverse && renderUniverse();
      if (currentView === 'stats') renderStats();
    }
  };
  const inp = document.getElementById('sacrificeInput');
  const confirmBtn = document.getElementById('sacrificeConfirm');
  const kwEl = document.getElementById('sacrificeKeyword');
  const warnEl = document.getElementById('sacrificeWarn');
  const countEl = document.getElementById('sacrificeCount');
  const backupChk = document.getElementById('sacrificeBackup');
  if (inp) inp.value = '';
  if (confirmBtn) confirmBtn.disabled = true;
  if (kwEl) kwEl.textContent = keyword;
  if (warnEl) warnEl.textContent = warn;
  if (countEl) countEl.textContent = t('sacrifice.count_summary', { count, first, last });
  if (backupChk) backupChk.checked = true;
  const inpPlaceholder = document.getElementById('sacrificeInput');
  if (inpPlaceholder) inpPlaceholder.placeholder = keyword;
  document.getElementById('sacrificeModal').hidden = false;
  setTimeout(() => inp && inp.focus(), 50);
  beep(500);
}
function closeSacrificeModal() {
  document.getElementById('sacrificeModal').hidden = true;
  sacrificeCtx = null;
}
function onSacrificeInput() {
  if (!sacrificeCtx) return;
  const inp = document.getElementById('sacrificeInput');
  const btn = document.getElementById('sacrificeConfirm');
  const typed = (inp?.value || '').trim().toUpperCase();
  const ok = typed === sacrificeCtx.keyword;
  if (btn) btn.disabled = !ok;
}
function confirmSacrifice() {
  if (!sacrificeCtx) return;
  const inp = document.getElementById('sacrificeInput');
  const typed = (inp?.value || '').trim().toUpperCase();
  if (typed !== sacrificeCtx.keyword) return;
  const backupFirst = document.getElementById('sacrificeBackup')?.checked;
  const ctx = sacrificeCtx;
  closeSacrificeModal();
  if (backupFirst) {
    try { exportData(); } catch (e) { console.warn('auto-backup before sacrifice failed', e); }
    // Give the browser a moment to trigger the download before mutating state
    setTimeout(() => ctx.onConfirm(), 400);
  } else {
    ctx.onConfirm();
  }
}
function wipeAll() { openSacrificeModal('all'); }
function resetMonthBtn() { openSacrificeModal('month'); }

/* ============================================
   18. EXPORT / IMPORT
   ============================================ */
function isMobileViewport() { return window.matchMedia('(max-width: 600px)').matches; }

/* ============================================
   BACKGROUND MUSIC
   ============================================ */
let bgMusicEl = null;
let bgMusicStarted = false;
let bgMusicUnlockBound = false;

function initBackgroundMusic() {
  bgMusicEl = document.getElementById('bgMusic');
  if (!bgMusicEl) return;
  // Use unencoded path; the browser URL-encodes for the fetch. Safer across engines.
  bgMusicEl.src = BGM_FILE;
  bgMusicEl.loop = true;
  bgMusicEl.preload = 'auto';
  bgMusicEl.volume = state.settings.musicVolume ?? 0.4;
  bgMusicEl.load();
  // Diagnostic listeners
  bgMusicEl.addEventListener('error', () => {
    console.warn('BGM error', bgMusicEl.error);
    setMusicStatus('error');
  });
  bgMusicEl.addEventListener('play', () => setMusicStatus('playing'));
  bgMusicEl.addEventListener('pause', () => {
    if (!bgMusicEl.ended && state.settings.musicPlaying !== false) setMusicStatus('paused');
  });
}

function bindUnlockGesture() {
  if (bgMusicUnlockBound) return;
  bgMusicUnlockBound = true;
  const tryUnlock = () => {
    if (!bgMusicEl || bgMusicStarted) return;
    if (state.settings.musicPlaying === false) return;
    bgMusicEl.play().then(() => {
      bgMusicStarted = true;
      setMusicStatus('playing');
      cleanup();
    }).catch(() => { /* still blocked, keep listening */ });
  };
  const cleanup = () => {
    document.removeEventListener('click', tryUnlock, true);
    document.removeEventListener('touchend', tryUnlock, true);
    document.removeEventListener('keydown', tryUnlock, true);
    bgMusicUnlockBound = false;
  };
  document.addEventListener('click', tryUnlock, true);
  document.addEventListener('touchend', tryUnlock, true);
  document.addEventListener('keydown', tryUnlock, true);
}

function startBackgroundMusic() {
  if (!bgMusicEl) return;
  if (state.settings.musicPlaying === false) { setMusicStatus('off'); return; }
  bgMusicEl.volume = state.settings.musicVolume ?? 0.4;
  // Play with a promise-safe retry chain: fresh attempt, then on-gesture unlock
  const attempt = () => bgMusicEl.play()
    .then(() => { bgMusicStarted = true; setMusicStatus('playing'); })
    .catch(err => {
      console.warn('bgm play failed, will unlock on gesture:', err?.name || err);
      setMusicStatus('blocked');
      bindUnlockGesture();
    });
  // If we're already inside a click handler, this succeeds immediately.
  attempt();
}
function pauseBackgroundMusic() {
  if (bgMusicEl) bgMusicEl.pause();
  setMusicStatus('off');
}
function resumeBackgroundMusic() {
  if (!bgMusicEl) return;
  bgMusicEl.volume = state.settings.musicVolume ?? 0.4;
  bgMusicEl.play()
    .then(() => { bgMusicStarted = true; setMusicStatus('playing'); })
    .catch(err => {
      console.warn('bgm resume failed:', err?.name || err);
      setMusicStatus('blocked');
      bindUnlockGesture();
    });
}
function setMusicVolume(v) { if (bgMusicEl) bgMusicEl.volume = Math.max(0, Math.min(1, v)); }

function setMusicStatus(status) {
  // Reflect state in AJUSTES so user sees why music isn't playing
  const dot = document.getElementById('musicStatusDot');
  const label = document.getElementById('musicStatusLabel');
  const btn = document.getElementById('musicManualStart');
  if (!dot || !label) return;
  dot.className = 'music-status-dot ' + status;
  const messages = {
    playing: 'reproduciendo',
    paused: 'pausada',
    off: 'apagada',
    blocked: 'bloqueada por autoplay — toca la pantalla',
    error: 'error cargando el archivo',
    idle: 'aún no ha sonado'
  };
  const msgEn = {
    playing: 'playing',
    paused: 'paused',
    off: 'off',
    blocked: 'blocked by autoplay — tap the screen',
    error: 'file load error',
    idle: 'not started yet'
  };
  label.textContent = (currentLang() === 'en' ? msgEn : messages)[status] || status;
  if (btn) btn.hidden = !(status === 'blocked' || status === 'idle' || status === 'error');
}

/* ============================================
   END-OF-MONTH SPENDING PROJECTION
   ============================================ */
function renderProjection() {
  const pill = document.getElementById('projectionPill');
  const valEl = document.getElementById('projectionValue');
  if (!pill || !valEl) return;
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const elapsed = dayOfMonth;
  const monthly = expensesForMonth(monthKey(today));
  const spent = monthly.reduce((s, e) => s + e.amount, 0);
  // Need at least 2 days of data to project
  if (elapsed < 2 || spent === 0) { pill.hidden = true; return; }
  const projection = spent * (daysInMonth / elapsed);
  pill.hidden = false;
  valEl.textContent = fmt(projection);
  // Budget vs projection: compute total budget across papas
  const totalBudget = state.papas.reduce((s, p) => s + (p.budget || 0), 0);
  pill.classList.remove('warn', 'over');
  if (totalBudget > 0) {
    if (projection >= totalBudget) pill.classList.add('over');
    else if (projection >= totalBudget * 0.85) pill.classList.add('warn');
  }
}

/* ============================================
   THRONGLET EVOLUTION (months alive)
   - Calculated at render time, no schema change
   ============================================ */
function evolutionLevel(expense) {
  if (!expense.timestamp) return 1;
  const birth = new Date(expense.timestamp);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months >= 5) return 3;
  if (months >= 2) return 2;
  return 1;
}
function evolutionCrown(level) {
  if (level === 3) return '👑';
  if (level === 2) return '✨';
  return '';
}

/* ============================================
   TEMPLO DEL AHORRO — goals + savings
   - V1: localStorage only (no cloud sync of goals)
   ============================================ */
function getGoals() {
  if (!Array.isArray(state.goals)) state.goals = [];
  return state.goals;
}
let editingGoalId = null;
let savingsGoalId = null;
let savingsTutor = 'Isi';

function buildTempleView() {
  const wrap = document.getElementById('goalsList');
  if (!wrap) return;
  const goals = getGoals();
  if (goals.length === 0) {
    wrap.innerHTML = `<div class="temple-icon">🏛</div><div class="goal-empty">${t('temple.empty')}</div>`;
    return;
  }
  wrap.innerHTML = `<div class="temple-icon">🏛</div>` + goals.map(g => {
    const saved = (g.contributions || []).reduce((s, c) => s + c.amount, 0);
    const pct = Math.min(100, (saved / g.target) * 100);
    const complete = saved >= g.target;
    const contribIsi = (g.contributions || []).filter(c => c.tutor === 'Isi').reduce((s,c)=>s+c.amount, 0);
    const contribGayle = (g.contributions || []).filter(c => c.tutor === 'Gayle').reduce((s,c)=>s+c.amount, 0);
    const contribBoth = (g.contributions || []).filter(c => c.tutor === 'Both').reduce((s,c)=>s+c.amount, 0);
    const deadlineStr = g.deadline ? new Date(g.deadline).toLocaleDateString() : '';
    return `
      <div class="goal-card ${complete ? 'complete' : ''}" data-goal-id="${g.id}">
        <div class="goal-header">
          <div class="goal-emoji">${g.emoji || '🏖'}</div>
          <div class="goal-info">
            <div class="goal-name">${g.name}</div>
            ${deadlineStr ? `<div class="goal-deadline">${t('goal.until')} ${deadlineStr}</div>` : ''}
          </div>
          <button class="goal-edit-btn" data-goal-edit="${g.id}" type="button">✎</button>
        </div>
        <div class="goal-amounts">
          <span class="saved">${fmt(saved)} €</span>
          <span class="target">/ ${fmt(g.target)} €</span>
        </div>
        <div class="goal-progress ${complete ? 'complete' : ''}">
          <div class="goal-progress-fill" style="width:${pct}%"></div>
          <div class="goal-progress-text">${pct.toFixed(0)}%</div>
        </div>
        <div class="goal-tutors">
          ${contribIsi > 0 ? `<span class="isi-share">ISI ${fmt(contribIsi)}€</span>` : ''}
          ${contribGayle > 0 ? `<span class="gayle-share">GAYLE ${fmt(contribGayle)}€</span>` : ''}
          ${contribBoth > 0 ? `<span>AMBOS ${fmt(contribBoth)}€</span>` : ''}
        </div>
        <div class="goal-actions">
          <button class="goal-add-btn" data-goal-add="${g.id}" type="button">${complete ? '✓ ' + t('goal.completed') : '💰 ' + t('goal.add_savings')}</button>
        </div>
      </div>`;
  }).join('');
  // Bind events
  wrap.querySelectorAll('[data-goal-add]').forEach(b => b.addEventListener('click', () => openSavingsModal(b.dataset.goalAdd)));
  wrap.querySelectorAll('[data-goal-edit]').forEach(b => b.addEventListener('click', () => openGoalModal(b.dataset.goalEdit)));
}

function openGoalModal(goalId = null) {
  editingGoalId = goalId;
  const g = goalId ? getGoals().find(x => x.id === goalId) : null;
  document.getElementById('goalModalTitle').textContent = g ? t('goal.edit') : t('goal.new');
  document.getElementById('goalName').value = g?.name || '';
  document.getElementById('goalTarget').value = g?.target || '';
  document.getElementById('goalDeadline').value = g?.deadline || '';
  document.getElementById('goalEmoji').value = g?.emoji || '🏖';
  document.getElementById('goalDelete').hidden = !g;
  document.getElementById('goalModal').hidden = false;
  setTimeout(() => document.getElementById('goalName').focus(), 50);
  beep(900);
}
function closeGoalModal() { document.getElementById('goalModal').hidden = true; editingGoalId = null; }
function saveGoal() {
  const name = document.getElementById('goalName').value.trim();
  const target = parseFloat(document.getElementById('goalTarget').value);
  const deadline = document.getElementById('goalDeadline').value || null;
  const emoji = document.getElementById('goalEmoji').value.trim() || '🏖';
  if (!name || isNaN(target) || target <= 0) { alert(t('alert.invalid_data')); return; }
  const goals = getGoals();
  let updatedGoal;
  if (editingGoalId) {
    const g = goals.find(x => x.id === editingGoalId);
    if (!g) return;
    g.name = name; g.target = target; g.deadline = deadline; g.emoji = emoji;
    updatedGoal = g;
  } else {
    updatedGoal = {
      id: 'g' + Date.now() + Math.random().toString(36).slice(2,6),
      name, target, deadline, emoji,
      createdAt: Date.now(),
      contributions: []
    };
    goals.push(updatedGoal);
  }
  save();
  cloudPushGoal(updatedGoal);
  closeGoalModal();
  buildTempleView();
  chime();
  speak('PLOK!', editingGoalId ? t('speak.goal_updated') : t('speak.goal_created'));
}
function deleteGoal() {
  if (!editingGoalId) return;
  if (!confirm(t('confirm.delete_goal'))) return;
  const deletedId = editingGoalId;
  state.goals = getGoals().filter(g => g.id !== deletedId);
  save();
  cloudDeleteGoal(deletedId);
  closeGoalModal();
  buildTempleView();
  alertCry();
}

function openSavingsModal(goalId) {
  savingsGoalId = goalId;
  const g = getGoals().find(x => x.id === goalId);
  if (!g) return;
  document.getElementById('savingsGoalName').textContent = `${g.emoji} ${g.name}`;
  document.getElementById('savingsAmount').value = '';
  document.getElementById('savingsNote').value = '';
  document.querySelectorAll('#savingsTutorSelector .tutor-btn').forEach(b => b.classList.toggle('active', b.dataset.savingsTutor === 'Isi'));
  savingsTutor = 'Isi';
  document.getElementById('savingsModal').hidden = false;
  setTimeout(() => document.getElementById('savingsAmount').focus(), 50);
  beep(1100);
}
function closeSavingsModal() { document.getElementById('savingsModal').hidden = true; savingsGoalId = null; }
function saveSavings() {
  const amount = parseFloat(document.getElementById('savingsAmount').value);
  const note = document.getElementById('savingsNote').value.trim();
  if (isNaN(amount) || amount <= 0) { alert(t('alert.invalid_amount')); return; }
  const g = getGoals().find(x => x.id === savingsGoalId);
  if (!g) return;
  if (!Array.isArray(g.contributions)) g.contributions = [];
  g.contributions.push({
    id: 'c' + Date.now() + Math.random().toString(36).slice(2,4),
    amount, tutor: savingsTutor, note, timestamp: Date.now()
  });
  save();
  cloudPushGoal && cloudPushGoal(g);
  closeSavingsModal();
  buildTempleView();
  // Check if just completed
  const totalSavedBefore = g.contributions.slice(0, -1).reduce((s, c) => s + c.amount, 0);
  const totalSaved = totalSavedBefore + amount;
  const justReached = (totalSavedBefore < g.target) && (totalSaved >= g.target);
  if (justReached) {
    // Full epic celebration overlay
    showGoalCelebration(g);
    speak('KRII-MOK!', t('speak.goal_completed', { name: g.name }));
  } else {
    chime();
    setTimeout(chime, 200);
    const remaining = Math.max(0, g.target - totalSaved);
    speak('PLOK!', t('speak.goal_progress', { remaining: fmt(remaining), name: g.name }));
  }
}

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
    } catch (err) {
      alert(t('alert.import_error', { msg: err.message }));
    }
  };
  reader.readAsText(file);
}
/* ============================================
   19. AUTOCOMPLETE (concepto) + AUTO-SUGGEST PAPA
   ============================================ */
/* When the user types a concepto, scan history for the same name and
   auto-select its most-recent Papa. Subtle pulse on the suggested btn. */
function autoSuggestPapa(rawConcept) {
  if (!rawConcept) return;
  const q = rawConcept.trim().toLowerCase();
  if (q.length < 3) return;
  // Exact match first, then substring; preferring the most recent
  const candidates = state.expenses
    .filter(e => e.type === 'expense' && e.papaId && e.name)
    .filter(e => {
      const n = e.name.toLowerCase();
      return n === q || n.includes(q);
    })
    .sort((a, b) => {
      // exact match wins
      const aExact = a.name.toLowerCase() === q ? 1 : 0;
      const bExact = b.name.toLowerCase() === q ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return b.timestamp - a.timestamp;
    });
  const pick = candidates[0];
  if (!pick || !getPapaById(pick.papaId)) return;
  if (selectedPapa === pick.papaId) return; // already selected, no flash needed
  selectPapaUI(pick.papaId);
  const btn = document.querySelector(`.papa-btn[data-papa="${pick.papaId}"]`);
  if (btn) {
    btn.classList.add('auto-suggested');
    setTimeout(() => btn.classList.remove('auto-suggested'), 1200);
  }
}

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
        const key = splitKey(info.lastSplit, info.lastTutor);
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
  document.getElementById('splitSelect').addEventListener('change', (e) => { selectedSplit = e.target.value; refreshSplitExplain(); beep(900); });
  const editSplitEl = document.getElementById('editSplit');
  if (editSplitEl) editSplitEl.addEventListener('change', refreshSplitExplain);

  document.getElementById('feedBtn').addEventListener('click', feed);
  const conceptoEl = document.getElementById('concepto');
  conceptoEl.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('amount').focus(); });
  // Auto-suggest papa as user types (debounced via input rate-limit)
  let suggestTimer = null;
  conceptoEl.addEventListener('input', e => {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(() => autoSuggestPapa(e.target.value), 220);
  });
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

  // Music live controls
  const musicVolEl = document.getElementById('musicVolume');
  if (musicVolEl) musicVolEl.addEventListener('input', (e) => {
    document.getElementById('musicVolLabel').textContent = e.target.value;
    setMusicVolume(parseInt(e.target.value, 10) / 100);
  });
  const musicChkEl = document.getElementById('musicPlaying');
  if (musicChkEl) musicChkEl.addEventListener('change', (e) => {
    state.settings.musicPlaying = e.target.checked;
    if (e.target.checked) resumeBackgroundMusic();
    else pauseBackgroundMusic();
  });
  const musicManualBtn = document.getElementById('musicManualStart');
  if (musicManualBtn) musicManualBtn.addEventListener('click', () => {
    state.settings.musicPlaying = true;
    const chk = document.getElementById('musicPlaying');
    if (chk) chk.checked = true;
    bgMusicStarted = false;
    startBackgroundMusic();
  });

  // Templo del Ahorro
  document.getElementById('addGoalBtn').addEventListener('click', () => openGoalModal(null));
  document.getElementById('goalClose').addEventListener('click', closeGoalModal);
  document.getElementById('goalCancel').addEventListener('click', closeGoalModal);
  document.getElementById('goalSave').addEventListener('click', saveGoal);
  document.getElementById('goalDelete').addEventListener('click', deleteGoal);
  document.getElementById('goalModal').addEventListener('click', (e) => { if (e.target.id === 'goalModal') closeGoalModal(); });

  // Savings (within goals)
  document.getElementById('savingsClose').addEventListener('click', closeSavingsModal);
  document.getElementById('savingsCancel').addEventListener('click', closeSavingsModal);
  document.getElementById('savingsSave').addEventListener('click', saveSavings);
  document.getElementById('savingsModal').addEventListener('click', (e) => { if (e.target.id === 'savingsModal') closeSavingsModal(); });
  document.querySelectorAll('#savingsTutorSelector .tutor-btn').forEach(b => b.addEventListener('click', () => {
    savingsTutor = b.dataset.savingsTutor;
    document.querySelectorAll('#savingsTutorSelector .tutor-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  }));
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('wipeAllBtn').addEventListener('click', wipeAll);
  document.getElementById('resetMonthBtn').addEventListener('click', resetMonthBtn);

  // Auto-backup
  const backupPickBtn = document.getElementById('backupPickBtn');
  if (backupPickBtn) backupPickBtn.addEventListener('click', pickBackupFolder);
  const backupForgetBtn = document.getElementById('backupForgetBtn');
  if (backupForgetBtn) backupForgetBtn.addEventListener('click', forgetBackupFolder);

  // Data-loss modal
  const dlRestore = document.getElementById('dataLossRestoreBtn');
  if (dlRestore) dlRestore.addEventListener('click', restoreFromLocalBackup);
  const dlImport = document.getElementById('dataLossImportBtn');
  if (dlImport) dlImport.addEventListener('click', () => {
    document.getElementById('dataLossModal').hidden = true;
    triggerImport();
  });
  const dlDismiss = document.getElementById('dataLossDismissBtn');
  if (dlDismiss) dlDismiss.addEventListener('click', () => {
    if (confirm(currentLang() === 'en' ? 'Really dismiss? Data will stay empty.' : '¿Seguro ignorar? Los datos quedarán vacíos.')) {
      document.getElementById('dataLossModal').hidden = true;
    }
  });
  document.getElementById('sacrificeClose').addEventListener('click', closeSacrificeModal);
  document.getElementById('sacrificeCancel').addEventListener('click', closeSacrificeModal);
  document.getElementById('sacrificeConfirm').addEventListener('click', confirmSacrifice);
  document.getElementById('sacrificeInput').addEventListener('input', onSacrificeInput);
  document.getElementById('sacrificeInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !document.getElementById('sacrificeConfirm').disabled) confirmSacrifice();
  });
  document.getElementById('sacrificeModal').addEventListener('click', (e) => {
    if (e.target.id === 'sacrificeModal') closeSacrificeModal();
  });

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
    refreshSplitExplain();
  }));

  // Papa modal
  document.getElementById('addPapaBtn').addEventListener('click', () => openPapaModal(null));
  document.getElementById('papaClose').addEventListener('click', closePapaModal);
  document.getElementById('papaCancel').addEventListener('click', closePapaModal);
  document.getElementById('papaSave').addEventListener('click', savePapa);
  document.getElementById('papaDelete').addEventListener('click', deletePapa);
  document.getElementById('papaModal').addEventListener('click', (e) => { if (e.target.id === 'papaModal') closePapaModal(); });

  // Settlement (entry point now lives in History panel; modal wiring stays)
  document.getElementById('settleClose').addEventListener('click', closeSettleModal);
  document.getElementById('settleCancel').addEventListener('click', closeSettleModal);
  document.getElementById('settleSave').addEventListener('click', saveSettlement);
  document.getElementById('settleModal').addEventListener('click', (e) => { if (e.target.id === 'settleModal') closeSettleModal(); });
  document.querySelectorAll('#settleDir .tutor-btn').forEach(b => b.addEventListener('click', () => {
    settleDir = b.dataset.settle;
    document.querySelectorAll('#settleDir .tutor-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  }));

  // History panel inline settle (works for any month including past)
  const histSettleBtn = document.getElementById('historySettleBtn');
  if (histSettleBtn) histSettleBtn.addEventListener('click', () => openSettleModalForMonth(worldMonthKey));

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
    startBackgroundMusic();
    setTimeout(() => speakSet('idle'), 600);
    setTimeout(() => maybeShowMonthEndRitual(), 900);
    setTimeout(() => maybeShowInstallPrompt(), 1800);
  });

  // Month-end ritual dismiss (also closes on click anywhere on the overlay)
  const meDismiss = document.getElementById('monthEndDismiss');
  if (meDismiss) meDismiss.addEventListener('click', closeMonthEndRitual);
  const meOverlay = document.getElementById('monthEndRitual');
  if (meOverlay) meOverlay.addEventListener('click', (e) => {
    // Don't close when clicking on the inner content (let buttons handle it)
    if (e.target === meOverlay) closeMonthEndRitual();
  });

  window.addEventListener('resize', () => {
    if (currentView === 'world') renderWorld();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('sacrificeModal').hidden) closeSacrificeModal();
      else if (!document.getElementById('editModal').hidden) closeEditModal();
      else if (!document.getElementById('papaModal').hidden) closePapaModal();
      else if (!document.getElementById('settleModal').hidden) closeSettleModal();
      else if (!document.getElementById('goalModal').hidden) closeGoalModal();
      else if (!document.getElementById('savingsModal').hidden) closeSavingsModal();
      else if (document.getElementById('historyPanel').classList.contains('show')) toggleHistory();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopWorldTick();
    else if (currentView === 'world') startWorldTick();
  });
}

/* ============================================
   22. CLOUD SYNC — REMOVED in v2.0
   ─────────────────────────────────────────────
   All cloud/Supabase code was removed. The app is purely local now.
   These no-op stubs preserve legacy call sites so nothing throws.
   ============================================ */
function cloudPushExpense() {}
function cloudDeleteExpense() {}
function cloudDeleteExpensesByIds() {}
function cloudPushAllPapas() {}
function cloudDeletePapa() {}
function cloudPushSettings() {}
function cloudPushGoal() {}
function cloudDeleteGoal() {}
function cloudPushAllGoals() {}
function connectCloud() { return Promise.resolve(false); }
function disconnectCloud() {}
function updateCloudUI() {}
function flashCloud() {}
function bindCloudEvents() {}
function consumeUrlParams() {
  // Legacy cloud invitation params still get stripped from URL for cleanliness.
  const params = new URLSearchParams(window.location.search);
  if (params.has('sb_url') || params.has('sb_key') || params.has('h')) {
    window.history.replaceState({}, '', window.location.pathname);
  }
  return false;
}
/* ============================================
   25. INIT
   ============================================ */
function init() {
  bindEvents();
  // Strip any legacy ?sb_url=... invitation params from the URL bar
  consumeUrlParams();

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
  initBackgroundMusic();
  setMusicStatus('idle');
  initAutoBackup();
  checkDataLoss();
}
init();

setInterval(() => { if (!document.hidden) ambientTick(); }, 2200);
setInterval(maybePlayMelody, 4500);
setInterval(() => { if (currentView === 'colony' && audio && Math.random() < 0.12 && !document.hidden) chitter(); }, 9000);
setInterval(updateSaveLabel, 10000);
