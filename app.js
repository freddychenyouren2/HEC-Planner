/* HEC Planner: a static, local-first application. No third-party runtime services. */
'use strict';
const H=HECCore, catalogue=CATALOGUE.courses, app=document.getElementById('app');
const STORAGE='hec-planner-spring-2027-v1';
const icons={
  search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',eyeOff:'<path d="m3 3 18 18M10 5a12 12 0 0 1 12 7s-1 3-4 5M6 6a19 19 0 0 0-4 6s3 7 10 7c2 0 4-.6 5-1.5"/>',x:'<path d="m6 6 12 12M6 18 18 6"/>',left:'<path d="m15 5-7 7 7 7"/>',right:'<path d="m9 5 7 7-7 7"/>',grid:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 9v12M15 9v12M8 2v4M16 2v4"/>',calendar:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7 13h2m2 0h2m2 0h2M7 17h2m2 0h2"/>',plus:'<path d="M12 4v16M4 12h16"/>',check:'<path d="m5 12 4 4L20 5"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'
};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[n]||icons.grid}</svg>`;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}
[c]));
const fmt=d=>new Intl.DateTimeFormat('en-GB',{
  day:'numeric',month:'short',timeZone:'UTC'
}).format(new Date(d+'T12:00:00Z'));
const fullDate=d=>new Intl.DateTimeFormat('en-GB',{
  weekday:'short',day:'numeric',month:'short',timeZone:'UTC'
}).format(new Date(d+'T12:00:00Z'));
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MANDATORY_IDS = ["C1-G1", "S1-G1", "S2-G1", "S3-G1", "S4"];

let plan = { version: 1, selected: [] };
let sample = false;
let storageAvailable = true;
let query = "";
let typeFilter = "all";
let requiredFilter = "all";
let weekFilter = [];
let view = "weekly";
let week = "all";
let weekends = false;
let pendingRemoval = null;

function makeStartingPlan() {
  return H.normalizePlan(
    { selected: MANDATORY_IDS.map((id) => ({ id })) },
    catalogue,
  );
}

try {
  const storedPlan = localStorage.getItem(STORAGE);
  plan = storedPlan
    ? H.normalizePlan(JSON.parse(storedPlan), catalogue)
    : makeStartingPlan();
} catch {
  storageAvailable = false;
  plan = makeStartingPlan();
}
function getCourse(id){
  return catalogue.find(c=>c.id===id);
}
function selectedCourses(){
  return plan.selected.map(s=>({
    ...getCourse(s.id),color:s.color,hidden:s.hidden
  }));
}
function selectedFor(code){
  return plan.selected.find(s=>getCourse(s.id).code===code);
}
function page(){
  const route=location.hash.slice(1).split('?')[0];
  return ['courses','about'].includes(route)?route:'timetable';
}
function toast(text){
  const el=document.getElementById('toast');
  el.textContent=text;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>el.classList.remove('show'),3500);
}
function save(){
  try{
    localStorage.setItem(STORAGE,JSON.stringify(plan));
    storageAvailable=true;
  } catch{
    storageAvailable=false;
    toast('Browser storage is unavailable. Export your plan to keep a copy.');
  }
}
function update(){
  save();
  render();
}
function addCourse(id) {
  const course = getCourse(id);
  if (!course) return;

  const existing = selectedFor(course.code);
  if (existing) {
    if (existing.id === id) return;
    existing.id = id;
    toast(`${course.code} switched to G${course.group}.`);
  } else {
    const color = H.palette.find((item) =>
      !plan.selected.some((selection) => selection.color === item)
    );
    plan.selected.push({
      id,
      hidden: false,
      color: color || H.palette[0],
    });
    toast(
      `${course.code}${course.group ? ` G${course.group}` : ""} added to your plan.`
    );
  }

  sample = false;
  update();
}

function requestMandatoryRemoval(course) {
  pendingRemoval = course.id;
  document.getElementById("confirm-content").innerHTML = `
    <div class="dialog-head">
      <div class="eyebrow">MANDATORY SELECTION</div>
      <h2 id="confirm-title">Remove this mandatory selection?</h2>
      <p class="small">${escape(course.code)} · ${escape(course.name)}</p>
    </div>
    <div class="dialog-body">
      <p>This selection is marked mandatory in the supplied HEC Paris catalogue. Remove it from your timetable?</p>
    </div>
    <div class="dialog-foot mandatory-actions">
      <button class="keep-mandatory" data-keep-removal>Keep</button>
      <button class="remove-mandatory" data-confirm-removal>Remove</button>
    </div>`;
  document.getElementById("mandatory-dialog").showModal();
}

function requestClearPlan() {
  const mandatoryCourses = selectedCourses().filter((course) => course.mandatory);
  if (mandatoryCourses.length === 0) {
    clearPlan();
    return;
  }

  pendingRemoval = "all";
  const names = mandatoryCourses
    .map((course) => `<li>${escape(course.code)} · ${escape(course.name)}</li>`)
    .join("");
  document.getElementById("confirm-content").innerHTML = `
    <div class="dialog-head">
      <div class="eyebrow">MANDATORY SELECTIONS</div>
      <h2 id="confirm-title">Clear the full plan?</h2>
    </div>
    <div class="dialog-body">
      <p>Your plan includes these mandatory selections:</p>
      <ul>${names}</ul>
      <p>Remove them and all other selected courses?</p>
    </div>
    <div class="dialog-foot mandatory-actions">
      <button class="keep-mandatory" data-keep-removal>Keep</button>
      <button class="remove-mandatory" data-confirm-removal>Remove</button>
    </div>`;
  document.getElementById("mandatory-dialog").showModal();
}

function removeCourse(id) {
  const course = getCourse(id);
  if (!course) return;
  if (course.mandatory) {
    requestMandatoryRemoval(course);
    return;
  }

  plan.selected = plan.selected.filter((selection) => selection.id !== id);
  sample = false;
  update();
}

function confirmRemoval() {
  if (pendingRemoval === "all") {
    clearPlan();
  } else if (pendingRemoval) {
    plan.selected = plan.selected.filter(
      (selection) => selection.id !== pendingRemoval,
    );
    sample = false;
    update();
  }

  pendingRemoval = null;
  document.getElementById("mandatory-dialog").close();
}

function clearPlan() {
  plan = { version: 1, selected: [] };
  sample = false;
  update();
}

function useSample() {
  const sampleIds = [...MANDATORY_IDS, "C6", "C7", "C11", "S5", "S8"];
  plan = H.normalizePlan(
    { selected: sampleIds.map((id) => ({ id })) },
    catalogue,
  );
  sample = true;
  week = "all";
  view = "weekly";
  update();
  toast("Example plan loaded. Change any course to make it yours.");
}

function courseSuffix(c){
  return `${c.group?` <span class="group-label">G${c.group}</span>`:''}${c.mandatory?' <span class="mandatory-label" title="Mandatory in the supplied International Business catalogue">◆ Mandatory</span>':''}`;
}
function ects(course) {
  return course.ects == null ? "ECTS unknown" : `${course.ects} ECTS`;
}

function sessionSummary(course) {
  return `${course.totalSessions} sessions · ${course.totalHours} hours`;
}

function truncateSynopsis(text) {
  const characters = Array.from(text.replace(/\s+/g, " ").trim());
  if (characters.length <= 200) return text;
  const shortened = characters.slice(0, 199).join("").replace(/\s+\S*$/, "").trimEnd();
  return `${shortened}…`;
}

function formatSynopsis(text) {
  return escape(text).replace(/\n/g, "<br>");
}

function kindBadge(course) {
  const label = course.kind === "course" ? "Course Elective" : "Skills Seminar";
  return `<span class="kind-tag ${course.kind}">${label}</span>`;
}
function range(c){
  const dates=c.sessions.map(s=>s.date).sort();
  return dates[0]===dates.at(-1)?fmt(dates[0]):`${fmt(dates[0])} – ${fmt(dates.at(-1))}`;
}
function searchBox(id,placeholder,value='',results=false){
  return `<div class="search-wrap">
