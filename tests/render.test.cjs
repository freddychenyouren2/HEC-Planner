/* Smoke-tests app rendering in a minimal DOM shell. This is NOT a layout/browser test. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const H=require('../core.js');
const data=require('../data.json');
function setup(hash='#timetable'){
 const elements=new Map();const node=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},getBoundingClientRect(){return {left:0,top:0,right:700,bottom:700};}});return elements.get(id);};
 const handlers={};const storage=new Map();const document={getElementById:node,querySelectorAll:()=>[],addEventListener(type,handler){handlers[type]=handler;},activeElement:{tagName:'BODY'}};
 const context=vm.createContext({HECCore:H,CATALOGUE:data,document,location:{hash,pathname:'/',search:'',protocol:'https:',href:'https://example.test/'+hash},history:{replaceState(){}},window:{addEventListener(){},scrollTo(){}},navigator:{},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},Intl,Date,URL,Blob,TextEncoder,TextDecoder,Uint8Array,structuredClone,console,setTimeout:()=>1,clearTimeout(){},btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')});
 vm.runInContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),context);
 return {run:code=>vm.runInContext(code,context),node,handlers};
}
test('first launch populates all mandatory subjects',()=>{const {node,run}=setup();const html=node('app').innerHTML;assert.equal(run('plan.selected.length'),5);assert(run('selectedCourses().every(course=>course.mandatory)'));assert(html.includes('1900'));assert(html.includes('0800'));assert(html.includes('data-view="calendar"'));});
test('catalogue renders 21 subject cards, groups, mandatory labels and unknown credits',()=>{const {node}=setup('#courses');const html=node('app').innerHTML;assert.equal((html.match(/class="panel course-card/g)||[]).length,21);assert(html.includes('ECTS unknown'));assert(html.includes('◆ Mandatory'));assert(html.includes('id="group-C1"'));});
test('search filters by app code, title and professor; requirements and weeks compose',()=>{const {run}=setup('#courses');assert.equal(run("query='C11';filteredSubjects().length"),1);assert.equal(run("query='Luxury';filteredSubjects()[0][0].code"),'C7');assert.equal(run("query='Pierucci';filteredSubjects()[0][0].code"),'S2');assert.equal(run("query='';typeFilter='seminar';requiredFilter='mandatory';filteredSubjects().length"),4);assert.equal(run("weekFilter=[16];filteredSubjects().length"),0);});
test('four-month calendar includes 7-day rows and week expansion controls',()=>{const {run}=setup();const html=run("view='calendar';calendar()");for(const month of ['January','February','March','April'])assert(html.includes(month));assert.equal((html.match(/class="month"/g)||[]).length,4);assert(html.includes('data-expand-week="1"'));assert(html.includes('data-expand-week="16"'));assert(html.includes('Sun'));});
test('groups replace one another, hidden courses keep ECTS, calendar shows real sessions',()=>{const {run,node}=setup();run("clearPlan();addCourse('C1-G1');addCourse('C1-G2');addCourse('S8')");assert.equal(run('plan.selected.length'),2);assert.equal(run('H.credits(selectedCourses()).total'),6.25);assert.equal(run("plan.selected[0].id"),'C1-G2');run("plan.selected[0].hidden=true;render()");assert(!run('weekly()').includes('data-detail="C1-G2"'));assert.equal(run('H.credits(selectedCourses()).total'),6.25);const html=run('calendar()');assert(html.includes('Designing Your Career Through LinkedIn'));assert(!html.includes('Global Leadership'));assert(node('app').innerHTML.includes('Hidden'));});
test('selected-week rendering excludes other weeks and retains exam label',()=>{const {run}=setup();run("addCourse('C4');week=11");const html=run('weekly()');assert(html.includes('EXAM'));assert(html.includes('14:30–16:00'));run('week=1');assert(!run('weekly()').includes('data-detail="C4"'));});
test('shared plan roundtrip keeps selected ID, hidden state and colours',()=>{const {run}=setup();run("clearPlan();addCourse('C6');addCourse('S8');plan.selected[1].hidden=true");const encoded=run('sharePayload()');const decoded=JSON.parse(Buffer.from(encoded.replaceAll('-','+').replaceAll('_','/'),'base64').toString('utf8'));assert.equal(decoded.selected[0].id,'C6');assert.equal(decoded.selected[1].hidden,true);assert.equal(decoded.selected[0].color,H.palette[0]);});
test('course detail has exact session timings, source page, group and mandatory labels',()=>{const {run,node}=setup();run("showDetail('S1-G2')");const html=node('detail-content').innerHTML;assert(html.includes('G2'));assert(html.includes('Mandatory'));assert(html.includes('page 35'));assert(html.includes('13:30–15:00'));assert(html.includes('15:10–17:10'));assert(html.includes('data-go-week="1"'));assert(node('detail-dialog').open);});

test('every offering opens full course details without throwing',()=>{
  const {run,node}=setup('#courses');
  for (const course of data.courses) {
    run(`showDetail(${JSON.stringify(course.id)})`);
    assert(node('detail-dialog').open);
    assert(node('detail-content').innerHTML.includes('Sessions / hours'));
  }
});
test('catalogue removal of mandatory selections waits for confirmation',()=>{
  const {run,node}=setup('#courses');
  assert(node('app').innerHTML.includes('data-remove="C1-G1"'));
  run("removeCourse('C1-G1')");
  assert(node('mandatory-dialog').open);
  assert.equal(run("plan.selected.some(item=>item.id==='C1-G1')"),true);
  run('confirmRemoval()');
  assert.equal(run("plan.selected.some(item=>item.id==='C1-G1')"),false);
  assert(node('app').innerHTML.includes('data-card-add="C1"'));
});
test('calendar exposes separate detail and week-expansion controls',()=>{
  const {run}=setup(); const html=run('calendar()');
  assert(html.includes('class="calendar-event" data-detail="C1-G1"'));
  assert(html.includes('class="date-num" data-expand-week='));
});
test('both source links open their original PDFs',()=>{
  const {run,node}=setup('#about');
  assert(node('app').innerHTML.includes('data-source="0"'));
  assert(node('app').innerHTML.includes('data-source="1"'));
  run('window.open=(url)=>{window.opened=url};openSource(0)');
  assert.equal(run('window.opened'),data.sources[0].url);
  run('openSource(1)'); assert.equal(run('window.opened'),data.sources[1].url);
});
test('embedded standalone PDF is opened using a browser Blob URL',()=>{
  const {run,node}=setup();
  run("CATALOGUE.sources[0].url='data:application/pdf;base64,JVBERi0xLjc=';window.open=(url)=>{window.opened=url};openSource(0)");
  assert(node("detail-content").innerHTML.includes('src="blob:'));
  assert(node("detail-content").innerHTML.includes("Download PDF"));
  assert(node("detail-dialog").open);
  data.sources[0].url='sources/2026-2027-Spring-Courses-Catalogue.pdf';
});

test('clicking blank calendar cell opens its week',async()=>{
  const {run,handlers}=setup();
  run("view='calendar'");
  const cell={dataset:{expandWeek:'4'}};
  await handlers.click({target:{closest:selector=>selector==='.calendar-day[data-expand-week]'?cell:null}});
  assert.equal(run('week'),4);assert.equal(run('view'),'weekly');
});
test('print action shows PDF and PNG downloads',()=>{
  const {run,node}=setup();run('printView()');
  assert(node('detail-dialog').open);
  assert(node('detail-content').innerHTML.includes('data-save-view="pdf"'));
  assert(node('detail-content').innerHTML.includes('data-save-view="png"'));
});
test('sharing shows a copyable link when clipboard permission is denied',async()=>{
  const {run,node}=setup();
  node('share-url').focus=()=>{};node('share-url').select=()=>{};
  await run('sharePlan()');
  assert(node('detail-dialog').open);
  assert(node('detail-content').innerHTML.includes('#timetable?plan='));
  assert(node('copy-status').textContent.includes('Select and copy'));
});
test('downloaded file sharing offers JSON instead of a non-public file link',async()=>{
  const {run,node}=setup();
  await run("location.protocol='file:';sharePlan()");
  assert(node('detail-content').innerHTML.includes('Export plan (.json)'));
});
