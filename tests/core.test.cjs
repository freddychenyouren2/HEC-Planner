const {test}=require('node:test');
const assert=require('node:assert/strict');
const H=require('../core.js');
const data=require('../data.json');
const courses=data.courses;
const c=id=>courses.find(c=>c.id===id);
const session=(date,start,end)=>({date,start,end,label:'Class'});
const fake=(id,sessions)=>({id,code:id,kind:'course',ects:3,sessions});
test('catalogue has 21 subjects, 25 alternatives, 206 deduplicated dated sessions',()=>{
 assert.equal(courses.length,25);assert.equal(new Set(courses.map(c=>c.code)).size,21);
 assert.equal(courses.reduce((n,c)=>n+c.sessions.length,0),206);
 for(const c of courses){assert.equal(new Set(c.sessions.map(s=>[s.date,s.start,s.end].join('|'))).size,c.sessions.length);for(const s of c.sessions){assert.equal(s.week,H.weekOf(s.date));assert(s.start>=480&&s.end<=1140);assert(s.start<s.end);assert(s.date>='2027-01-11'&&s.date<='2027-04-30');}}
});
test('teaching weeks start on Jan 11, stay continuous over holidays and DST',()=>{
 for(const [date,week] of [['2027-01-10',0],['2027-01-11',1],['2027-01-17',1],['2027-01-18',2],['2027-02-01',4],['2027-03-28',11],['2027-03-29',12],['2027-04-30',16]])assert.equal(H.weekOf(date),week,date);
 assert.equal(H.monday('2027-03-28'),'2027-03-22');assert.equal(H.monday('2027-01-01'),'2026-12-28');assert.equal(H.addDays('2027-03-28',1),'2027-03-29');
});
test('groups count once; missing ECTS remain unknown, hidden credits still count',()=>{
 const t=H.credits([c('C1-G1'),c('C1-G2'),{...c('C6'),hidden:true},c('S1-G1'),c('S1-G2'),c('S3-G1'),c('S5')]);
 assert.deepEqual(t,{course:11,seminar:.25,unknown:2,total:11.25});assert.equal(c('C12').ects,6);
});
test('co-teaching duplicates are merged and exam/nonstandard times retained',()=>{
 assert.equal(c('S5').sessions.length,2);assert.equal(c('S5').sessions[0].teachers.length,3);
 const exam=c('C4').sessions.find(s=>s.label==='Exam');assert.deepEqual([exam.date,exam.start,exam.end],['2027-03-24',870,960]);
 assert(c('C9').sessions.some(s=>s.start===840));assert(c('C12').sessions.some(s=>s.start===630));
});
test('clashes require actual intersecting dates and exclude adjacent time boundaries',()=>{
 const a=fake('A',[session('2027-01-11',480,570)]);
 assert.equal(H.conflicts([a,fake('B',[session('2027-01-18',480,570)])]).length,0);
 assert.equal(H.conflicts([a,fake('B',[session('2027-01-11',570,660)])]).length,0);
 const clash=H.conflicts([a,{...fake('B',[session('2027-01-11',540,600)]),hidden:true}]);assert.equal(clash.length,1);assert.equal(clash[0].start,540);assert.equal(clash[0].end,570);
 assert.equal(H.conflicts([c('C6'),c('C8')]).length,1);
});
test('only exact ten-minute breaks connect; lunch and exam boundaries stay separate',()=>{
 const a=fake('A',[session('2027-01-11',480,570),session('2027-01-11',580,670),session('2027-01-11',780,870)]);
 const blocks=H.groupedSessions(a);assert.equal(blocks.length,2);assert.equal(blocks[0].parts.length,2);assert.equal(blocks[0].end,670);
 assert.equal(H.groupedSessions(c('C1-G1')).length,10);
 const exam=fake('B',[session('2027-01-11',480,570),{...session('2027-01-11',580,670),label:'Exam'}]);assert.equal(H.groupedSessions(exam).length,2);
});
test('all-week aggregation preserves date sets and disconnected teaching weeks',()=>{
 const a=fake('A',[session('2027-01-11',480,570),session('2027-01-25',480,570)]);
 const b=H.blocks([a]);assert.equal(b.length,1);assert.deepEqual(b[0].weeks,[1,3]);assert.equal(b[0].dates.length,2);
 assert.equal(H.blocks([a],2).length,0);assert.equal(H.blocks([a],3).length,1);assert.equal(H.weekLabel([1,2,3,5,7,8]),'1–3, 5, 7–8');
});
test('interval layout prevents blocks from covering one another, including connected clusters',()=>{
 const b=H.layout([{start:0,end:100},{start:10,end:20},{start:20,end:40},{start:110,end:120}]);
 assert.equal(b[0].lanes,2);assert.equal(b[3].lanes,1);
 for(let i=0;i<b.length;i++)for(let j=i+1;j<b.length;j++)if(b[i].start<b[j].end&&b[j].start<b[i].end)assert.notEqual(b[i].lane,b[j].lane);
});
test('imported plans validate IDs, deduplicate group choices and assign unique safe colours',()=>{
 assert.throws(()=>H.normalizePlan({},courses));const plan=H.normalizePlan({selected:[{id:'C1-G1',color:'red'},{id:'C1-G2'},{id:'C6',color:H.palette[0]},{id:'missing'},{id:'S8',hidden:true,color:H.palette[0]}]},courses);
 assert.equal(plan.selected.length,3);assert.equal(new Set(plan.selected.map(s=>s.color)).size,3);assert(plan.selected.every(s=>H.palette.includes(s.color)));assert.equal(plan.selected[2].hidden,true);assert.equal(H.palette.length,25);assert.equal(new Set(H.palette).size,25);
});
test('ICS keeps each original session, local Paris timezone, DST rules and UTF-8 folding',()=>{
 const ics=H.ics([c('C1-G1'),c('C4')]);assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,33);assert(ics.includes('TZID:Europe/Paris'));assert(ics.includes('BYMONTH=3;BYDAY=-1SU'));assert(ics.includes('DTSTART;TZID=Europe/Paris:20270324T143000'));assert(ics.includes('DTEND;TZID=Europe/Paris:20270324T160000'));for(const line of ics.split('\r\n'))assert(Buffer.byteLength(line,'utf8')<=75);
});