<label class="search" for="${id}">${icon('search')}<input id="${id}" type="search" autocomplete="off" placeholder="${placeholder}" value="${escape(value)}" aria-label="${placeholder}" ${results?'aria-controls="search-results" aria-expanded="false"':''}>
<span class="keyboard-key">/</span>
</label>${results?'<div id="search-results" class="search-results" hidden></div>':''}</div>`;
}
function sidebar(){
  const courses=selectedCourses(),t=H.credits(courses),unknownCourses=courses.filter((course)=>course.ects==null);
  return `<aside class="sidebar" aria-label="Your selected courses">
<section class="panel credit-panel">
<div class="credit-box">
<div class="credit-top">
<span class="tiny-label">Your credits</span>
<span class="count">${courses.length} selected</span>
</div>
<div class="credit-value">${t.total}<small>ECTS${t.unknown?' known':''}</small>
</div>
<div class="credit-bar" aria-hidden="true">
<i style="width:${t.total?t.course/t.total*100:0}%">
</i>
<i style="width:${t.total?t.seminar/t.total*100:0}%">
</i>
</div>
<div class="credit-line">
<span>
<i class="dot">
</i> Course Elective</span>
<strong>${t.course}</strong>
</div>
<div class="credit-line">
<span>
<i class="dot">
</i> Skills Seminar</span>
<strong>${t.seminar}</strong>
</div>${t.unknown?`<div class="warning">Unspecified ECTS: ${unknownCourses.map((course)=>escape(course.code+' '+course.name)).join(', ')}. These offerings are excluded from the known total.</div>`:''}<p class="small" style="margin-top:15px">Hidden courses still count toward your credits.</p>
</div>
</section>
<section class="panel">
<div class="panel-head">
<h2>Selected courses</h2>
<span class="count">${courses.length}</span>
</div>
<div class="selected-list">${courses.length?courses.map(c=>`<article class="selected-item ${c.hidden?'hidden-course':''}" style="--c:${c.color}"><div class="item-top"><button class="color-dot" data-color="${c.id}" aria-label="Change colour for ${c.code}" title="Change colour"></button><span class="course-code">${c.code}</span>${kindBadge(c)}<div class="item-actions"><button class="icon-button" data-hide="${c.id}" aria-label="${c.hidden?'Show':'Hide'} ${c.id}" title="${c.hidden?'Show':'Hide'} on timetable" aria-pressed="${c.hidden}">${icon(c.hidden?'eyeOff':'eye')}</button><button class="icon-button" data-remove="${c.id}" aria-label="Remove ${c.id}" title="Remove course">${icon('x')}</button></div></div><button class="course-name" data-detail="${c.id}">${escape(c.name)}${courseSuffix(c)}</button><div class="selected-meta"><span>${ects(c)}</span><span>W${H.weekLabel(H.weeks(c))}</span>${c.hidden?'<span>Hidden</span>':''}</div></article>`).join(''):`<div class="empty-plan">A little planning goes a long way.<br>Search above to add your first course.<br><button data-sample>Explore an example plan</button></div>`}</div>
<div class="sidebar-bottom">
<a href="#courses" class="text-button">Browse all courses ↗</a>${courses.length?'<button class="text-button" data-clear>Clear plan</button>':''}</div>
</section>
</aside>`;
}
function actionsMenu(){
  return `<details class="plan-actions">
