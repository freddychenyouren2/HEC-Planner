/* Pure, dependency-free scheduling functions shared by the browser and Node tests. */
(function(root){
  'use strict';
  const ANCHOR='2027-01-11', DAY=86400000;
  const palette=['#4668c9','#258474','#b56a35','#8a56ae','#b64f70','#327f9d','#6b7d35','#b25645','#6260ac','#997633','#277c87','#a85890','#507648','#ab5b29','#536c98','#a24752','#81783e','#536cb6','#936942','#4d847b','#885e88','#357b57','#ad605e','#7061a0','#477391'];
  const dateUTC=d=>new Date(d+'T12:00:00Z');
  const iso=d=>d.toISOString().slice(0,10);
  function addDays(d,n){
    const a=dateUTC(d);a.setUTCDate(a.getUTCDate()+n);return iso(a);
  }
  function weekOf(d){
    return Math.floor((dateUTC(d)-dateUTC(ANCHOR))/DAY/7)+1;
  }
  function monday(d){
    return addDays(d,-((dateUTC(d).getUTCDay()+6)%7));
  }
  function weekday(d){
    return (dateUTC(d).getUTCDay()+6)%7;
  }
  function time(m){
    return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  }
  function weeks(c){
    return [...new Set(c.sessions.map(s=>weekOf(s.date)))].sort((a,b)=>a-b);
  }
  function weekLabel(ns){
    if(!ns.length)return '';const runs=[];let start=ns[0],prev=start;for(const n of ns.slice(1)){
      if(n===prev+1){
        prev=n;continue;
      }
      runs.push(start===prev?`${start}`:`${start}–${prev}`);start=prev=n;
    }
    runs.push(start===prev?`${start}`:`${start}–${prev}`);return runs.join(', ');
  }
  function credits(courses){
    const result={
      course:0,seminar:0,unknown:0
    };const seen=new Set();for(const c of courses){
      if(seen.has(c.code))continue;seen.add(c.code);if(c.ects==null)result.unknown++;else result[c.kind]+=c.ects;
    }
    result.total=result.course+result.seminar;return result;
  }
  function conflicts(courses){
    const items=courses.flatMap(c=>c.sessions.map(s=>({
      ...s,course:c
    }))).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);const out=[];for(let i=0;i<items.length;i++){
      const a=items[i];for(let j=i+1;j<items.length;j++){
        const b=items[j];if(b.date!==a.date||b.start>=a.end)break;if(a.course.id!==b.course.id)out.push({
          date:a.date,start:Math.max(a.start,b.start),end:Math.min(a.end,b.end),a:a.course,b:b.course
        });
      }
    }
    return out;
  }
  function groupedSessions(c){
    const days={
    };for(const s of c.sessions){
      (days[s.date]??=[]).push(s);
    }
    const result=[];for(const sessions of Object.values(days)){
      sessions.sort((a,b)=>a.start-b.start);let current;for(const s of sessions){
        if(current&&s.start-current.end===10&&s.label===current.label){
          current.parts.push(s);current.end=s.end;
        } else{
          current={
            date:s.date,start:s.start,end:s.end,label:s.label,parts:[s],course:c
          };result.push(current);
        }
      }
    }
    return result;
  }
  function blocks(courses,week='all'){
    const blocks=courses.flatMap(groupedSessions).filter(b=>week==='all'||weekOf(b.date)===Number(week));if(week!=='all')return blocks.map(b=>({
      ...b,dates:[b.date],weeks:[weekOf(b.date)],day:weekday(b.date)
    }));const unique=new Map();for(const b of blocks){
      const key=[b.course.id,weekday(b.date),b.label,b.parts.map(p=>`${p.start}-${p.end}`).join('/')].join('|');if(unique.has(key)){
        const v=unique.get(key);v.dates.push(b.date);v.weeks=[...new Set([...v.weeks,weekOf(b.date)])].sort((a,b)=>a-b);
      } else unique.set(key,{
        ...b,dates:[b.date],weeks:[weekOf(b.date)],day:weekday(b.date)
      });
    }
    return [...unique.values()];
  }
  function layout(items){
    const sorted=items.map(x=>({
      ...x
    })).sort((a,b)=>a.start-b.start||b.end-a.end);let cluster=[],edge=-1;const result=[];function flush(){
      const laneEnds=[];for(const b of cluster){
        let lane=laneEnds.findIndex(e=>e<=b.start);if(lane<0)lane=laneEnds.length;laneEnds[lane]=b.end;b.lane=lane;
      }
      for(const b of cluster){
        b.lanes=laneEnds.length;result.push(b);
      }
      cluster=[];
    }
    for(const b of sorted){
      if(b.start>=edge){
        flush();edge=-1;
      }
      cluster.push(b);edge=Math.max(edge,b.end);
    }
    flush();return result;
  }
  function normalizePlan(value,catalogue){
    if(!value||!Array.isArray(value.selected))throw new Error('Invalid plan');const seen=new Set();const selected=[];for(const entry of value.selected){
      const c=catalogue.find(c=>c.id===entry?.id);if(!c||seen.has(c.code))continue;seen.add(c.code);selected.push({
        id:c.id,hidden:entry.hidden===true,color:palette.includes(entry.color)?entry.color:palette.find(p=>!selected.some(s=>s.color===p))||palette[0]
      });
    }
    // imported duplicate colours are reassigned
    const used=new Set();for(const s of selected){
      if(used.has(s.color))s.color=palette.find(p=>!used.has(p))||s.color;used.add(s.color);
    }
    return {
      version:1,selected
    };
  }
  function ics(courses){
    const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');const stamp=(d,m)=>d.replaceAll('-','')+'T'+time(m).replace(':','')+'00';const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//HEC Planner//Spring 2027//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VTIMEZONE','TZID:Europe/Paris','BEGIN:DAYLIGHT','DTSTART:19700329T020000','TZOFFSETFROM:+0100','TZOFFSETTO:+0200','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU','END:DAYLIGHT','BEGIN:STANDARD','DTSTART:19701025T030000','TZOFFSETFROM:+0200','TZOFFSETTO:+0100','RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU','END:STANDARD','END:VTIMEZONE'];const now=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');for(const c of courses)for(const s of c.sessions)lines.push('BEGIN:VEVENT',`UID:${c.id}-${s.date}-${s.start}@hec-planner`,`DTSTAMP:${now}`,`DTSTART;TZID=Europe/Paris:${stamp(s.date,s.start)}`,`DTEND;TZID=Europe/Paris:${stamp(s.date,s.end)}`,`SUMMARY:${esc(c.code+' '+c.name+(c.group?' G'+c.group:'')+(s.label==='Exam'?' · Exam':''))}`,`DESCRIPTION:${esc('Week '+weekOf(s.date)+'. '+c.teacher+'. Unofficial schedule; verify with HEC.')}`,'END:VEVENT');lines.push('END:VCALENDAR'); // Fold at UTF-8 octet boundaries (RFC 5545).
    return lines.map(line=>{
      let chunks=[],chunk='',bytes=0;for(const char of line){
        const n=new TextEncoder().encode(char).length;if(bytes+n>75){
          chunks.push(chunk);chunk=' ';bytes=1;
        }
        chunk+=char;bytes+=n;
      }
      chunks.push(chunk);return chunks.join('\r\n');
    }).join('\r\n')+'\r\n';
  }
  const api={
    ANCHOR,palette,addDays,weekOf,monday,weekday,time,weeks,weekLabel,credits,conflicts,groupedSessions,blocks,layout,normalizePlan,ics
  };root.HECCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
