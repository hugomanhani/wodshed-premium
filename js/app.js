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

const PRESET_ORDER = ['mygarage', 'fullbox', 'garage', 'minimal', 'bodyweight'];

function equipmentPickerHtml() {
  const equip = Store.state.equipment;
  const total = ALL_EQUIPMENT.length;

  const presetChips = PRESET_ORDER.map(key => {
    const p = EQUIPMENT_PRESETS[key];
    const isActive = sameSet(equip, p.items);
    return `<div class="preset-chip ${isActive ? 'active' : ''}" onclick="App.applyPreset('${key}')">${p.label}</div>`;
  }).join('');

  const groups = EQUIPMENT_GROUPS.map(g => {
    const rows = g.items.map(it => {
      const on = equip.includes(it.id);
      return `<div class="equip-toggle" onclick="App.toggleEquip('${it.id}')">
        <span>${it.label}</span><div class="switch ${on ? 'on' : ''}"></div>
      </div>`;
    }).join('');
    return `<div class="equip-group"><div class="equip-group-label">${g.label}</div>${rows}</div>`;
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
  ${groups}`;
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort(), sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
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
  return `<div class="section-heading">Equipment</div>
  <div class="section-sub">Turn off anything you don't have. Changes apply to your next session.</div>
  ${equipmentPickerHtml()}
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

function sectionInfo(section, plan) {
  if (section === 'warmup') {
    return { title: 'Warm-Up', meta: `2 Rounds · ${plan.warmup.moves.map(m => exerciseById(m).name).join(', ')}` };
  }
  if (section === 'skill') {
    return { title: 'Skill' + (plan.skill.liftName ? ' · ' + plan.skill.liftName : ''), meta: skillMetaLine(plan.skill) };
  }
  if (section === 'wod') {
    return { title: 'WOD · ' + (plan.isBenchmark ? plan.benchmarkName : plan.wod.label), meta: `${plan.wod.badge} · ${plan.wod.movements}` };
  }
  return { title: 'Core', meta: coreMetaLine(plan.core) };
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

  const featured = doneCount < 4 ? SECTION_ORDER.find(s => !plan.completed[s]) : null;
  let mainPanel;
  if (!featured) {
    mainPanel = `<div class="up-next-panel is-done">
      <div class="up-next-kicker">Session complete</div>
      <h2>Nice work today.</h2>
      <p class="section-sub" style="padding:0">Your next focus is queued up for tomorrow.</p>
    </div>`;
  } else {
    const { title, meta } = sectionInfo(featured, plan);
    const kicker = doneCount === 0 ? 'Up first' : 'Up next';
    const verb = doneCount === 0 ? 'Start' : 'Resume';
    mainPanel = `<div class="up-next-panel">
      <div class="up-next-kicker">${kicker}</div>
      <h2>${title}</h2>
      <p class="up-next-meta">${meta}</p>
      <button class="btn btn-primary btn-block" onclick="App.enterExec('${featured}')">${ICON.play} ${verb} ${SECTION_TITLES[featured]}</button>
    </div>`;
  }

  const refRows = SECTION_ORDER.filter(s => s !== featured).map(s => refRowHtml(s, plan)).join('');

  return `
    <div class="topbar">
      <div>
        <div class="date-label">${dateStr} · ~${mins} MIN</div>
        <h1>Today</h1>
      </div>
      <span class="tag tag-focus-${plan.focus}">${FOCUS_LABELS[plan.focus].toUpperCase()}</span>
    </div>
    ${railHtml(plan)}
    <div style="padding:0 var(--space-4) var(--space-4)">${mainPanel}</div>
    ${banner}
    <div class="ref-list">${refRows}</div>
    <div style="height:24px"></div>
  `;
}

function refRowHtml(section, plan) {
  const done = plan.completed[section];
  const rating = plan.ratings[section];
  const { title, meta } = sectionInfo(section, plan);
  const right = done
    ? `<span class="tag ${RATING_TAG_CLASS[rating]}">${RATING_LABEL[rating]}</span>`
    : `<span class="ref-row-meta">${meta}</span>`;
  return `<div class="ref-row ${done ? 'done' : ''}"${done ? '' : ` onclick="App.enterExec('${section}')"`}>
    <span class="ref-row-dot">${done ? ICON.check : ''}</span>
    <span class="ref-row-title">${title}</span>
    ${right}
  </div>`;
}

// ─── Execution screens ───────────────────────────────────────────────────

function execHeader(plan, title, infoKey) {
  return `<div class="exec-header">
    <button class="btn btn-icon btn-ghost" onclick="App.exitExec()">${ICON.back}</button>
    <div class="kicker">${title}${infoKey ? infoBtn(infoKey) : ''}</div>
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
  const title = SECTION_TITLES[section].toUpperCase();

  if (UI.leadIn !== null) return `<div class="screen no-nav">${execHeader(plan, title)}${leadInHtml()}</div>`;

  if (section === 'warmup') return `<div class="screen no-nav">${execHeader(plan, title)}${renderWarmupBody(plan.warmup)}</div>`;
  if (section === 'skill') return `<div class="screen no-nav">${execHeader(plan, title)}${renderSkillBody(plan.skill)}</div>`;
  if (section === 'wod') {
    const fmtKey = plan.wod.format.toUpperCase() === 'FORTIME' ? 'FORTIME' : plan.wod.format.toUpperCase();
    return `<div class="screen no-nav">${execHeader(plan, title, fmtKey)}${renderWodBody(plan.wod, plan)}</div>`;
  }
  if (section === 'core') return `<div class="screen no-nav">${execHeader(plan, title)}${renderCoreBody(plan.core)}</div>`;
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

function renderWodBody(wod, plan) {
  if (wod.format === 'ladder') {
    const step = wod.steps[UI.wodStepIndex];
    const isLast = UI.wodStepIndex + 1 >= wod.steps.length;
    return `<div class="exec-body">
      <div class="card wod-line"><div>${wod.movements}</div></div>
      <div class="section-meta">ROUND ${UI.wodStepIndex + 1} / ${wod.steps.length} · ${wod.steps.join('–')}</div>
      <div class="big-time">${step}</div>
      <div class="mid-time mid-time-dim" id="wodTime">${fmtClock(UI.timer ? UI.timer.elapsedMs() : 0)}</div>
      ${capTagHtml(UI.timer ? UI.timer.elapsedMs() : 0, wod.capSec)}
      <div class="action-row">
        ${playPauseBtn(false)}
        <button class="btn btn-primary" style="flex:1" onclick="App.wodRoundDone()">${isLast ? 'Finish WOD' : 'Round Done'}</button>
      </div>
    </div>`;
  }
  if (wod.format === 'rft') {
    const isLast = UI.wodRftRound + 1 >= wod.rounds;
    return `<div class="exec-body">
      <div class="card wod-line"><div>${wod.movements}</div></div>
      <div class="section-meta">ROUND ${UI.wodRftRound + 1} / ${wod.rounds}</div>
      <div class="mid-time" id="wodTime">${fmtClock(UI.timer ? UI.timer.elapsedMs() : 0)}</div>
      ${capTagHtml(UI.timer ? UI.timer.elapsedMs() : 0, wod.capSec)}
      <div class="action-row">
        ${playPauseBtn(false)}
        <button class="btn btn-primary" style="flex:1" onclick="App.wodRoundDone()">${isLast ? 'Finish WOD' : 'Round Done'}</button>
      </div>
    </div>`;
  }
  if (wod.format === 'fortime') {
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
  if (wod.format === 'amrap') {
    return `<div class="exec-body">
      <div class="card wod-line"><div>${wod.movements}</div></div>
      <div class="big-time" id="wodTime">${fmtClock(UI.timer ? UI.timer.remainingMs() : 0)}</div>
      <div class="stepper-row">
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
      </div>
      <div class="action-row" style="margin-top:auto">
        ${playPauseBtn(true)}
        <button class="btn btn-ghost" onclick="App.finishAmrap()">Finish Early</button>
      </div>
    </div>`;
  }
  // emom
  const isOdd = UI.bRoundIndex % 2 === 1;
  const line = plan.isBenchmark ? wod.movements : (isOdd ? wod.oddLine : wod.evenLine);
  const isLastRound = UI.bRoundIndex >= wod.rounds;
  return `<div class="exec-body">
    <div class="time-label">MIN ${UI.bRoundIndex} / ${wod.rounds}</div>
    <div class="section-meta">${line}</div>
    <div class="big-time" id="bTime">${fmtClock(UI.timer ? UI.timer.remainingMs() : 0)}</div>
    ${playPauseBtn(true)}
    <button class="btn btn-ghost" style="margin-top:auto" onclick="App.wodSkipRound()">${isLastRound ? 'Finish WOD' : 'Skip to Next Minute'}</button>
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
    if (w.format === 'amrap') {
      return new WTimer({
        mode: 'down', durationMs: w.capSec * 1000,
        onTick: () => { const e = byId('wodTime'); if (e) e.textContent = fmtClock(UI.timer.remainingMs()); },
        onWarn: () => Feedback.tick(),
        onComplete: () => App.finishAmrap(),
      });
    }
    if (w.format === 'emom') {
      return new WTimer({
        mode: 'down', durationMs: 60 * 1000,
        onTick: () => { const e = byId('bTime'); if (e) e.textContent = fmtClock(UI.timer.remainingMs()); },
        onWarn: () => Feedback.tick(),
        onComplete: () => App.advanceWodEmom(),
      });
    }
    return new WTimer({ mode: 'up', onTick: () => { const e = byId('wodTime'); if (e) e.textContent = fmtClock(UI.timer.elapsedMs()); } });
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
      Store.state.equipment = EQUIPMENT_PRESETS.mygarage.items.slice();
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

  applyPreset(key) {
    Store.state.equipment = EQUIPMENT_PRESETS[key].items.slice();
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
      UI.wodStepIndex = 0; UI.wodRftRound = 0; UI.wodAmrapRounds = 0; UI.wodAmrapReps = 0; UI.bRoundIndex = 1;
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
    if (w.format === 'ladder') {
      if (UI.wodStepIndex + 1 >= w.steps.length) { this.finishWodWithClock(); return; }
      UI.wodStepIndex += 1;
    } else if (w.format === 'rft') {
      if (UI.wodRftRound + 1 >= w.rounds) { this.finishWodWithClock(); return; }
      UI.wodRftRound += 1;
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
    UI.pendingResult = { score: `${UI.wodAmrapRounds}+${UI.wodAmrapReps}` };
    this.goToRating('wod');
  },
  advanceWodEmom() {
    const w = Store.state.today.wod;
    if (UI.bRoundIndex >= w.rounds) {
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