<summary>Export &amp; save ▾</summary>
<div class="menu">
<button data-export="ics">${icon('download')} Export calendar (.ics)</button>
<button data-export="json">Export plan (.json)</button>
<button data-import>Import a saved plan</button>
<button data-share>Copy plan link</button>
<button data-print>Print / save current view</button>
<button data-save-view="png">Download current view (.png)</button>
<button data-save-view="pdf">Download current view (.pdf)</button>
</div>
</details>
<input id="import-file" type="file" accept=".json,application/json" hidden>`;
}
function planner(){
  const selected=selectedCourses(),clashes=H.conflicts(selected);
  return `<div class="workspace">${sidebar()}<section class="planner" aria-label="Timetable planner">
<div class="planner-top">${searchBox('quick-search','Search course name or code (e.g. C6, S8)','',true)}${actionsMenu()}</div>${!storageAvailable?'<div class="warning" style="margin:0 0 15px">Changes cannot be saved in this browser. Use Export plan to keep your selections.</div>':''}${sample?'<div class="notice"><span>EXAMPLE PLAN &nbsp; A starting point to explore both views. Adjust the courses to make it yours.</span><button data-clear>Start fresh</button></div>':''}<div class="panel timetable-panel">
<div class="timetable-toolbar">
<div class="segmented" aria-label="Timetable views">
<button data-view="weekly" class="${view==='weekly'?'active':''}" aria-pressed="${view==='weekly'}">${icon('grid')} Weekly timetable</button>
<button data-view="calendar" class="${view==='calendar'?'active':''}" aria-pressed="${view==='calendar'}">${icon('calendar')} Semester calendar</button>
</div>${view==='weekly'?`<div class="week-nav"><button data-prev aria-label="Previous week" ${week==='all'||week===1?'disabled':''}>${icon('left')}</button><label class="sr-only" for="week-select">Teaching week</label><select id="week-select"><option value="all" ${week==='all'?'selected':''}>All teaching weeks</option>${Array.from({length:16},(_,i)=>`<option value="${i+1}" ${Number(week)===i+1?'selected':''}>Week ${i+1} · ${fmt(H.addDays(H.ANCHOR,i*7))} – ${fmt(H.addDays(H.ANCHOR,i*7+6))}</option>`).join('')}</select><button data-next aria-label="Next week" ${week===16?'disabled':''}>${icon('right')}</button></div>`:'<span class="small">January — April 2027</span>'}</div>${view==='weekly'?weekly():calendar()}<div class="grid-bottom">
<span>
<i class="break-example">
</i> Faint connectors represent 10-minute breaks.</span>
<span>Europe/Paris · Week 1 starts 11 January</span>
</div>
</div>${clashPanel(clashes)}<p class="small" style="margin:13px 2px 0">Planning does not register you for courses. Verify your assigned groups and the latest schedule with HEC.</p>
</section>
</div>`;
}
function weekly(){
  const courses=selectedCourses().filter(c=>!c.hidden),blocks=H.blocks(courses,week);
  const days=weekends?7:5;
  const start=week==='all'?null:H.addDays(H.ANCHOR,(Number(week)-1)*7);
  let out=`<div class="schedule-caption">
<span>${week==='all'?'<strong>All teaching weeks</strong> · Blocks show their active week numbers.':'<strong>Week '+week+'</strong> · '+fmt(start)+' – '+fmt(H.addDays(start,6))} ${week==='all'?'<br>Overlaid times may occur in different weeks. Only actual date clashes are flagged.':''}</span>
<label>
<input type="checkbox" id="weekends" ${weekends?'checked':''}> Show weekends</label>
</div>
<div class="schedule-scroll">
<div class="week-grid">
<div class="days-head" style="grid-template-columns:repeat(${days},1fr)">${DAYS.slice(0,days).map((d,i)=>`<div class="day-head">${d.slice(0,3).toUpperCase()}${start?`<small>${fmt(H.addDays(start,i))}</small>`:''}</div>`).join('')}</div>
<div class="grid-body">`;
  for(let i=0;i<=11;i++)out+=`<span class="hour-label" style="top:${i/11*100}%">${String(i+8).padStart(2,'0')}00</span>`;
  for(let d=0;d<days;d++){
    out+=`<div class="day-column" style="left:${d/days*100}%;width:${100/days}%">`;
    for(const b of H.layout(blocks.filter(b=>b.day===d))){
      const duration=b.end-b.start;
      const title=`${b.course.name}${b.course.group?' G'+b.course.group:''} · ${b.label} · ${b.parts.map(p=>H.time(p.start)+'–'+H.time(p.end)).join(', ')} · Weeks ${H.weekLabel(b.weeks)} · ${b.dates.map(fullDate).join(', ')}`;
      out+=`<button class="session ${b.label==='Exam'?'is-exam':''}" data-detail="${b.course.id}" title="${escape(title)}" aria-label="${escape(title)}" style="--c:${b.course.color};top:${(b.start-480)/660*100}%;height:${duration/660*100}%;left:calc(${b.lane/b.lanes*100}% + 3px);width:calc(${100/b.lanes}% - 6px)">`;
      for(let i=0;i<b.parts.length;i++){
        const p=b.parts[i];
        out+=`<span class="segment" style="top:${(p.start-b.start)/duration*100}%;height:${(p.end-p.start)/duration*100}%">
</span>`;
        if(i<b.parts.length-1)out+=`<span class="break" style="top:${(p.end-b.start)/duration*100}%;height:${10/duration*100}%">
</span>`;
      }
      out+=`<span class="session-copy">
