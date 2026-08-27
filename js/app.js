// WODshed UI controller — plain-JS, full-screen re-render per state change.
// Timer onTick callbacks always re-query the DOM by id, so a re-render never
// breaks an in-flight timer.

const ICON = {
  back: '<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="10,3 5,8 10,13"/></svg>',
  play: '<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><polygon points="3,2 14,8 3,14"/></svg>',
  pause: '<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>',
  check: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="3,8 6,11 13,4"/></svg>',
  chev: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="6,3 11,8 6,13"/></svg>',
  home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/></svg>',
  history: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/></svg>',
  gear: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V19.7a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H4.3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5a1.7 1.7 0 0 0 1-1.55V4.3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.5a1.7 1.7 0 0 0 1.55 1H19.7a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>',
  sound: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 8a5 5 0 0 1 0 8"/></svg>',
  muted: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9l5 6M21 9l-5 6"/></svg>',
  reroll: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11A8 8 0 0 0 6.4 6.3M4 13a8 8 0 0 0 13.6 4.6"/><polyline points="4,4 4,9 9,9"/><polyline points="20,20 20,15 15,15"/></svg>',
};

// One icon per equipment id, all sharing the same stroke weight/viewBox so the
// picker grid reads as one consistent set rather than mismatched glyphs.
function eqIcon(inner) {
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
const EQUIP_ICON = {
  barbell: eqIcon('<line x1="1" y1="12" x2="23" y2="12"/><rect x="2" y="8" width="3" height="8" rx="1"/><rect x="19" y="8" width="3" height="8" rx="1"/>'),
  rack: eqIcon('<line x1="5" y1="2" x2="5" y2="22"/><line x1="19" y1="2" x2="19" y2="22"/><line x1="5" y1="9" x2="19" y2="9"/>'),
  bench: eqIcon('<rect x="3" y="12" width="18" height="3" rx="1"/><line x1="6" y1="15" x2="6" y2="20"/><line x1="18" y1="15" x2="18" y2="20"/>'),
  kettlebell: eqIcon('<path d="M9 8.5a3 3 0 0 1 6 0V10H9z"/><circle cx="12" cy="15" r="6"/>'),
  dumbbell: eqIcon('<line x1="8" y1="12" x2="16" y2="12"/><rect x="2" y="9" width="4" height="6" rx="1"/><rect x="18" y="9" width="4" height="6" rx="1"/>'),
  pullupbar: eqIcon('<line x1="4" y1="6" x2="20" y2="6"/><line x1="5" y1="6" x2="5" y2="2"/><line x1="19" y1="6" x2="19" y2="2"/>'),
  rings: eqIcon('<line x1="9" y1="4" x2="9" y2="11"/><line x1="15" y1="4" x2="15" y2="11"/><circle cx="9" cy="15" r="4"/><circle cx="15" cy="15" r="4"/>'),
  parallettes: eqIcon('<line x1="3" y1="15" x2="9" y2="15"/><line x1="5" y1="15" x2="5" y2="20"/><line x1="7" y1="15" x2="7" y2="20"/><line x1="15" y1="15" x2="21" y2="15"/><line x1="17" y1="15" x2="17" y2="20"/><line x1="19" y1="15" x2="19" y2="20"/>'),
  rope: eqIcon('<polyline points="9,2 15,6 9,10 15,14 9,18 15,22"/>'),
  rower: eqIcon('<line x1="2" y1="18" x2="22" y2="18"/><rect x="8" y="13" width="5" height="4" rx="1"/><circle cx="19" cy="18" r="1.8"/>'),
  bike: eqIcon('<circle cx="6" cy="17" r="3.2"/><circle cx="18" cy="17" r="3.2"/><path d="M6 17 10 8h5l3 9M10 8l3 4h5"/>'),
  skierg: eqIcon('<line x1="12" y1="2" x2="12" y2="22"/><line x1="12" y1="8" x2="5" y2="5"/><line x1="12" y1="13" x2="19" y2="17"/>'),
  treadmill: eqIcon('<rect x="2" y="15" width="14" height="4" rx="1"/><line x1="16" y1="17" x2="21" y2="6"/><circle cx="21" cy="5" r="1.4"/>'),
  plyobox: eqIcon('<path d="M4 20V9l4-4h8l4 4v11z"/><path d="M4 9h16"/>'),
  medball: eqIcon('<circle cx="12" cy="12" r="8.5"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="12" y1="4" x2="12" y2="20"/>'),
  slamball: eqIcon('<circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.18"/><circle cx="12" cy="12" r="8.5"/>'),
  ghd: eqIcon('<path d="M3 19h6l3-6 3 6h6"/><line x1="12" y1="13" x2="12" y2="5"/>'),
  abmat: eqIcon('<path d="M3 18a9 5 0 0 1 18 0"/>'),
  sandbag: eqIcon('<path d="M8 5h8l3 4.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9.5z"/><line x1="9" y1="5" x2="9" y2="2"/><line x1="15" y1="5" x2="15" y2="2"/>'),
  farmer: eqIcon('<line x1="7" y1="3" x2="7" y2="21"/><line x1="17" y1="3" x2="17" y2="21"/><rect x="5" y="9" width="4" height="5" rx="1"/><rect x="15" y="9" width="4" height="5" rx="1"/>'),
  sled: eqIcon('<path d="M2 18h7l11-6v6z"/><line x1="13" y1="12" x2="21" y2="3"/>'),
  jumprope: eqIcon('<circle cx="5" cy="5" r="2.6"/><circle cx="19" cy="5" r="2.6"/><path d="M5 7.5C5 16 19 16 19 7.5"/>'),
  bands: eqIcon('<ellipse cx="12" cy="12" rx="4.5" ry="9"/>'),
  pvc: eqIcon('<line x1="3" y1="12" x2="21" y2="12"/><circle cx="3" cy="12" r="1.8"/><circle cx="21" cy="12" r="1.8"/>'),
  yogamat: eqIcon('<rect x="2" y="9" width="15" height="6" rx="2"/><circle cx="19" cy="12" r="3"/>'),
};

// Canonical copy, kept in one place so labels stay identical everywhere they
// appear (section rows, exec header, rating sheet, history, summary).
const SECTION_ORDER = ['warmup', 'skill', 'wod', 'core'];
const SECTION_TITLES = { warmup: 'Warm-Up', skill: 'Skill', wod: 'WOD', core: 'Core' };
const RATING_LABEL = { easy: 'Easy', right: 'Just Right', hard: 'Too Hard' };
const RATING_TAG_CLASS = { easy: 'tag-good', right: 'tag-neutral', hard: 'tag-warn' };

const UI = {
  screen: 'boot', tab: 'today', execSection: null, timer: null, timerKind: null, dialog: null, leadIn: null,
  ratingFor: null,
  warmupChecks: [], skillSetIndex: 0, skillWeight: 0, skillResting: false, skillRoundIndex: 1,
  bRoundIndex: 1, wodElapsed: 0, wodStepIndex: 0, wodRftRound: 0, wodAmrapRounds: 0, wodAmrapReps: 0,
  wodPhase: null, wodIntervalIndex: 1, wodIntervalScores: [], wodRung: 1, wodLastCompletedRung: 0,
  wodRepeatIndex: 1, wodRepeatTimes: [], wodBuyInMs: null,
  coreRound: 1, corePhase: 'work', coreChecks: [], pendingResult: null, running: false,
};

function app() { return document.getElementById('app'); }
function esc(s) { return String(s); }
function byId(id) { return document.getElementById(id); }

// Screen swaps always paint synchronously — the async View Transitions API was tried
// here for a cross-fade, but its callback only fires once the document is visible and
// composited, so backgrounding mid-workout (locking the phone, switching apps) could
// stall a pending screen change until the app was reopened. A timer app can't risk that;
// the CSS fade-in on `.screen` gives most of the same polish with none of the hazard.
function render() {
  const root = app();
  let html = '';
  if (UI.screen === 'onboarding') html = renderOnboarding();
  else if (UI.screen === 'today') html = renderShell(renderToday(), 'today');
  else if (UI.screen === 'exec') html = renderExecScreen();
  else if (UI.screen === 'summary') html = renderSummary();
  else if (UI.screen === 'history') html = renderShell(renderHistory(), 'history');
  else if (UI.screen === 'equipment') html = renderShell(renderEquipmentTab(), 'equipment');

  if (UI.ratingFor) html += renderRatingSheet();
  if (UI.dialog) html += renderDialog();
  root.innerHTML = html;
}

function renderShell(innerHtml, activeTab) {
  return `<div class="screen">${innerHtml}</div>${renderBottomNav(activeTab)}`;
}

function renderBottomNav(active) {
  const item = (key, icon, label) => `<button class="nav-item ${active === key ? 'active' : ''}" onclick="App.goTab('${key}')">${icon}<span>${label}</span></button>`;
  return `<nav class="bottomnav">${item('today', ICON.home, 'Today')}${item('history', ICON.history, 'History')}${item('equipment', ICON.gear, 'Equipment')}</nav>`;
}

function infoBtn(key) { return `<button class="info-btn" onclick="App.showInfo('${key}')">i</button>`; }

function renderDialog() {
  const g = GLOSSARY[UI.dialog];
  const title = UI.dialog.charAt(0) + UI.dialog.slice(1).toLowerCase();
  return `<div class="dialog-backdrop" onclick="App.closeDialog()">
    <div class="dialog" onclick="event.stopPropagation()">
      <div class="dialog-title">${title}</div>
      <div class="dialog-body">${g || ''}</div>
      <button class="btn btn-primary btn-block" onclick="App.closeDialog()">Got it</button>
    </div>
  </div>`;
}

// ─── Session rail — the throughline shown on Today (full, tappable) and, in
// a compact dot-only form, pinned to every exec screen so you always know
// where you are in the whole session without leaving what you're doing ────

function railHtml(plan, opts) {
  opts = opts || {};
  const nextIncomplete = SECTION_ORDER.find(s => !plan.completed[s]);
  const nodes = SECTION_ORDER.map((s, i) => {
    const done = plan.completed[s];
    const isCurrent = !done && s === (opts.current || nextIncomplete);
    const cls = ['rail-node'];
    if (done) cls.push('done');
    if (isCurrent) cls.push('current');
    const clickable = (!done && !opts.compact) ? ` onclick="App.enterExec('${s}')"` : '';
    const dot = done ? ICON.check : (i + 1);
    return `<div class="${cls.join(' ')}"${clickable}>
      <div class="rail-dot">${dot}</div>
      ${opts.compact ? '' : `<div class="rail-label">${SECTION_TITLES[s]}</div>`}
    </div>`;
  }).join('');
  return `<div class="rail ${opts.compact ? 'rail-compact' : ''}"><div class="rail-line"></div>${nodes}</div>`;
}

// ─── Onboarding / Equipment picker ─────────────────────────────────────────

function equipmentPickerHtml() {
  const equip = Store.state.equipment;
  const total = ALL_EQUIPMENT.length;
  const pct = computeAccessPercent(equip);

  const savedChips = Store.state.customPresets.map(p => {
    const isActive = sameSet(equip, p.items);
    return `<div class="preset-chip ${isActive ? 'active' : ''}" onclick="App.tapCustomPreset('${p.id}')">${p.label}</div>`;
  }).join('');
  const presetChips = savedChips + `<div class="preset-chip preset-chip-new" onclick="App.saveCurrentAsPreset()">+ New Preset</div>`;

  const groups = EQUIPMENT_GROUPS.map(g => {
    const tiles = g.items.map(it => {
      const on = equip.includes(it.id);
      return `<div class="equip-tile ${on ? 'on' : ''}" onclick="App.toggleEquip('${it.id}')">
        <div class="equip-tile-icon">${EQUIP_ICON[it.id] || ''}</div>
        <div class="equip-tile-label">${it.label}</div>
      </div>`;
    }).join('');
    return `<div class="equip-group"><div class="equip-group-label">${g.label}</div><div class="equip-grid">${tiles}</div></div>`;
  }).join('');

  return `<div class="preset-row">${presetChips}</div>
  <div class="equip-summary">
    <span>${equip.length} of ${total} selected</span>
    <div class="equip-summary-actions">
      <button class="btn-link" onclick="App.setAllEquip(true)">Select all</button>
      <span class="equip-summary-dot">·</span>
      <button class="btn-link" onclick="App.setAllEquip(false)">None</button>
    </div>
  </div>
  ${groups}
  <div class="equip-access-bar">You've unlocked <strong>${pct}%</strong> of all movements</div>`;
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort(), sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

// Rough, honest metric — % of the movement library your current equipment unlocks.
function computeAccessPercent(equip) {
  if (!EXERCISES.length) return 0;
  const eligible = EXERCISES.filter(e => hasEquip(equip, e.equip)).length;
  return Math.round((eligible / EXERCISES.length) * 100);
}

// ─── Plate inventory + bar-loading hint ────────────────────────────────────

function platePickerHtml() {
  const inv = Store.state.plateInventory;
  const rows = PLATE_SIZES.map(size => {
    const ironCount = inv.iron[size] || 0;
    const bumperCount = inv.bumper[size] || 0;
    return `<div class="plate-row">
      <div class="plate-size">${size}<span class="plate-unit">lb</span></div>
      <div class="plate-col">
        <div class="plate-col-label">Iron</div>
        <div class="plate-stepper">
          <button class="stepper-btn" onclick="App.adjustPlate('iron', ${size}, -1)">−</button>
          <div class="stepper-val">${ironCount}</div>
          <button class="stepper-btn" onclick="App.adjustPlate('iron', ${size}, 1)">+</button>
        </div>
      </div>
      <div class="plate-col">
        <div class="plate-col-label">Rubber</div>
        <div class="plate-stepper">
          <button class="stepper-btn" onclick="App.adjustPlate('bumper', ${size}, -1)">−</button>
          <div class="stepper-val">${bumperCount}</div>
          <button class="stepper-btn" onclick="App.adjustPlate('bumper', ${size}, 1)">+</button>
        </div>
      </div>
    </div>`;
  }).join('');
  return `<div class="plate-list">${rows}</div>`;
}

// Total plates owned at a size (iron + rubber pooled — either loads the same weight).
function platesOwnedAtSize(size) {
  const inv = Store.state.plateInventory;
  return (inv.iron[size] || 0) + (inv.bumper[size] || 0);
}

function plateLoadout(targetWeight) {
  const perSide = Math.round(((targetWeight - STANDARD_BAR_WEIGHT) / 2) * 10) / 10;
  if (perSide <= 0) return null;
  if (!PLATE_SIZES.some(s => platesOwnedAtSize(s) > 0)) return null;

  let remaining = perSide;
  const picks = [];
  for (const size of PLATE_SIZES) {
    const usablePerSide = Math.floor(platesOwnedAtSize(size) / 2);
    let take = 0;
    while (take < usablePerSide && remaining >= size - 0.05) { take++; remaining -= size; }
    if (take > 0) picks.push(`${take}×${size}`);
  }
  remaining = Math.round(remaining * 10) / 10;
  if (remaining > 0.05) {
    return picks.length
      ? `${picks.join(' + ')} per side — short ${remaining} lb/side`
      : `Not enough plates for ${perSide} lb/side`;
  }
  return picks.length ? `${picks.join(' + ')} per side` : 'Bar only';
}

function plateLoadoutLine(targetWeight) {
  if (!Store.state.equipment.includes('barbell')) return '';
  const line = plateLoadout(targetWeight);
  return line ? `<div class="plate-loadout">${line}</div>` : '';
}

function renderOnboarding() {
  return `<div class="onboard-wrap">
    <div class="onboard-header">
      <div class="onboard-kicker">Welcome</div>
      <h1>Set up your gym</h1>
      <p class="section-sub" style="padding:0;margin-top:8px">We've started with a typical garage setup — rack, rings, kettlebell, barbell, jump rope, and mobility tools. Turn off anything you don't have, add more, or go bodyweight-only. You can change this anytime from Equipment.</p>
    </div>
    <div class="scroll-content">${equipmentPickerHtml()}</div>
    <div class="onboard-footer">
      <button class="btn btn-primary btn-block" onclick="App.finishOnboarding()">Build My First Session</button>
    </div>
  </div>`;
}

function renderEquipmentTab() {
  const hasBarbell = Store.state.equipment.includes('barbell');
  const plateSection = hasBarbell ? `<div class="equip-group">
    <div class="equip-group-label">Plate Inventory</div>
    <div class="section-sub" style="padding:0 0 var(--space-2)">Total plates you own, both sides combined — used to suggest a bar loading during Skill work.</div>
    ${platePickerHtml()}
  </div>` : '';
  return `<div class="section-heading">Equipment</div>
  <div class="section-sub">Turn off anything you don't have. Changes apply to your next session.</div>
  ${equipmentPickerHtml()}
  ${plateSection}
  <div class="settings-block">
    <div class="settings-row" onclick="App.toggleSound()">
      <span>${Store.state.soundOn ? ICON.sound : ICON.muted}</span>
      <span class="settings-row-label">Timer sounds &amp; vibration</span>
      <div class="switch ${Store.state.soundOn ? 'on' : ''}"></div>
    </div>
  </div>
  <div style="padding:var(--space-4)">
    <button class="btn btn-danger btn-block" onclick="App.confirmReset()">Reset All Data</button>
  </div>`;
}

// ─── Section copy + rough duration estimate ───────────────────────────────

// The specific workout TYPE (AMRAP, EMOM, a lift name, Tabata...) is the
// headline; the bucket it lives in (Skill/WOD/Core) is just a small kicker
// above it — that's what you're actually about to do, so it should read first.
function sectionInfo(section, plan) {
  if (section === 'warmup') {
    return { kicker: null, title: 'Warm-Up', meta: `2 Rounds · ${plan.warmup.moves.map(m => exerciseById(m).name).join(', ')}` };
  }
  if (section === 'skill') {
    const s = plan.skill;
    const title = s.shape === 'A' ? (s.liftName || 'Skill') : s.shape === 'B' ? 'EMOM' : 'Superset';
    return { kicker: 'SKILL', title, meta: skillMetaLine(s) };
  }
  if (section === 'wod') {
    const title = plan.isBenchmark ? plan.benchmarkName : plan.wod.label;
    return { kicker: plan.isBenchmark ? 'BENCHMARK' : 'WOD', title, meta: `${plan.wod.badge} · ${plan.wod.movements}` };
  }
  const shape = plan.core.shape;
  const title = shape === 'tabata' ? 'Tabata' : shape === 'holds' ? 'Holds' : 'Straight Rounds';
  return { kicker: 'CORE', title, meta: coreMetaLine(plan.core) };
}

function skillMetaLine(skill) {
  if (skill.shape === 'A') return `${skill.scheme.length} Sets · ${skill.scheme.join('-')}`;
  if (skill.shape === 'B') return `EMOM ${skill.rounds}' · ${skill.oddName} / ${skill.evenName}`;
  return `${skill.rounds} Rounds · ${skill.moveNames.join(', ')}`;
}
function coreMetaLine(core) {
  if (core.shape === 'tabata') return `Tabata · ${core.rounds} Rounds · ${core.moves.map(m => exerciseById(m).name).join(' / ')}`;
  if (core.shape === 'holds') return `${core.rounds} Rounds · ${core.moves.map(m => exerciseById(m).name).join(' / ')} Hold`;
  return `${core.rounds} Rounds · ${core.moves.map(m => exerciseById(m).name).join(', ')}`;
}

function estimateSectionMinutes(section, plan) {
  if (section === 'warmup') return 6;
  if (section === 'skill') {
    const s = plan.skill;
    if (s.shape === 'A') return Math.round(s.scheme.length * ((s.rest || 90) + 25) / 60);
    if (s.shape === 'B') return Math.round(s.intervalSec * s.rounds / 60);
    return Math.round(s.rounds * ((s.rest || 60) + 40) / 60);
  }
  if (section === 'wod') {
    const w = plan.wod;
    if (w.capSec) return Math.round(w.capSec / 60);
    if (w.format === 'rft') return Math.round(w.rounds * 2.2);
    return 12;
  }
  // core
  const c = plan.core;
  if (c.shape === 'tabata') return Math.round(c.rounds * (c.workSec + c.restSec) / 60);
  if (c.shape === 'holds') return Math.round(c.rounds * (c.holdSec + c.restSec) / 60);
  return 5;
}
function estimateSessionMinutes(plan) {
  return SECTION_ORDER.reduce((sum, s) => sum + estimateSectionMinutes(s, plan), 0);
}

// ─── Today screen ───────────────────────────────────────────────────────────

function renderToday() {
  const plan = Store.state.today;
  const doneCount = SECTION_ORDER.filter(s => plan.completed[s]).length;
  const startLabel = doneCount === 0 ? 'Start Session' : (doneCount === 4 ? 'Session Complete' : 'Resume Session');
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const mins = estimateSessionMinutes(plan);

  let banner = '';
  if (plan.benchmarkOffer && !plan.isBenchmark && !plan.completed.wod) {
    const b = BENCHMARKS.find(x => x.id === plan.benchmarkOffer);
    banner = `<div class="banner">
      <div class="banner-title">Ready for a milestone? ${infoBtn('BENCHMARK')}</div>
      <div class="banner-sub">Swap today's WOD for ${b.name} — ${b.line}</div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-secondary" style="flex:1" onclick="App.dismissBenchmark()">Not today</button>
        <button class="btn btn-primary" style="flex:1" onclick="App.acceptBenchmark()">Test ${b.name}</button>
      </div>
    </div>`;
  }

  const cards = SECTION_ORDER.map(s => sectionCardHtml(s, plan)).join('');

  return `
    <div class="topbar">
      <div>
        <div class="date-label">${dateStr} · ~${mins} MIN</div>
        <h1>Today</h1>
      </div>
      <span class="tag tag-focus-${plan.focus}">${FOCUS_LABELS[plan.focus].toUpperCase()}</span>
    </div>
    <div style="padding:0 var(--space-4) var(--space-4)">
      <button class="btn btn-primary btn-block" ${doneCount === 4 ? 'disabled' : ''} onclick="App.startOrResume()">
        ${doneCount < 4 ? ICON.play : ICON.check} ${startLabel}
      </button>
    </div>
    ${banner}
    <div class="card-list">${cards}</div>
    <div style="height:24px"></div>
  `;
}

function sectionCardHtml(section, plan) {
  const done = plan.completed[section];
  const rating = plan.ratings[section];
  const { kicker, title, meta } = sectionInfo(section, plan);
  const icon = done ? ICON.check : ICON.play;
  const iconCls = done ? 'section-icon done' : 'section-icon';
  const trailing = done
    ? `<span class="tag ${RATING_TAG_CLASS[rating]}">${RATING_LABEL[rating]}</span>`
    : `<div class="section-actions">
        <button class="icon-btn-sm" onclick="event.stopPropagation(); App.regenerateSection('${section}')" title="Shuffle a new one">${ICON.reroll}</button>
        <div class="chev">${ICON.chev}</div>
      </div>`;
  return `<div class="section-card ${done ? 'disabled' : ''}" onclick="${done ? '' : `App.enterExec('${section}')`}">
    <div class="${iconCls}">${icon}</div>
    <div class="section-body">
      ${kicker ? `<div class="section-kicker">${kicker}</div>` : ''}
      <div class="section-title">${title}</div>
      <div class="section-meta">${meta}</div>
    </div>
    ${trailing}
  </div>`;
}

// ─── Execution screens ───────────────────────────────────────────────────

function execHeader(plan, kicker, title, infoKey) {
  const kickerHtml = kicker ? `<div class="kicker">${kicker}</div>` : '';
  return `<div class="exec-header">
    <button class="btn btn-icon btn-ghost" onclick="App.exitExec()">${ICON.back}</button>
    <div class="exec-header-center">
      ${kickerHtml}
      <div class="exec-type">${title}${infoKey ? infoBtn(infoKey) : ''}</div>
    </div>
    <div style="width:44px"></div>
  </div>
  ${railHtml(plan, { compact: true, current: UI.execSection })}`;
}

function playPauseBtn(big) {
  const size = big ? 'width:64px;height:64px' : 'width:52px;height:52px';
  return `<button class="btn btn-primary btn-icon" style="${size}" onclick="App.toggleTimer()">${UI.running ? ICON.pause : ICON.play}</button>`;
}

function leadInHtml() {
  const n = UI.leadIn;
  const label = n === 0 ? 'GO' : String(n);
  return `<div class="exec-body lead-in">
    <div class="lead-in-num" key="${n}">${label}</div>
    <div class="time-label">Get set</div>
  </div>`;
}

function renderExecScreen() {
  const plan = Store.state.today;
  const section = UI.execSection;
  const info = sectionInfo(section, plan);
  const kicker = info.kicker;
  const title = info.title.toUpperCase();

  if (UI.leadIn !== null) return `<div class="screen no-nav">${execHeader(plan, kicker, title)}${leadInHtml()}</div>`;

  if (section === 'warmup') return `<div class="screen no-nav">${execHeader(plan, kicker, title)}${renderWarmupBody(plan.warmup)}</div>`;
  if (section === 'skill') return `<div class="screen no-nav">${execHeader(plan, kicker, title)}${renderSkillBody(plan.skill)}</div>`;
  if (section === 'wod') {
    const fmtKey = plan.wod.format.toUpperCase() === 'FORTIME' ? 'FORTIME' : plan.wod.format.toUpperCase();
    return `<div class="screen no-nav">${execHeader(plan, kicker, title, fmtKey)}${renderWodBody(plan.wod, plan)}</div>`;
  }
  if (section === 'core') return `<div class="screen no-nav">${execHeader(plan, kicker, title)}${renderCoreBody(plan.core)}</div>`;
  return '';
}

function renderWarmupBody(warmup) {
  const items = UI.warmupChecks.map((c, i) => {
    const moveId = warmup.moves[i % warmup.moves.length];
    const round = Math.floor(i / warmup.moves.length) + 1;
    return `<div class="check-item" onclick="App.toggleWarmupCheck(${i})">
      <div class="check-box ${c ? 'checked' : ''}">${c ? ICON.check : ''}</div>
      <div class="check-label ${c ? 'checked' : ''}">${exerciseById(moveId).name}</div>
      <div class="check-round">R${round}</div>
    </div>`;
  }).join('');

  return `<div class="exec-body">
    <div class="big-time" id="warmupTime">${fmtClock(UI.timer ? UI.timer.elapsedMs() : 0)}</div>
    ${playPauseBtn(true)}
    <div class="checklist">${items}</div>
    <button class="btn btn-primary btn-block" style="margin-top:auto" onclick="App.finishWarmup()">Finish Warm-Up</button>
  </div>`;
}

function renderSkillBody(skill) {
  if (skill.shape === 'A') {
    const reps = skill.scheme[UI.skillSetIndex];
    const isLast = UI.skillSetIndex + 1 >= skill.scheme.length;
    const rest = UI.skillResting ? `<div class="card rest-card">
        <div class="time-label">Rest</div>
        <div class="mid-time" id="restTime">${fmtClock(UI.timer ? UI.timer.remainingMs() : 0)}</div>
        <button class="btn btn-ghost" onclick="App.skipRest()">Skip Rest</button>
      </div>` : '';
    return `<div class="exec-body">
      <div class="time-label">${skill.liftName}</div>
      <div class="section-meta">SET ${UI.skillSetIndex + 1} / ${skill.scheme.length}</div>
      <div class="big-time">${reps}<span class="big-time-unit"> reps</span></div>
      <div class="weight-row">
        <button class="stepper-btn" onclick="App.adjustWeight(-1)">−</button>
        <div class="weight-value">${UI.skillWeight}<span class="unit"> lb</span></div>
        <button class="stepper-btn" onclick="App.adjustWeight(1)">+</button>
      </div>
      ${plateLoadoutLine(UI.skillWeight)}
      ${rest}
      <button class="btn btn-primary btn-block" style="margin-top:auto" ${UI.skillResting ? 'disabled' : ''} onclick="App.completeSet()">${isLast ? 'Finish Skill' : 'Complete Set'}</button>
    </div>`;
  }

  if (skill.shape === 'B') {
    const isOdd = UI.bRoundIndex % 2 === 1;
    const moveName = isOdd ? skill.oddName : skill.evenName;
    const desc = skill.secHold ? `${skill.secHold}s Hold` : `${skill.reps} Reps`;
    return `<div class="exec-body">
      <div class="time-label">MIN ${UI.bRoundIndex} / ${skill.rounds}</div>
      <div class="section-meta">${isOdd ? 'ODD' : 'EVEN'}: ${desc} ${moveName}</div>
      <div class="big-time" id="bTime">${fmtClock(UI.timer ? UI.timer.remainingMs() : 0)}</div>
      ${playPauseBtn(true)}
      <button class="btn btn-ghost" style="margin-top:auto" onclick="App.skillSkipRound()">Skip to Next Minute</button>
    </div>`;
  }

  // shape C
  const moves = skill.moveNames.map(n => `<div class="move-line">${skill.reps} ${n}</div>`).join('');
  const rest = UI.skillResting ? `<div class="card rest-card">
      <div class="time-label">Rest</div>
      <div class="mid-time" id="restTime">${fmtClock(UI.timer ? UI.timer.remainingMs() : 0)}</div>
      <button class="btn btn-ghost" onclick="App.skipRest()">Skip Rest</button>
    </div>` : '';
  const isLast = UI.skillRoundIndex >= skill.rounds;
  return `<div class="exec-body">
    <div class="section-meta">ROUND ${UI.skillRoundIndex} / ${skill.rounds}</div>
    <div class="move-list">${moves}</div>
    ${rest}
    <button class="btn btn-primary btn-block" style="margin-top:auto" ${UI.skillResting ? 'disabled' : ''} onclick="App.completeSkillRound()">${isLast ? 'Finish Skill' : 'Complete Round'}</button>
  </div>`;
}

function capTagHtml(elapsedMs, capSec) {
  if (!capSec) return '';
  return elapsedMs / 1000 >= capSec ? `<span class="tag tag-warn">TIME CAP</span>` : '';
}

function amrapStepperRow() {
  return `<div class="stepper-row">
    <div class="stepper">
      <div class="stepper-label">Rounds</div>
      <button class="stepper-val" style="border:none;font-size:20px" onclick="App.amrapAddRound()">${UI.wodAmrapRounds}</button>
    </div>
    <div class="stepper">
      <div class="stepper-label">+ Reps</div>
      <div class="stepper-controls">
        <button class="stepper-btn" onclick="App.amrapAddRep(-1)">−</button>
        <div class="stepper-val">${UI.wodAmrapReps}</div>
        <button class="stepper-btn" onclick="App.amrapAddRep(1)">+</button>
      </div>
    </div>
  </div>`;
}

function renderWodBody(wod, plan) {
  const f = wod.format;

  if (f === 'ladder' || f === 'ladder_multi') {
    const stepCount = f === 'ladder' ? wod.steps.length : wod.rounds;
    const isLast = UI.wodStepIndex + 1 >= stepCount;
    const stepLabel = f === 'ladder' ? wod.steps[UI.wodStepIndex]
      : wod.perMove.map(p => `${p.steps[UI.wodStepIndex]} ${p.name}`).join(' + ');
    return `<div class="exec-body">
      <div class="card wod-line"><div>${wod.movements}</div></div>
      <div class="section-meta">ROUND ${UI.wodStepIndex + 1} / ${stepCount}${f === 'ladder' ? ' · ' + wod.steps.join('–') : ''}</div>
      <div class="big-time" style="${f === 'ladder_multi' ? 'font-size:38px' : ''}">${stepLabel}</div>
      <div class="mid-time mid-time-dim" id="wodTime">${fmtClock(UI.timer ? UI.timer.elapsedMs() : 0)}</div>
      ${capTagHtml(UI.timer ? UI.timer.elapsedMs() : 0, wod.capSec)}
      <div class="action-row">
        ${playPauseBtn(false)}
        <button class="btn btn-primary" style="flex:1" onclick="App.wodRoundDone()">${isLast ? 'Finish WOD' : 'Round Done'}</button>
      </div>
    </div>`;
  }

  if (f === 'rft' || f === 'fortime_between') {
    const isLast = UI.wodRftRound + 1 >= wod.rounds;
    const between = f === 'fortime_between' && !isLast ? `<div class="wod-between">Then: ${wod.betweenLine}</div>` : '';
    return `<div class="exec-body">
      <div class="card wod-line"><div>${wod.movements}</div>${between}</div>
      <div class="section-meta">ROUND ${UI.wodRftRound + 1} / ${wod.rounds}</div>
      <div class="mid-time" id="wodTime">${fmtClock(UI.timer ? UI.timer.elapsedMs() : 0)}</div>
      ${capTagHtml(UI.timer ? UI.timer.elapsedMs() : 0, wod.capSec)}
      <div class="action-row">
        ${playPauseBtn(false)}
        <button class="btn btn-primary" style="flex:1" onclick="App.wodRoundDone()">${isLast ? 'Finish WOD' : 'Round Done'}</button>
      </div>
    </div>`;
  }

  if (f === 'rft_bookend') {
    const elapsed = fmtClock(UI.timer ? UI.timer.elapsedMs() : 0);
    if (UI.wodPhase === 'buyin') {
      return `<div class="exec-body">
        <div class="time-label">Buy-In</div>
        <div class="card wod-line"><div>${wod.buyIn}</div></div>
        <div class="mid-time" id="wodTime">${elapsed}</div>
        <div class="action-row" style="margin-top:auto">
          ${playPauseBtn(false)}
          <button class="btn btn-primary" style="flex:1" onclick="App.rftBookendBuyInDone()">Buy-In Done</button>
        </div>
      </div>`;
    }
    if (UI.wodPhase === 'buyout') {
      return `<div class="exec-body">
        <div class="time-label">Buy-Out</div>
        <div class="card wod-line"><div>${wod.buyOut}</div></div>
        <div class="mid-time" id="wodTime">${elapsed}</div>
        <div class="action-row" style="margin-top:auto">
          ${playPauseBtn(false)}
          <button class="btn btn-primary" style="flex:1" onclick="App.finishWodWithClock()">Finish WOD</button>
        </div>
      </div>`;
    }
    const isLast = UI.wodRftRound + 1 >= wod.rounds;
    return `<div class="exec-body">
      <div class="time-label">Main Rounds</div>
      <div class="card wod-line"><div>${wod.movements}</div></div>
      <div class="section-meta">ROUND ${UI.wodRftRound + 1} / ${wod.rounds}</div>
      <div class="mid-time" id="wodTime">${elapsed}</div>
      <div class="action-row">
        ${playPauseBtn(false)}
        <button class="btn btn-primary" style="flex:1" onclick="App.rftBookendRoundDone()">${isLast ? 'Go to Buy-Out' : 'Round Done'}</button>
      </div>
    </div>`;
  }

  if (f === 'fortime') {
    return `<div class="exec-body">
      <div class="card wod-line"><div>${wod.movements}</div></div>
      <div class="mid-time" id="wodTime">${fmtClock(UI.timer ? UI.timer.elapsedMs() : 0)}</div>
      ${capTagHtml(UI.timer ? UI.timer.elapsedMs() : 0, wod.capSec)}
      <div class="action-row">
        ${playPauseBtn(false)}
        <button class="btn btn-primary" style="flex:1" onclick="App.finishFortime()">Finish WOD</button>
      </div>
    </div>`;
  }

  if (f === 'fortime_repeats') {
    if (UI.wodPhase === 'rest') {
      return `<div class="exec-body">
        <div class="time-label">Rest before repeat ${UI.wodRepeatIndex + 1} / ${wod.repeats}</div>
        <div class="mid-time" id="restTime">${fmtClock(UI.timer ? UI.timer.remainingMs() : 0)}</div>
        <button class="btn btn-ghost" onclick="App.skipRepeatRest()">Skip Rest</button>
      </div>`;
    }
    const isLastRepeat = UI.wodRepeatIndex >= wod.repeats;
    return `<div class="exec-body">
      <div class="section-meta">REPEAT ${UI.wodRepeatIndex} / ${wod.repeats}</div>
      <div class="card wod-line"><div>${wod.movements}</div></div>
      <div class="mid-time" id="wodTime">${fmtClock(UI.timer ? UI.timer.elapsedMs() : 0)}</div>
      ${UI.wodRepeatTimes.length ? `<div class="section-meta">Previous: ${UI.wodRepeatTimes.join(', ')}</div>` : ''}
      <div class="action-row" style="margin-top:auto">
        ${playPauseBtn(false)}
        <button class="btn btn-primary" style="flex:1" onclick="App.repeatDone()">${isLastRepeat ? 'Finish Final Repeat' : 'Repeat Done'}</button>
      </div>
    </div>`;
  }

  if (f === 'amrap' || f === 'amreps') {
    const counter = f === 'amreps'
      ? `<div class="stepper-row"><div class="stepper"><div class="stepper-label">Reps</div><div class="stepper-controls">
          <button class="stepper-btn" onclick="App.amrapAddRep(-1)">−</button><div class="stepper-val">${UI.wodAmrapReps}</div><button class="stepper-btn" onclick="App.amrapAddRep(1)">+</button>
        </div></div></div>`
      : amrapStepperRow();
    return `<div class="exec-body">
      <div class="card wod-line"><div>${wod.movements}</div></div>
      <div class="big-time" id="wodTime">${fmtClock(UI.timer ? UI.timer.remainingMs() : 0)}</div>
      ${counter}
      <div class="action-row" style="margin-top:auto">
        ${playPauseBtn(true)}
        <button class="btn btn-ghost" onclick="App.finishAmrap()">Finish Early</button>
      </div>
    </div>`;
  }

  if (f === 'amrap_buyin') {
    if (UI.wodPhase === 'buyin') {
      return `<div class="exec-body">
        <div class="time-label">Buy-In</div>
        <div class="card wod-line"><div>${wod.buyIn}</div></div>
        <div class="mid-time" id="wodTime">${fmtClock(UI.timer ? UI.timer.elapsedMs() : 0)}</div>
        <div class="action-row" style="margin-top:auto">
          ${playPauseBtn(false)}
          <button class="btn btn-primary" style="flex:1" onclick="App.amrapBuyInDone()">Buy-In Done — Start AMRAP</button>
        </div>
      </div>`;
    }
    return `<div class="exec-body">
      <div class="section-meta">Buy-in: ${fmtClock(UI.wodBuyInMs || 0)}</div>
      <div class="card wod-line"><div>${wod.movements}</div></div>
      <div class="big-time" id="wodTime">${fmtClock(UI.timer ? UI.timer.remainingMs() : 0)}</div>
      ${amrapStepperRow()}
      <div class="action-row" style="margin-top:auto">
        ${playPauseBtn(true)}
        <button class="btn btn-ghost" onclick="App.finishAmrap()">Finish Early</button>
      </div>
    </div>`;
  }

  if (f === 'amrap_multi') {
    if (UI.wodPhase === 'rest') {
      return `<div class="exec-body">
        <div class="time-label">Rest before interval ${UI.wodIntervalIndex + 1} / ${wod.intervals}</div>
        <div class="mid-time" id="restTime">${fmtClock(UI.timer ? UI.timer.remainingMs() : 0)}</div>
        <button class="btn btn-ghost" onclick="App.skipIntervalRest()">Skip Rest</button>
      </div>`;
    }
    return `<div class="exec-body">
      <div class="section-meta">INTERVAL ${UI.wodIntervalIndex} / ${wod.intervals}</div>
      <div class="card wod-line"><div>${wod.movements}</div></div>
      <div class="big-time" id="wodTime">${fmtClock(UI.timer ? UI.timer.remainingMs() : 0)}</div>
      ${amrapStepperRow()}
      ${UI.wodIntervalScores.length ? `<div class="section-meta">Done: ${UI.wodIntervalScores.join(', ')}</div>` : ''}
      <div class="action-row" style="margin-top:auto">
        ${playPauseBtn(true)}
        <button class="btn btn-ghost" onclick="App.finishIntervalEarly()">End Interval Early</button>
      </div>
    </div>`;
  }

  if (f === 'amrap_ascending') {
    return `<div class="exec-body">
      <div class="section-meta">RUNG ${UI.wodRung}</div>
      <div class="big-time">${UI.wodRung}<span class="big-time-unit"> reps each</span></div>
      <div class="card wod-line"><div>${wod.movements}</div></div>
      <div class="mid-time mid-time-dim" id="wodTime">${fmtClock(UI.timer ? UI.timer.remainingMs() : 0)}</div>
      <div class="action-row" style="margin-top:auto">
        ${playPauseBtn(false)}
        <button class="btn btn-primary" style="flex:1" onclick="App.ascendingRoundDone()">Rung Done — Next</button>
      </div>
    </div>`;
  }

  // emom / emom_multi / emom_open
  let line;
  if (f === 'emom_multi') line = wod.movements;
  else { const isOdd = UI.bRoundIndex % 2 === 1; line = plan.isBenchmark ? wod.movements : (isOdd ? wod.oddLine : wod.evenLine); }
  const hasRounds = !!wod.rounds;
  const isLastRound = hasRounds && UI.bRoundIndex >= wod.rounds;
  return `<div class="exec-body">
    <div class="time-label">MIN ${UI.bRoundIndex}${hasRounds ? ' / ' + wod.rounds : ''}</div>
    <div class="section-meta">${line}</div>
    <div class="big-time" id="bTime">${fmtClock(UI.timer ? UI.timer.remainingMs() : 0)}</div>
    ${playPauseBtn(true)}
    <button class="btn btn-ghost" style="margin-top:auto" onclick="App.wodSkipRound()">${isLastRound ? 'Finish WOD' : (hasRounds ? 'Skip to Next Minute' : 'Skip Minute')}</button>
    ${!hasRounds ? `<button class="btn btn-primary btn-block" onclick="App.finishOpenEmom()">End EMOM</button>` : ''}
  </div>`;
}

function renderCoreBody(core) {
  if (core.shape === 'tabata' || core.shape === 'holds') {
    const moveName = exerciseById(core.moves[(UI.coreRound - 1) % core.moves.length]).name;
    const phaseLabel = UI.corePhase === 'work' || UI.corePhase === 'hold' ? (core.shape === 'tabata' ? 'WORK' : 'HOLD') : 'REST';
    return `<div class="exec-body">
      <span class="tag ${UI.corePhase === 'rest' ? 'tag-neutral' : 'tag-accent'}">${phaseLabel}</span>
      <div class="section-meta">${moveName}</div>
      <div class="big-time big-time-huge" id="coreTime">${Math.ceil((UI.timer ? UI.timer.remainingMs() : 0) / 1000)}</div>
      <div class="time-label">ROUND ${UI.coreRound} / ${core.rounds}</div>
      ${playPauseBtn(true)}
    </div>`;
  }
  // straight
  const items = UI.coreChecks.map((c, i) => {
    const moveId = core.moves[i % core.moves.length];
    const round = Math.floor(i / core.moves.length) + 1;
    return `<div class="check-item" onclick="App.toggleCoreCheck(${i})">
      <div class="check-box ${c ? 'checked' : ''}">${c ? ICON.check : ''}</div>
      <div class="check-label ${c ? 'checked' : ''}">${core.reps} ${exerciseById(moveId).name}</div>
      <div class="check-round">R${round}</div>
    </div>`;
  }).join('');
  return `<div class="exec-body">
    <div class="big-time" id="coreTimeUp">${fmtClock(UI.timer ? UI.timer.elapsedMs() : 0)}</div>
    ${playPauseBtn(true)}
    <div class="checklist">${items}</div>
    <button class="btn btn-primary btn-block" style="margin-top:auto" onclick="App.finishCore()">Finish Core</button>
  </div>`;
}

// ─── Rating sheet / Summary ─────────────────────────────────────────────────
// Rating is an overlay, not a route: the just-finished exec screen stays mounted
// (frozen — see goToRating) behind a dimmed sheet, so you can still see the score
// or checklist you ended on while you rate it, and there's one less hard screen
// change per section.

function ratingResultLine(section) {
  const r = UI.pendingResult || {};
  if (section === 'wod' && r.score) return `Score: ${r.score}`;
  if (section === 'skill' && r.weight != null) return `${r.weight} lb${r.reps ? ' × ' + r.reps : ''}`;
  if (section === 'warmup' && r.total) return `${r.checked} of ${r.total} moves logged`;
  return '';
}

function renderRatingSheet() {
  const section = UI.ratingFor;
  const resultLine = ratingResultLine(section);
  return `<div class="dialog-backdrop">
    <div class="dialog rating-sheet">
      <div class="tag tag-neutral">${SECTION_TITLES[section].toUpperCase()} DONE</div>
      ${resultLine ? `<div class="rating-result">${resultLine}</div>` : ''}
      <div class="dialog-title">How did that feel?</div>
      <div class="rating-buttons">
        <button class="btn btn-secondary btn-block" onclick="App.rate('easy')">Easy</button>
        <button class="btn btn-primary btn-block" onclick="App.rate('right')">Just Right</button>
        <button class="btn btn-secondary btn-block" onclick="App.rate('hard')">Too Hard</button>
      </div>
    </div>
  </div>`;
}

function renderSummary() {
  const plan = Store.state.today;
  const rows = SECTION_ORDER.map(s => `<div class="card summary-row">
    <div class="section-title" style="font-size:15px">${SECTION_TITLES[s]}</div>
    <span class="tag ${RATING_TAG_CLASS[plan.ratings[s]]}">${RATING_LABEL[plan.ratings[s]]}</span>
  </div>`).join('');
  return `<div class="screen no-nav">
    <div class="exec-body" style="padding-top:var(--space-8)">
      <span class="tag tag-good">SESSION COMPLETE</span>
      <h2>Nice work.</h2>
      <div class="move-list">${rows}</div>
      <button class="btn btn-primary btn-block" style="margin-top:auto" onclick="App.goToday()">Back to Today</button>
    </div>
  </div>`;
}

// ─── History ─────────────────────────────────────────────────────────────

function renderHistory() {
  const log = Store.state.sessionLog.slice().reverse();
  if (log.length === 0) {
    return `<div class="empty-state"><h3>No sessions yet</h3><p>Finish your first session and it'll show up here.</p></div>`;
  }
  const items = log.map(entry => {
    const chips = SECTION_ORDER.map(s => entry.ratings[s]
      ? `<span class="tag ${RATING_TAG_CLASS[entry.ratings[s]]}">${SECTION_TITLES[s]}: ${RATING_LABEL[entry.ratings[s]]}</span>` : '').join('');
    return `<div class="card history-item">
      <div class="history-top">
        <div class="history-date">${entry.date}</div>
        <span class="tag tag-focus-${entry.focus}">${FOCUS_LABELS[entry.focus].toUpperCase()}</span>
      </div>
      <div class="history-line">${entry.wodBadge} · ${entry.wodMovements}</div>
      <div class="rating-chips">${chips}</div>
    </div>`;
  }).join('');
  return `<div class="section-heading">History</div><div class="card-list" style="padding-bottom:24px">${items}</div>`;
}

// ─── Timer factories — shared between fresh starts and reload-restores ────

function makeTimerFor(section, plan) {
  if (section === 'warmup') {
    return new WTimer({ mode: 'up', onTick: () => { const e = byId('warmupTime'); if (e) e.textContent = fmtClock(UI.timer.elapsedMs()); } });
  }
  if (section === 'skill') {
    const s = plan.skill;
    if (s.shape === 'B') {
      return new WTimer({
        mode: 'down', durationMs: s.intervalSec * 1000,
        onTick: () => { const e = byId('bTime'); if (e) e.textContent = fmtClock(UI.timer.remainingMs()); },
        onWarn: () => Feedback.tick(),
        onComplete: () => App.advanceSkillB(),
      });
    }
    return null; // shapes A/C don't run a clock at entry
  }
  if (section === 'wod') {
    const w = plan.wod;
    const downWod = (durationMs, onComplete) => new WTimer({
      mode: 'down', durationMs,
      onTick: () => { const e = byId('wodTime'); if (e) e.textContent = fmtClock(UI.timer.remainingMs()); },
      onWarn: () => Feedback.tick(), onComplete,
    });
    const upWod = () => new WTimer({ mode: 'up', onTick: () => { const e = byId('wodTime'); if (e) e.textContent = fmtClock(UI.timer.elapsedMs()); } });
    const downRest = (durationMs, onComplete) => new WTimer({
      mode: 'down', durationMs,
      onTick: () => { const e = byId('restTime'); if (e) e.textContent = fmtClock(UI.timer.remainingMs()); },
      onWarn: () => Feedback.tick(), onComplete,
    });
    const downMin = (onComplete) => new WTimer({
      mode: 'down', durationMs: 60 * 1000,
      onTick: () => { const e = byId('bTime'); if (e) e.textContent = fmtClock(UI.timer.remainingMs()); },
      onWarn: () => Feedback.tick(), onComplete,
    });

    if (w.format === 'amrap' || w.format === 'amreps') return downWod(w.capSec * 1000, () => App.finishAmrap());
    if (w.format === 'amrap_ascending') return downWod(w.capSec * 1000, () => App.finishAscending());
    if (w.format === 'amrap_buyin') {
      return UI.wodPhase === 'buyin' ? upWod() : downWod(w.capSec * 1000, () => App.finishAmrap());
    }
    if (w.format === 'amrap_multi') {
      return UI.wodPhase === 'rest' ? downRest(w.restSec * 1000, () => App.advanceAmrapMultiFromRest()) : downWod(w.workSec * 1000, () => App.advanceAmrapMultiFromWork());
    }
    if (w.format === 'fortime_repeats') {
      return UI.wodPhase === 'rest' ? downRest(w.restSec * 1000, () => App.advanceRepeatFromRest()) : upWod();
    }
    if (w.format === 'emom' || w.format === 'emom_multi' || w.format === 'emom_open') return downMin(() => App.advanceWodEmom());
    // ladder, ladder_multi, rft, fortime, fortime_between, rft_bookend — self-paced, clock counts up
    return upWod();
  }
  if (section === 'core') {
    const c = plan.core;
    if (c.shape === 'tabata' || c.shape === 'holds') {
      const dur = (c.shape === 'tabata' ? c.workSec : c.holdSec) * 1000;
      return new WTimer({
        mode: 'down', durationMs: dur,
        onTick: () => { const e = byId('coreTime'); if (e) e.textContent = Math.ceil(UI.timer.remainingMs() / 1000); },
        onWarn: () => Feedback.tick(),
        onComplete: () => App.advanceCorePhase(),
      });
    }
    return new WTimer({ mode: 'up', onTick: () => { const e = byId('coreTimeUp'); if (e) e.textContent = fmtClock(UI.timer.elapsedMs()); } });
  }
  return null;
}

function makeRestTimer(durMs) {
  return new WTimer({
    mode: 'down', durationMs: durMs,
    onTick: () => { const e = byId('restTime'); if (e) e.textContent = fmtClock(UI.timer.remainingMs()); },
    onWarn: () => Feedback.tick(),
    onComplete: () => { Feedback.roundChange(); UI.skillResting = false; render(); persistExec(); },
  });
}

// ─── Exec-state persistence — survives a reload or an iOS PWA being purged ─

function persistExec() {
  if (UI.screen !== 'exec' || !Store.state.today) { Store.state.execState = null; return; }
  const { timer, ...uiSnap } = UI;
  Store.state.execState = {
    planDate: Store.state.today.date,
    ui: uiSnap,
    timer: timer ? { elapsedMs: timer.elapsedMs(), running: timer.running } : null,
    savedAt: Date.now(),
  };
  Store.save();
}

function restoreExecIfAny() {
  const ex = Store.state.execState;
  const plan = Store.state.today;
  if (!ex || !plan || ex.planDate !== plan.date) { Store.state.execState = null; return false; }
  if (plan.completed[ex.ui.execSection]) { Store.state.execState = null; return false; }

  Object.assign(UI, ex.ui);
  UI.leadIn = null;

  let timer = null;
  if (ex.ui.timerKind === 'entry') timer = makeTimerFor(ex.ui.execSection, plan);
  else if (ex.ui.timerKind === 'rest') timer = makeRestTimer(plan.skill.rest * 1000);

  if (timer && ex.timer) {
    const gapMs = ex.timer.running ? Date.now() - ex.savedAt : 0;
    timer.restore(ex.timer.elapsedMs + gapMs, ex.timer.running);
  }
  UI.timer = timer;
  UI.running = timer ? timer.running : false;
  UI.screen = 'exec';
  return true;
}

// ─── App controller ─────────────────────────────────────────────────────────

const App = {
  init() {
    if (!Store.state.onboarded && Store.state.equipment.length === 0) {
      Store.state.equipment = DEFAULT_EQUIPMENT.slice();
    }
    UI.screen = Store.state.onboarded ? 'today' : 'onboarding';
    if (Store.state.onboarded) {
      generateToday(Store.state);
      if (restoreExecIfAny()) { render(); this._startAutosave(); return; }
    }
    Store.state.execState = null;
    render();
    this._startAutosave();
  },

  _startAutosave() {
    if (this._autosaveIv) return;
    this._autosaveIv = setInterval(() => { if (UI.screen === 'exec' && UI.leadIn === null) persistExec(); }, 4000);
  },

  goTab(tab) {
    UI.tab = tab;
    UI.screen = tab;
    if (tab === 'today') generateToday(Store.state);
    render();
  },
  goToday() { this.goTab('today'); },

  showInfo(key) { UI.dialog = key; render(); },
  closeDialog() { UI.dialog = null; render(); },

  tapCustomPreset(id) {
    const p = Store.state.customPresets.find(x => x.id === id);
    if (!p) return;
    if (sameSet(Store.state.equipment, p.items)) {
      if (confirm(`Delete preset "${p.label}"?`)) {
        Store.state.customPresets = Store.state.customPresets.filter(x => x.id !== id);
        Store.save();
      }
    } else {
      Store.state.equipment = p.items.slice();
      Store.save();
    }
    render();
  },
  saveCurrentAsPreset() {
    const name = prompt('Name this equipment preset:');
    if (!name || !name.trim()) return;
    Store.state.customPresets.push({ id: 'custom_' + Date.now(), label: name.trim(), items: Store.state.equipment.slice() });
    Store.save(); render();
  },
  toggleEquip(id) {
    const eq = Store.state.equipment;
    const idx = eq.indexOf(id);
    if (idx >= 0) eq.splice(idx, 1); else eq.push(id);
    Store.save(); render();
  },
  setAllEquip(on) {
    Store.state.equipment = on ? ALL_EQUIPMENT.slice() : [];
    Store.save(); render();
  },
  adjustPlate(type, size, delta) {
    const inv = Store.state.plateInventory[type];
    inv[size] = Math.max(0, (inv[size] || 0) + delta);
    Store.save(); render();
  },
  toggleSound() {
    Store.state.soundOn = !Store.state.soundOn;
    Store.save(); render();
  },
  finishOnboarding() {
    Store.state.onboarded = true;
    Store.save();
    generateToday(Store.state);
    UI.screen = 'today'; UI.tab = 'today';
    render();
  },
  confirmReset() {
    if (confirm('Reset all WODshed data on this device? This cannot be undone.')) {
      Store.reset();
      this.init();
    }
  },

  acceptBenchmark() {
    swapWodToBenchmark(Store.state);
    render();
  },
  dismissBenchmark() {
    Store.state.today.benchmarkOffer = null;
    Store.save(); render();
  },

  startOrResume() {
    const plan = Store.state.today;
    const next = SECTION_ORDER.find(s => !plan.completed[s]);
    if (next) this.enterExec(next);
  },

  // Re-rolls just one section of today's plan — the LRU-based pickers used by
  // every generateX naturally favor whatever wasn't just used, so this reliably
  // surfaces a different template/movement set without touching the rest of the day.
  regenerateSection(section) {
    const state = Store.state;
    const plan = state.today;
    const equip = state.equipment;
    if (section === 'warmup') plan.warmup = generateWarmup(state, equip);
    else if (section === 'skill') plan.skill = generateSkill(state, plan.focus, equip);
    else if (section === 'wod') {
      plan.wod = generateWod(state, plan.focus, equip);
      plan.isBenchmark = false; plan.benchmarkId = null; plan.benchmarkName = null;
    } else if (section === 'core') plan.core = generateCore(state, equip);
    Store.save(); render();
  },

  enterExec(section) {
    UI.execSection = section; UI.screen = 'exec';
    if (UI.timer) { UI.timer.destroy(); UI.timer = null; }
    const plan = Store.state.today;

    if (section === 'warmup') {
      UI.warmupChecks = new Array(plan.warmup.moves.length * plan.warmup.rounds).fill(false);
    } else if (section === 'skill') {
      const s = plan.skill;
      if (s.shape === 'A') { UI.skillSetIndex = 0; UI.skillWeight = s.weight; UI.skillResting = false; }
      else if (s.shape === 'B') { UI.bRoundIndex = 1; }
      else { UI.skillRoundIndex = 1; UI.skillResting = false; }
    } else if (section === 'wod') {
      const w = plan.wod;
      UI.wodStepIndex = 0; UI.wodRftRound = 0; UI.wodAmrapRounds = 0; UI.wodAmrapReps = 0; UI.bRoundIndex = 1;
      UI.wodIntervalIndex = 1; UI.wodIntervalScores = [];
      UI.wodRung = w.startReps || 1; UI.wodLastCompletedRung = 0;
      UI.wodRepeatIndex = 1; UI.wodRepeatTimes = [];
      if (w.format === 'amrap_buyin' || w.format === 'rft_bookend') UI.wodPhase = 'buyin';
      else if (w.format === 'amrap_multi') UI.wodPhase = 'work';
      else UI.wodPhase = null;
    } else if (section === 'core') {
      const c = plan.core;
      if (c.shape === 'tabata' || c.shape === 'holds') { UI.coreRound = 1; UI.corePhase = c.shape === 'tabata' ? 'work' : 'hold'; }
      else { UI.coreChecks = new Array(c.moves.length * c.rounds).fill(false); }
    }

    const timer = makeTimerFor(section, plan);
    UI.timer = timer;
    UI.timerKind = timer ? 'entry' : null;
    UI.running = false;

    if (!timer) { render(); persistExec(); return; }

    UI.leadIn = 3;
    render();
    runLeadIn((n) => { UI.leadIn = n; render(); }, () => {
      UI.leadIn = null;
      timer.start();
      UI.running = true;
      render();
      persistExec();
    });
  },

  exitExec() {
    if (UI.timer) { UI.timer.destroy(); UI.timer = null; }
    Store.state.execState = null; Store.save();
    UI.screen = 'today'; render();
  },

  toggleTimer() {
    if (!UI.timer) return;
    UI.timer.toggle(); UI.running = UI.timer.running; render(); persistExec();
  },

  toggleWarmupCheck(i) { UI.warmupChecks[i] = !UI.warmupChecks[i]; render(); persistExec(); },
  finishWarmup() {
    UI.pendingResult = { checked: UI.warmupChecks.filter(Boolean).length, total: UI.warmupChecks.length };
    this.goToRating('warmup');
  },

  adjustWeight(dir) {
    const s = Store.state.today.skill;
    const inc = LIFT_INCREMENT[s.liftId] || 5;
    UI.skillWeight = Math.max(0, UI.skillWeight + dir * inc);
    render(); persistExec();
  },
  completeSet() {
    const s = Store.state.today.skill;
    if (UI.skillSetIndex + 1 >= s.scheme.length) {
      UI.pendingResult = { weight: UI.skillWeight, reps: s.scheme[s.scheme.length - 1] };
      this.goToRating('skill');
      return;
    }
    UI.skillSetIndex += 1;
    UI.skillResting = true;
    UI.timer = makeRestTimer(s.rest * 1000);
    UI.timerKind = 'rest';
    UI.timer.start();
    render(); persistExec();
  },
  skipRest() {
    if (UI.timer) UI.timer.destroy();
    UI.timer = null; UI.timerKind = null;
    UI.skillResting = false; render(); persistExec();
  },
  completeSkillRound() {
    const s = Store.state.today.skill;
    if (UI.skillRoundIndex >= s.rounds) {
      UI.pendingResult = {};
      this.goToRating('skill');
      return;
    }
    UI.skillRoundIndex += 1;
    UI.skillResting = true;
    UI.timer = makeRestTimer(s.rest * 1000);
    UI.timerKind = 'rest';
    UI.timer.start();
    render(); persistExec();
  },
  advanceSkillB() {
    const s = Store.state.today.skill;
    if (UI.bRoundIndex >= s.rounds) {
      UI.pendingResult = {};
      this.goToRating('skill');
      return;
    }
    Feedback.roundChange();
    UI.bRoundIndex += 1;
    UI.timer.reset(s.intervalSec * 1000);
    UI.timer.start();
    render(); persistExec();
  },
  skillSkipRound() { this.advanceSkillB(); },

  wodRoundDone() {
    const w = Store.state.today.wod;
    if (w.format === 'ladder' || w.format === 'ladder_multi') {
      const stepCount = w.format === 'ladder' ? w.steps.length : w.rounds;
      if (UI.wodStepIndex + 1 >= stepCount) { this.finishWodWithClock(); return; }
      UI.wodStepIndex += 1;
    } else if (w.format === 'rft' || w.format === 'fortime_between') {
      if (UI.wodRftRound + 1 >= w.rounds) { this.finishWodWithClock(); return; }
      UI.wodRftRound += 1;
      if (w.format === 'fortime_between') Feedback.roundChange();
    }
    render(); persistExec();
  },
  finishFortime() { this.finishWodWithClock(); },
  finishWodWithClock() {
    UI.pendingResult = { score: fmtClock(UI.timer ? UI.timer.elapsedMs() : 0) };
    this.goToRating('wod');
  },
  amrapAddRound() { UI.wodAmrapRounds += 1; render(); persistExec(); },
  amrapAddRep(d) { UI.wodAmrapReps = Math.max(0, UI.wodAmrapReps + d); render(); persistExec(); },
  finishAmrap() {
    const w = Store.state.today.wod;
    if (w.format === 'amreps') {
      UI.pendingResult = { score: `${UI.wodAmrapReps} reps` };
    } else if (w.format === 'amrap_buyin') {
      const buyIn = fmtClock(UI.wodBuyInMs || 0);
      UI.pendingResult = { score: `${UI.wodAmrapRounds}+${UI.wodAmrapReps} (buy-in ${buyIn})` };
    } else {
      UI.pendingResult = { score: `${UI.wodAmrapRounds}+${UI.wodAmrapReps}` };
    }
    this.goToRating('wod');
  },

  // Buy-in for AMRAP with Buy-In: an up-timer clocks the task, then this swaps
  // in a fresh down-timer for the AMRAP proper.
  amrapBuyInDone() {
    UI.wodBuyInMs = UI.timer ? UI.timer.elapsedMs() : 0;
    Feedback.roundChange();
    if (UI.timer) UI.timer.destroy();
    UI.wodPhase = 'amrap';
    const w = Store.state.today.wod;
    UI.timer = makeTimerFor('wod', Store.state.today);
    UI.timerKind = 'entry';
    UI.timer.start(); UI.running = true;
    render(); persistExec();
  },

  // Ascending AMRAP: tapping through climbs the rung ladder; the cap ends it.
  ascendingRoundDone() {
    const w = Store.state.today.wod;
    Feedback.roundChange();
    UI.wodLastCompletedRung = UI.wodRung;
    UI.wodRung += (w.increment || 1);
    render(); persistExec();
  },
  finishAscending() {
    UI.pendingResult = { score: `${UI.wodLastCompletedRung} rungs` };
    this.goToRating('wod');
  },

  // Multiple AMRAP Intervals: work timer -> capture score -> rest timer -> repeat.
  // (goToRating already plays the completion cue on the final interval, so this
  // only fires its own cue when there's another interval still to come.)
  advanceAmrapMultiFromWork() {
    const w = Store.state.today.wod;
    UI.wodIntervalScores.push(`${UI.wodAmrapRounds}+${UI.wodAmrapReps}`);
    if (UI.wodIntervalIndex >= w.intervals) { this.finishAmrapMulti(); return; }
    Feedback.roundChange();
    UI.wodPhase = 'rest';
    if (UI.timer) UI.timer.destroy();
    UI.timer = makeTimerFor('wod', Store.state.today);
    UI.timer.start();
    render(); persistExec();
  },
  advanceAmrapMultiFromRest() {
    const w = Store.state.today.wod;
    Feedback.roundChange();
    UI.wodIntervalIndex += 1;
    UI.wodAmrapRounds = 0; UI.wodAmrapReps = 0;
    UI.wodPhase = 'work';
    if (UI.timer) UI.timer.destroy();
    UI.timer = makeTimerFor('wod', Store.state.today);
    UI.timer.start(); UI.running = true;
    render(); persistExec();
  },
  skipIntervalRest() { this.advanceAmrapMultiFromRest(); },
  // Only reachable from the work-phase button — rest phase has its own Skip Rest action.
  finishIntervalEarly() { this.advanceAmrapMultiFromWork(); },
  finishAmrapMulti() {
    UI.pendingResult = { score: UI.wodIntervalScores.join(', ') };
    this.goToRating('wod');
  },

  // For Time Repeats: each repeat is its own for-time clock, with rest between.
  repeatDone() {
    const w = Store.state.today.wod;
    const t = fmtClock(UI.timer ? UI.timer.elapsedMs() : 0);
    UI.wodRepeatTimes.push(t);
    if (UI.wodRepeatIndex >= w.repeats) {
      UI.pendingResult = { score: UI.wodRepeatTimes.join(', ') };
      this.goToRating('wod');
      return;
    }
    Feedback.complete();
    UI.wodPhase = 'rest';
    if (UI.timer) UI.timer.destroy();
    UI.timer = makeTimerFor('wod', Store.state.today);
    UI.timer.start();
    render(); persistExec();
  },
  advanceRepeatFromRest() {
    Feedback.roundChange();
    UI.wodRepeatIndex += 1;
    UI.wodPhase = null;
    if (UI.timer) UI.timer.destroy();
    UI.timer = makeTimerFor('wod', Store.state.today);
    UI.timer.start(); UI.running = true;
    render(); persistExec();
  },
  skipRepeatRest() { this.advanceRepeatFromRest(); },

  // RFT with Bookends: one continuous clock across buy-in -> rounds -> buy-out.
  rftBookendBuyInDone() {
    Feedback.roundChange();
    UI.wodPhase = 'main';
    render(); persistExec();
  },
  rftBookendRoundDone() {
    const w = Store.state.today.wod;
    if (UI.wodRftRound + 1 >= w.rounds) {
      Feedback.roundChange();
      UI.wodPhase = 'buyout';
      render(); persistExec();
      return;
    }
    UI.wodRftRound += 1;
    render(); persistExec();
  },

  advanceWodEmom() {
    const w = Store.state.today.wod;
    if (w.rounds && UI.bRoundIndex >= w.rounds) {
      UI.pendingResult = { score: `${w.rounds} rounds` };
      this.goToRating('wod');
      return;
    }
    Feedback.roundChange();
    UI.bRoundIndex += 1;
    UI.timer.reset(60 * 1000);
    UI.timer.start();
    render(); persistExec();
  },
  wodSkipRound() { this.advanceWodEmom(); },
  finishOpenEmom() {
    UI.pendingResult = { score: `${UI.bRoundIndex} minutes` };
    this.goToRating('wod');
  },

  advanceCorePhase() {
    const c = Store.state.today.core;
    if (c.shape === 'tabata') {
      if (UI.corePhase === 'work') {
        Feedback.roundChange();
        UI.corePhase = 'rest';
        UI.timer.reset(c.restSec * 1000); UI.timer.start();
      } else if (UI.coreRound >= c.rounds) {
        this.finishCore();
      } else {
        Feedback.roundChange();
        UI.coreRound += 1; UI.corePhase = 'work';
        UI.timer.reset(c.workSec * 1000); UI.timer.start();
      }
    } else {
      if (UI.corePhase === 'hold') {
        Feedback.roundChange();
        UI.corePhase = 'rest';
        UI.timer.reset(c.restSec * 1000); UI.timer.start();
      } else if (UI.coreRound >= c.rounds) {
        this.finishCore();
      } else {
        Feedback.roundChange();
        UI.coreRound += 1; UI.corePhase = 'hold';
        UI.timer.reset(c.holdSec * 1000); UI.timer.start();
      }
    }
    render(); persistExec();
  },
  toggleCoreCheck(i) { UI.coreChecks[i] = !UI.coreChecks[i]; render(); persistExec(); },
  finishCore() {
    UI.pendingResult = {};
    this.goToRating('core');
  },

  // Rating no longer swaps the screen — it freezes the just-finished exec screen
  // (pause, don't destroy, so the final time/score/checklist stays on display)
  // and shows a dismiss-proof sheet on top of it.
  goToRating(section) {
    if (UI.timer) UI.timer.pause();
    UI.running = false;
    Feedback.complete();
    Store.state.execState = null; Store.save();
    UI.ratingFor = section;
    render();
  },

  rate(value) {
    const section = UI.ratingFor;
    UI.ratingFor = null;
    completeSection(Store.state, section, value, UI.pendingResult);
    const plan = Store.state.today;
    const next = SECTION_ORDER.find(s => !plan.completed[s]);
    if (next) this.enterExec(next);
    else { UI.screen = 'summary'; render(); }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
