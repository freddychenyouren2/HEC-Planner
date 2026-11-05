/* Local PNG/PDF rendering. No network services or third-party libraries. */
'use strict';
function createScheduleCanvas({ courses, view, week, weekends }) {
  const H = HECCore;
  const canvas = document.createElement('canvas');
  canvas.width = 1800;
  canvas.height = view === 'calendar' ? 2200 : 1500;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const text = (value, x, y, size = 18, color = '#003366', maxWidth) => {
    ctx.font = `${size}px sans-serif`;
    ctx.fillStyle = color;
    let line = String(value);
    if (maxWidth) {
      while (line.length && ctx.measureText(line).width > maxWidth) line = line.slice(0, -1);
      if (line !== String(value)) line = line.slice(0, -1) + '…';
    }
    ctx.fillText(line, x, y);
  };
  const dateLabel = (date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
  text('HEC Planner · Spring 2027', 45, 48, 30);
  text(view === 'calendar' ? 'January–April 2027 · Europe/Paris' : `${week === 'all' ? 'All teaching weeks' : 'Week ' + week} · Europe/Paris`, 45, 82);
  const visible = courses.filter(course => !course.hidden);
  if (view === 'calendar') {
    const sessions = visible.flatMap(H.groupedSessions);
    for (let month = 0; month < 4; month++) {
      const x = 45 + (month % 2) * 870;
      const y = 120 + Math.floor(month / 2) * 930;
      const cellWidth = 120, cellHeight = 140;
      text(['January', 'February', 'March', 'April'][month] + ' 2027', x, y + 28, 25);
      ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach((day, index) => text(day, x + index * cellWidth + 8, y + 60, 17));
      const first = `2027-${String(month + 1).padStart(2, '0')}-01`;
      const start = H.monday(first);
      for (let index = 0; index < 42; index++) {
        const date = H.addDays(start, index);
        const cx = x + index % 7 * cellWidth, cy = y + 75 + Math.floor(index / 7) * cellHeight;
        ctx.strokeStyle = '#d3dce6'; ctx.strokeRect(cx, cy, cellWidth, cellHeight);
        if (date.slice(0, 7) !== first.slice(0, 7)) continue;
        text(Number(date.slice(-2)), cx + 6, cy + 22, 17);
        const items = sessions.filter(item => item.date === date).sort((a,b) => a.start-b.start);
        const itemHeight = Math.min(36, 108 / Math.max(1, items.length));
        items.forEach((item, itemIndex) => {
          const top = cy + 28 + itemIndex * itemHeight;
          ctx.fillStyle = item.course.color; ctx.fillRect(cx + 3, top, 114, itemHeight - 2);
          text(item.course.code + (item.course.group ? ' G' + item.course.group : '') + ' ' + item.course.name, cx + 6, top + 12, 10, '#fff', 108);
          text(H.time(item.start) + '–' + H.time(item.end), cx + 6, top + 24, 10, '#fff', 108);
        });
      }
    }
  } else {
    const days = weekends ? 7 : 5;
    const left = 105, top = 170, gridWidth = 1650, gridHeight = 1120;
    const dayWidth = gridWidth / days;
    const start = week === 'all' ? null : H.addDays(H.ANCHOR, (Number(week)-1)*7);
    ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].slice(0,days).forEach((day,index) => {
      text(day, left + dayWidth * index + 10, top - 35, 20);
      if (start) text(dateLabel(H.addDays(start,index)),left + dayWidth * index + 10,top - 12,15);
      ctx.strokeStyle = '#d3dce6'; ctx.strokeRect(left + dayWidth * index, top, dayWidth, gridHeight);
    });
    for (let minute = 0; minute <= 660; minute += 10) {
      const y = top + minute/660*gridHeight;
      ctx.strokeStyle = minute % 60 ? '#edf1f5' : '#bdcad9';
      ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+gridWidth,y);ctx.stroke();
      if (minute % 60 === 0) text(H.time(480+minute),30,y+5,17);
    }
    const blocks = H.blocks(visible, week);
    for (let day=0;day<days;day++) {
      for (const block of H.layout(blocks.filter(item=>item.day===day))) {
        const x = left + day*dayWidth + block.lane/block.lanes*dayWidth + 3;
        const width = dayWidth/block.lanes-6;
        const y = top + (block.start-480)/660*gridHeight;
        for (const part of block.parts) {
          ctx.fillStyle = block.course.color;
          ctx.fillRect(x,top+(part.start-480)/660*gridHeight,width,(part.end-part.start)/660*gridHeight);
        }
        text(block.course.code + (block.course.group?' G'+block.course.group:''),x+5,y+19,16,'#fff',width-10);
        text(block.course.name,x+5,y+39,13,'#fff',width-10);
        text(H.time(block.start)+'–'+H.time(block.end),x+5,y+57,13,'#fff',width-10);
        text('W'+H.weekLabel(block.weeks),x+5,y+75,12,'#fff',width-10);
      }
    }
  }
  visible.forEach((course,index) => {
    text(course.code+(course.group?' G'+course.group:'')+': '+course.name,45+(index%3)*570,canvas.height-165+Math.floor(index/3)*17,12,'#42566e',550);
  });
  text('Official term: 11 January–16 April · Schedules subject to change · Hidden courses excluded',45,canvas.height-28,16);
  return canvas;
}

function schedulePdf(canvas) {
  // A single-page PDF embeds the canvas as a JPEG; offsets are byte offsets.
  const jpeg = Uint8Array.from(atob(canvas.toDataURL('image/jpeg', 0.95).split(',')[1]), ch=>ch.charCodeAt(0));
  const width = 842, height = Math.round(width*canvas.height/canvas.width);
  const encoder = new TextEncoder();
  const chunks = [], offsets = [0];
  let length = 0;
  const append = value => { const bytes = typeof value === 'string' ? encoder.encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const object = (id, content) => { offsets[id]=length;append(`${id} 0 obj\n${content}\nendobj\n`); };
  append('%PDF-1.4\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4]=length;
  append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  append(jpeg);append('\nendstream\nendobj\n');
  const stream=`q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
  object(5,`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  const xref=length;
  append('xref\n0 6\n0000000000 65535 f \n');
  for(let id=1;id<=5;id++)append(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks,{type:'application/pdf'});
}