<strong>${b.course.code}${b.course.group?' · G'+b.course.group:''}${b.course.mandatory?' ◆':''}${b.label==='Exam'?' · EXAM':''}</strong>
<span class="session-title">${escape(b.course.name)}</span>
<span class="session-time">${H.time(b.start)}–${H.time(b.end)}</span>
<span class="session-weeks">W${H.weekLabel(b.weeks)}${b.parts.length>1?'<br>10-min break':''}</span>
</span>
</button>`;
    }
    out+='</div>';
  }
  if(!blocks.length)out+=`<div class="empty-grid">
<h3>${plan.selected.length?'A little breathing room.':'Build your spring semester.'}</h3>
<p>${plan.selected.length?'No visible classes in this view. Try another week, or show a hidden course.':'Add courses with the search bar or browse the catalogue to start planning.'}</p>${!plan.selected.length?'<button class="primary" data-sample>Try an example plan</button>':''}</div>`;
  return out+'</div></div></div>';
}
function calendar(){
  const blocks=selectedCourses().filter(c=>!c.hidden).flatMap(H.groupedSessions);
  let html='<div class="schedule-caption"><span><strong>Your four-month overview</strong> · Select any date to expand its week.</span><span>Mon → Sun</span></div><div class="month-grid">';
  for(let m=0;m<4;m++){
    const first=`2027-${String(m+1).padStart(2,'0')}-01`;
    const last=new Date(Date.UTC(2027,m+1,0,12)).toISOString().slice(0,10);
    const begin=H.monday(first);
    const n=Math.ceil((H.weekday(first)+Number(last.slice(-2)))/7);
    html+=`<section class="month" aria-label="${['January','February','March','April'][m]} 2027">
<h3>${['January','February','March','April'][m]}<span>2027</span>
</h3>
<div class="month-weekdays">${DAYS.map(d=>`<span>${d.slice(0,3)}</span>`).join('')}</div>`;
    for(let row=0;row<n;row++){
      html+='<div class="month-week">';
      for(let d=0;d<7;d++){
        const date=H.addDays(begin,row*7+d),inMonth=date.slice(0,7)===first.slice(0,7),w=H.weekOf(date);
        const items=inMonth?blocks.filter(b=>b.date===date).sort((a,b)=>a.start-b.start):[];
        html+=`<div data-expand-week="${w}" class="calendar-day ${inMonth?'':'outside'} ${w<1?'preterm':''}">
<button class="date-num" data-expand-week="${w}" aria-label="Expand ${fullDate(date)}, week ${w}" ${w<1||w>16?'disabled':''}>${Number(date.slice(-2))}${d===0&&w>0&&w<=16?'<small>W'+w+'</small>':''}</button>${items.map(b=>`<button class="calendar-event" data-detail="${b.course.id}" style="--c:${b.course.color}" aria-label="Course details: ${escape(b.course.name)}"><strong>${b.course.code}${b.course.group?' G'+b.course.group:''}${b.label==='Exam'?' Exam':''}${b.course.mandatory?' ◆':''}</strong><span class="event-name">${escape(b.course.name)}</span>${H.time(b.start)}–${H.time(b.end)}</button>`).join('')}</div>`;
      }
      html+='</div>';
    }
    html+='</section>';
  }
  return html+'</div>';
}
function clashPanel(clashes){
  if(!clashes.length)return plan.selected.length?'<div class="notice" style="margin:15px 0 0"><span>✓ No date-and-time clashes across your selected courses, including hidden courses.</span></div>':'';
  return `<details class="clashes">
<summary>
<strong>${clashes.length} overlapping session pair${clashes.length===1?'':'s'}</strong> across your selected courses · Includes hidden courses. Review clashes ▾</summary>
<div class="clash-list">${clashes.map(c=>`<div class="clash-row"><strong>W${H.weekOf(c.date)} · ${fullDate(c.date)} · ${H.time(c.start)}–${H.time(c.end)}</strong><br>${escape(c.a.code+' '+c.a.name+(c.a.group?' G'+c.a.group:''))} ↔ ${escape(c.b.code+' '+c.b.name+(c.b.group?' G'+c.b.group:''))}</div>`).join('')}</div>
</details>`;
}
function filteredSubjects() {
  const subjects = [...new Set(catalogue.map((course) => course.code))]
    .map((code) => catalogue.filter((course) => course.code === code));
  const term = query.trim().toLocaleLowerCase();
  return subjects.filter((group) => {
    const course = group[0];
    const matchesText = !term || `${course.name} ${course.code} ${course.teacher} ${course.subtype}`.toLocaleLowerCase().includes(term);
    const matchesType = typeFilter === "all" || course.kind === typeFilter;
    const matchesRequirement = requiredFilter === "all" || course.mandatory === (requiredFilter === "mandatory");
    const matchesWeeks = !weekFilter.length || group.some((item) => weekFilter.some((selectedWeek) => H.weeks(item).includes(selectedWeek)));
    return matchesText && matchesType && matchesRequirement && matchesWeeks;
  });
}
function cards() {
  return filteredSubjects().map((group) => {
    const course = group[0];
    const selected = selectedFor(course.code);
    const shown = selected ? getCourse(selected.id) : course;
    const synopsis = truncateSynopsis(shown.synopsis || "");
    return `<article class="panel course-card ${selected ? "is-selected" : ""}">
<div class="card-tags"><span class="course-code">${course.code}</span>${kindBadge(course)}<span class="count" style="margin-left:auto">${ects(course)}</span></div>
<h2>${escape(course.name)}${courseSuffix(course)}</h2>
<p class="small">${escape(course.teacher)}</p>
<p class="description">${escape(synopsis)}</p>
<div class="card-info"><span>◷ ${range(shown)}</span><span>W${H.weekLabel(H.weeks(shown))}</span><span>${shown.totalSessions} sessions · ${shown.totalHours} hours</span></div>
<div class="card-footer"><button class="text-button" data-detail="${shown.id}">Course details ↗</button><div class="card-add">${group.length > 1 ? `<select aria-label="Group for ${course.code}" id="group-${course.code}">${group.map((item) => `<option value="${item.id}" ${shown.id === item.id ? "selected" : ""}>G${item.group}</option>`).join("")}</select>` : ""}${selected ? `<span class="selected-status">${icon("check")} Selected</span><button class="catalogue-remove" data-remove="${selected.id}" aria-label="Remove ${escape(course.name)}">Remove</button>` : `<button class="primary" data-card-add="${course.code}" data-default="${course.id}">${icon("plus")} Add</button>`}</div></div>
</article>`;
  }).join("") || '<div class="panel catalogue-empty">No courses match these filters. Try another search or reset the filters.</div>';
}
function renderCards(){
  document.getElementById('course-cards').innerHTML=cards();
  document.getElementById('result-number').textContent=filteredSubjects().length;
}
function coursesPage() {
  const monday = (weekNumber) => H.addDays(H.ANCHOR, (weekNumber - 1) * 7);
  return `<div class="catalogue-tools">${searchBox("catalogue-search", "Search by course name, code or professor", query)}<div class="filters">
<label class="sr-only" for="type-filter">Course type</label><select id="type-filter"><option value="all">All types</option><option value="course" ${typeFilter === "course" ? "selected" : ""}>Course Elective</option><option value="seminar" ${typeFilter === "seminar" ? "selected" : ""}>Skills Seminar</option></select>
<label class="sr-only" for="required-filter">Requirement</label><select id="required-filter"><option value="all">All requirements</option><option value="mandatory" ${requiredFilter === "mandatory" ? "selected" : ""}>Mandatory</option><option value="elective" ${requiredFilter === "elective" ? "selected" : ""}>Elective</option></select>
<details class="week-filter"><summary>Weeks${weekFilter.length ? ` (${weekFilter.length})` : ""}</summary><div class="week-options"><label><input type="checkbox" data-week-option="all" ${weekFilter.length ? "" : "checked"}> All weeks</label>${Array.from({length: 16}, (_, index) => { const weekNumber = index + 1; const start = monday(weekNumber); const end = H.addDays(start, 6); return `<label><input type="checkbox" data-week-option="${weekNumber}" ${weekFilter.includes(weekNumber) ? "checked" : ""}> Week ${weekNumber} · ${fmt(start)}–${fmt(end)}</label>`; }).join("")}</div></details>
</div></div><div class="result-count"><span><strong id="result-number">${filteredSubjects().length}</strong> subjects · 12 courses / 9 skills seminars · 25 group offerings</span><button class="text-button" data-reset-filters>Reset filters</button></div><div id="course-cards" class="course-cards">${cards()}</div>`;
}
function about() {
  const sources = CATALOGUE.sources;
  return `<div class="about"><section class="panel"><div class="eyebrow">MADE FOR THE COHORT</div><h2 style="margin-top:12px">A clearer view of Spring 2027.</h2>
<p>HEC Planner was created by a fellow HEC Paris exchange student from NUS, using the source documents provided by HEC Paris dated 5 November 2026. This independent project is not affiliated with HEC Paris or NUSMods and does not register students for classes.</p>
<p><strong>Official term: 11 January–16 April 2027.</strong> The calendar continues through 30 April. Week 1 begins Monday 11 January; weeks advance each Monday. Class times use Europe/Paris local time.</p>
<h3>Source documents</h3><ul>${sources.map((source, index) => `<li><a data-source="${index}" href="${source.url}" target="_blank" rel="noopener">${escape(source.title)} (PDF)</a></li>`).join("")}</ul></section>
<section class="panel"><h2>Course types and data</h2><p><strong>Course Elective</strong> and <strong>Skills Seminar</strong> are shown as separate types. Mandatory status appears as its own label. App codes are identifiers created for this planner; group options are alternatives.</p><p>Synopsis, learning outcomes and pedagogical objectives are transcribed from the linked catalogues. Schedules may change; verify assigned groups and latest information with HEC.</p><p>Offerings with unspecified ECTS are listed in the credits warning and excluded from known totals.</p></section>
</div>`;
}
function render(){
  const p=page();
  document.querySelectorAll('[data-page]').forEach(a=>{
    a.classList.toggle('active',a.dataset.page===p);if(a.dataset.page===p)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  document.getElementById('page-title').textContent=p==='timetable'?'Your semester, in view.':p==='courses'?'Find your next perspective.':'A little more about the planner.';
  document.getElementById('page-subtitle').textContent=p==='timetable'?'Find your courses. Make your plan. See how it all fits.':p==='courses'?'Explore the courses and skills seminars shaping your spring.':'Built for students, with the details that matter.';
  app.innerHTML=p==='courses'?coursesPage():p==='about'?about():planner();
}
function quickResults(q){
  const results=document.getElementById('search-results');
  if(!q.trim()){
    results.hidden=true;
    document.getElementById('quick-search').setAttribute('aria-expanded','false');
    return;
  }
  const term=q.toLocaleLowerCase().trim();
  const matches=catalogue.filter(c=>`${c.name} ${c.code} ${c.teacher}`.toLocaleLowerCase().includes(term));
  results.innerHTML=matches.map(c=>{
    const current=selectedFor(c.code);return `<div class="search-result">
<div>
<span class="course-code">${c.code}</span> ${kindBadge(c)}<button class="course-name" data-detail="${c.id}">${escape(c.name)}${courseSuffix(c)}</button>
<span class="small">${ects(c)} · W${H.weekLabel(H.weeks(c))}</span>
</div>
<button class="add ${current?.id===c.id?'':'primary'}" data-add="${c.id}" ${current?.id===c.id?'disabled':''}>${current?.id===c.id?'Added':current?'Switch group':'+ Add'}</button>
</div>`;
  }).join('')||'<p class="no-courses-note">No matching courses. Try a shorter name or a code such as C6.</p>';
  results.hidden=false;
  document.getElementById('quick-search').setAttribute('aria-expanded','true');
}
function showDetail(id){
  const c=getCourse(id);
  if(!c)return;
  const grouped=H.groupedSessions(c),selected=selectedFor(c.code),siblings=catalogue.filter(g=>g.code===c.code);
  document.getElementById('detail-content').innerHTML=`<div class="dialog-head">
<button class="icon-button dialog-close" data-close aria-label="Close course details">${icon('x')}</button>
<div class="card-tags">
<span class="course-code">${c.code}</span>${kindBadge(c)}</div>
<h2 id="detail-title">${escape(c.name)}${courseSuffix(c)}</h2>
<p class="small">${escape(c.teacher)}</p>
</div>
<div class="dialog-body">
<p><strong>${escape(c.synopsisHeading || "Synopsis")}</strong><br>${formatSynopsis(c.synopsis || "")}</p>${c.learningOutcomes ? `<h3>${escape(c.learningOutcomesHeading || "Learning Outcomes")}</h3><p>${formatSynopsis(c.learningOutcomes)}</p>` : ""}${c.pedagogicalObjectives ? `<h3>${escape(c.pedagogicalObjectivesHeading || "Pedagogical Objectives")}</h3><p>${formatSynopsis(c.pedagogicalObjectives)}</p>` : ""}
<div class="detail-facts">
<span>Credits<strong>${ects(c)}</strong>
</span>
<span>Sessions / hours<strong>${c.totalSessions} · ${c.totalHours} h</strong></span><span>Date range<strong>${range(c)}</strong>
</span>
<span>Teaching weeks<strong>${H.weekLabel(H.weeks(c))}</strong>
</span>
<span>Source<strong>${c.kind==='course'?'Courses':'Seminars'} PDF · page ${c.sourcePage}</strong>
</span>
</div>${siblings.length>1?`<h3>Choose a group</h3><div class="segmented">${siblings.map(g=>`<button data-detail="${g.id}" class="${g.id===id?'active':''}">G${g.group} · ${range(g)}</button>`).join('')}</div>`:''}${c.notes.length?c.notes.map(n=>`<div class="warning">${escape(n)}</div>`).join(''):''}<h3>Dated sessions <span class="count">${c.sessions.length}</span>
</h3>
<p class="small" style="margin-bottom:10px">Ten-minute breaks appear between adjacent sessions. Click a week to see it in the planner.</p>
<table class="detail-table">
<thead>
<tr>
<th>Date</th>
<th>Week</th>
<th>Paris time</th>
<th>Type</th>
</tr>
</thead>
<tbody>${grouped.map(s=>`<tr><td>${fullDate(s.date)}</td><td><button data-go-week="${H.weekOf(s.date)}">W${H.weekOf(s.date)}</button></td><td>${s.parts.map(p=>H.time(p.start)+'–'+H.time(p.end)).join('<br>')}</td><td>${s.label}</td></tr>`).join('')}</tbody>
</table>
</div>
<div class="dialog-foot">
<span class="small">Schedules are subject to change.</span>
<button class="primary" data-detail-add="${c.id}" ${selected?.id===id?'disabled':''}>${selected?.id===id?'Selected in your plan':selected?'Switch to G'+c.group:'Add to timetable'}</button>
</div>`;
  const dialog=document.getElementById('detail-dialog');
  if(!dialog.open)dialog.showModal();
}
function download(content,name,type){
  const url=URL.createObjectURL(new Blob([content],{
    type
  }));
  const a=document.createElement('a');
  a.href=url;
  a.download=name;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function sharePayload(){
  const text=JSON.stringify(plan);
  return btoa(String.fromCharCode(...new TextEncoder().encode(text))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}
function importShare(){
  const hash=location.hash;
  const marker=hash.indexOf('?plan=');
  if(marker<0)return;
  try{
    const encoded=hash.slice(marker+6);
    if(encoded.length>20000)throw Error('Too long');
    const json=new TextDecoder().decode(Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0)));
    const imported=H.normalizePlan(JSON.parse(json),catalogue);
    const saved=JSON.stringify(plan);
    if(plan.selected.length&&saved!==JSON.stringify(imported)){
      // Never overwrite an existing plan silently.
      showImportPreview(imported,'shared link');
    } else{
      plan=imported;
      sample=false;
      save();
      toast('Shared plan loaded.');
    }
  } catch{
    toast('This shared plan could not be read. Your current plan is unchanged.');
  }
  history.replaceState(null,'',location.pathname+location.search+'#timetable');
}
function showImportPreview(imported,source){
  document.getElementById('detail-content').innerHTML=`<div class="dialog-head">
<button class="icon-button dialog-close" data-close aria-label="Close import preview">${icon('x')}</button>
<h2 id="detail-title">Load a plan?</h2>
</div>
<div class="dialog-body">
<p>The ${escape(source)} contains ${imported.selected.length} course offerings. Loading it replaces the current plan on this device.</p>
<ul>${imported.selected.map(s=>`<li class="small">${escape(s.id+' · '+getCourse(s.id).name)}${s.hidden?' (hidden)':''}</li>`).join('')}</ul>
<p>You can export your current plan first if you want to keep both.</p>
</div>
<div class="dialog-foot">
<button data-export="json">Export current plan</button>
<button class="primary" id="confirm-import">Load this plan</button>
</div>`;
  const dialog=document.getElementById('detail-dialog');
  if(!dialog.open)dialog.showModal();
  document.getElementById('confirm-import').onclick=()=>{
    plan=imported;
    sample=false;
    dialog.close();
    update();
    toast('Plan loaded.');
  };
}
// Embedded PDFs must open as Blob URLs: browsers block top-level data-URL navigation.
let sourceObjectUrl = null;
function openSource(index) {
  const source = CATALOGUE.sources[index];
  if (!source) return;
  const embedded = window.SOURCE_PDFS?.[source.filename] || source.url;
  if (!embedded.startsWith("data:application/pdf;base64,")) {
    window.open(source.url, "_blank", "noopener");
    return;
  }
  const bytes = Uint8Array.from(atob(embedded.split(",")[1]), ch => ch.charCodeAt(0));
  if (sourceObjectUrl) URL.revokeObjectURL(sourceObjectUrl);
  sourceObjectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  document.getElementById('detail-content').innerHTML = `
    <div class="dialog-head"><button class="icon-button dialog-close" data-close aria-label="Close PDF">${icon('x')}</button><h2 id="detail-title">${escape(source.title)}</h2></div>
    <div class="dialog-body"><p>If your browser cannot display the PDF here, use Download PDF to open it in your PDF reader.</p>
    <a class="pdf-download" href="${sourceObjectUrl}" download="${escape(source.filename)}">Download PDF</a>
    <iframe class="source-pdf" title="${escape(source.title)}" src="${sourceObjectUrl}"></iframe></div>`;
  const dialog = document.getElementById('detail-dialog');
  if (!dialog.open) dialog.showModal();
}
function currentViewCanvas() {
  return createScheduleCanvas({ courses: selectedCourses(), view, week, weekends });
}
function saveView(format) {
  try {
    const canvas = currentViewCanvas();
    const name = `hec-spring-2027-${view}${view==='weekly' && week!=='all' ? '-week-'+week : ''}`;
    if (format === 'pdf') download(schedulePdf(canvas), name+'.pdf', 'application/pdf');
    else canvas.toBlob(blob => {
      if (blob) download(blob,name+'.png','image/png');
      else toast('Unable to create the image. Please try PDF export.');
    },'image/png');
    toast('Preparing '+format.toUpperCase()+' download.');
  } catch (error) { toast('Export could not be prepared: '+error.message); }
}
function printView() {
  document.getElementById('detail-content').innerHTML = `<div class="dialog-head"><button class="icon-button dialog-close" data-close aria-label="Close export options">${icon('x')}</button><h2 id="detail-title">Print or save this view</h2></div><div class="dialog-body"><p>Download your current ${view==='calendar'?'four-month calendar':'weekly timetable'} as a PDF or PNG. Hidden courses are excluded. You can print the PDF in your PDF reader.</p><div class="export-options"><button class="primary" data-save-view="pdf">Download PDF</button><button data-save-view="png">Download PNG</button><button data-browser-print>Open browser print dialog</button></div><p>If this preview blocks printing, use Download PDF.</p></div>`;
  document.getElementById('detail-dialog').showModal();
}
async function sharePlan() {
  const hosted = /^https?:$/.test(location.protocol);
  const url = hosted ? location.href.split('#')[0]+'#timetable?plan='+sharePayload() : '';
  document.getElementById('detail-content').innerHTML = `<div class="dialog-head"><button class="icon-button dialog-close" data-close aria-label="Close sharing">${icon('x')}</button><h2 id="detail-title">Share your plan</h2></div><div class="dialog-body">${hosted ? `<p id="copy-status">Copy this link to share your course selections.</p><textarea id="share-url" readonly aria-label="Plan link">${escape(url)}</textarea><button data-copy-link>Copy link</button>` : '<p>A public plan link is available when this planner is hosted at a website address. For this downloaded copy, share your selections using Export plan (.json).</p><button data-export="json">Export plan (.json)</button>'}</div>`;
  document.getElementById('detail-dialog').showModal();
  if (hosted) await copyPlanLink(url);
}
async function copyPlanLink(url) {
  const field = document.getElementById('share-url');
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url || field.value);
    document.getElementById('copy-status').textContent = 'Link copied. Anyone with this link can see your course selections.';
  } catch {
    field.focus(); field.select();
    document.getElementById('copy-status').textContent = 'Select and copy the link below (Ctrl+C or ⌘C).';
  }
}
document.addEventListener('click',async e=>{
  const sourceLink = e.target.closest('a[data-source]');
  if (sourceLink) {
    e.preventDefault();
    openSource(Number(sourceLink.dataset.source));
    return;
  }
  const dateCell = e.target.closest('.calendar-day[data-expand-week]');
  if (dateCell && !e.target.closest('[data-detail]')) {
    const number = Number(dateCell.dataset.expandWeek);
    if (number >= 1 && number <= 16) { week = number; view = 'weekly'; render(); }
    return;
  }
  const b=e.target.closest('button');if(b){
    if(b.hasAttribute('data-add'))addCourse(b.dataset.add);if(b.hasAttribute('data-remove'))removeCourse(b.dataset.remove);if(b.hasAttribute('data-hide')){
      const s=plan.selected.find(s=>s.id===b.dataset.hide);s.hidden=!s.hidden;update();
    }
    if(b.hasAttribute('data-color')){
      const s=plan.selected.find(s=>s.id===b.dataset.color);let i=H.palette.indexOf(s.color);do{
        i=(i+1)%H.palette.length;
      }
      while(plan.selected.some(other=>other!==s&&other.color===H.palette[i]));s.color=H.palette[i];update();
    }
    if(b.hasAttribute('data-detail'))showDetail(b.dataset.detail);if(b.hasAttribute('data-close'))document.getElementById('detail-dialog').close();if(b.hasAttribute('data-detail-add')){
      const id=b.dataset.detailAdd;addCourse(id);showDetail(id);
    }
    if(b.hasAttribute('data-card-add')){
      const select=document.getElementById('group-'+b.dataset.cardAdd);addCourse(select?.value||b.dataset.default);
    }
    if(b.hasAttribute('data-sample'))useSample();if (b.hasAttribute('data-clear')) requestClearPlan();
    if (b.hasAttribute('data-keep-removal')) { pendingRemoval = null; document.getElementById('mandatory-dialog').close(); }
    if (b.hasAttribute('data-confirm-removal')) confirmRemoval();
    if(b.hasAttribute('data-view')){
      view=b.dataset.view;render();
    }
    if(b.hasAttribute('data-prev')){
      week=Math.max(1,Number(week)-1);render();
    }
    if(b.hasAttribute('data-next')){
      week=week==='all'?1:Math.min(16,Number(week)+1);render();
    }
    if(b.hasAttribute('data-expand-week')||b.hasAttribute('data-go-week')){
      week=Number(b.dataset.expandWeek||b.dataset.goWeek);view='weekly';document.getElementById('detail-dialog').close();if(page()!=='timetable')location.hash='#timetable';else render();window.scrollTo({
        top:0,behavior:'smooth'
      });
    }
    if(b.hasAttribute('data-reset-filters')){
      query='';typeFilter=requiredFilter='all';weekFilter=[];render();
    }
    if(b.hasAttribute('data-print')) printView();
    if(b.hasAttribute('data-save-view')) saveView(b.dataset.saveView);
    if(b.hasAttribute('data-browser-print')) { document.getElementById('detail-dialog').close(); window.print(); }
    if(b.hasAttribute('data-copy-link')) await copyPlanLink();
    if(b.hasAttribute('data-export')){
      if(b.dataset.export==='ics'){
        if(!plan.selected.length){
          toast('Add a course before exporting a calendar.');return;
        }
        download(H.ics(selectedCourses()),'hec-spring-2027.ics','text/calendar;charset=utf-8');
      } else download(JSON.stringify({
        ...plan,catalogueVersion:CATALOGUE.version
      },null,2),'hec-spring-2027-plan.json','application/json');toast('Export prepared.');
    }
    if(b.hasAttribute('data-import'))document.getElementById('import-file').click();if(b.hasAttribute('data-share')) await sharePlan();
  }
  if(!e.target.closest('.search-wrap')){
    const results=document.getElementById('search-results');if(results){
      results.hidden=true;document.getElementById('quick-search').setAttribute('aria-expanded','false');
    }
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='quick-search')quickResults(e.target.value);if(e.target.id==='catalogue-search'){
    query=e.target.value;renderCards();
  }
});
document.addEventListener('change',async e=>{
  if(e.target.id==='week-select'){
    week=e.target.value==='all'?'all':Number(e.target.value);render();
  }
  if(e.target.id==='weekends'){
    weekends=e.target.checked;render();
  }
  if(e.target.id==='type-filter'){
    typeFilter=e.target.value;renderCards();
  }
  if(e.target.id==='required-filter'){
    requiredFilter=e.target.value;renderCards();
  }
  if (e.target.matches('[data-week-option]')) {
    const chosen = e.target.dataset.weekOption;
    if (chosen === 'all') weekFilter = [];
    else { const number = Number(chosen); weekFilter = e.target.checked ? [...new Set([...weekFilter, number])] : weekFilter.filter((item) => item !== number); }
    renderCards();
  }
  if(e.target.id.startsWith('group-')){
    const c=getCourse(e.target.value);if(selectedFor(c.code))addCourse(c.id);else{
      const card=e.target.closest('.course-card');card.querySelector('[data-detail]').dataset.detail=c.id;const info=card.querySelector('.card-info');info.innerHTML=`<span>◷ ${range(c)}</span>
<span>W${H.weekLabel(H.weeks(c))}</span>
<span>${c.sessions.length} sessions</span>`;
    }
  }
  if(e.target.id==='import-file'){
    const f=e.target.files[0];if(!f)return;try{
      if(f.size>100000)throw Error('Too large');const imported=H.normalizePlan(JSON.parse(await f.text()),catalogue);showImportPreview(imported,'saved file');
    } catch{
      toast('Unable to read this plan. Please choose a valid planner JSON file under 100 KB.');
    }
    e.target.value='';
  }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    const results=document.getElementById('search-results');if(results)results.hidden=true;document.getElementById('quick-search')?.setAttribute('aria-expanded','false');
  }
  if(e.key==='/'&&!/input|textarea|select/i.test(document.activeElement.tagName)&&!document.getElementById('detail-dialog').open){
    e.preventDefault();document.getElementById(page()==='courses'?'catalogue-search':'quick-search')?.focus();
  }
  if(e.key==='Enter'&&e.target.id==='quick-search'){
    const first=document.querySelector('#search-results button[data-add]:not([disabled])');if(first)first.click();
  }
});
document.getElementById('detail-dialog').addEventListener('click',e=>{
  if(e.target===e.currentTarget){
    const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();
  }
});
window.addEventListener('hashchange',()=>{
  importShare();render();
});
importShare();
render();
