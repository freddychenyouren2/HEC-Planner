#!/usr/bin/env python3
"""Rebuild the catalogue from pdftotext -layout output. Python stdlib + Poppler only.
Usage: python3 scripts/import_catalogues.py /path/to/courses.pdf /path/to/seminars.pdf
Schedules use actual dated annex rows; duplicate co-teacher rows become one session.
"""
import sys, subprocess, re, json, datetime, unicodedata, base64
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
COURSES=[
('Global Leadership',6,'Shirish C. Srivastava',True,'Build cross-cultural leadership competence and lead diverse teams in an international environment.'),
('Business, Geopolitics and the Changing Global Environment',3,'Jeremy Ghez',False,'Understand geopolitical change and its implications for business strategy.'),
('Diversity, Equity and Inclusiveness (DEI)',3,'Matteo M. Winkler',False,'Explore diversity, equity and inclusion in organisations.'),
("Firms’ Accounts, M&A and Restructuring",3,'Olivier Levyne; Hervé Stolowy',False,'Analyse financial accounts, mergers, acquisitions and corporate restructuring.'),
('International Impact Investing: Cross-National Strategies for Social and Environmental Change',3,'Elie Matta',False,'Explore cross-national investment strategies for social and environmental impact.'),
('Investment Banking',5,'Olivier Levyne',False,'Develop hard skills for investment banking and corporate finance.'),
('Luxury Management',3,'Anne Michaut',False,'Explore the distinctive strategic and marketing challenges of luxury businesses.'),
('Mega Trends',3,'Joseph Nehme',False,'Examine major global trends and their implications for businesses and society.'),
('Sociopolitical Strategies in Emerging Markets',3,'Aline Gatignon',False,'Develop strategies for navigating social and political environments in emerging markets.'),
('Strategy and Leadership in Professional and Financial Services',3,'John Mawdsley',False,'Examine strategy and leadership in professional and financial services firms.'),
('Technology Strategy: Platforms, Data Analytics & AI (Data Analytics)',5,'Matthew Yeaton',False,'Explore platforms, network effects, data analytics and AI in technology strategy.'),
('The Future of Money: Innovation and Policy',6,'David Restrepo Amariles',False,'Explore payments, digital assets and the policy implications of financial innovation.')]
SEMINARS=[
('Prevent: Sexual & Gender Based Violence',.25,'Choralyne Dumesnil',True,'Identify, prevent and respond to sexual and gender-based violence.'),
('Strategic Compliance and Economic Warfare',.25,'Frédéric Pierucci',True,'Explore strategic compliance, business crime and economic warfare.'),
('Mastering and Navigating BP',None,'Nils Plambeck',True,'Prepare for business projects through teamwork, communication and interactive workshops.'),
('CEMS Global Citizenship Seminar: Hacking the SDGs with a BHR Lens',1,'Charles Autheman',True,'Apply business and human rights perspectives to the Sustainable Development Goals.'),
('An Introduction to Worlds: Seeing Strategy Beyond Markets',None,'Charlotte Vangsgaard; Sandra Cariglio; Ulysse Demonio',False,'Apply social-science methods to understand human worlds and inform business strategy.'),
('CEMS Practical Negotiation',.5,'Marc Robert',False,'Practise practical negotiation skills through applied exercises.'),
('CEMS Practical Sales',.5,'Marc Robert',False,'Develop practical sales skills through applied exercises.'),
('Designing Your Career Through LinkedIn',.25,'Federico Sbandi',False,'Develop your professional presence and career opportunities through LinkedIn.'),
('Digital Sales Bootcamp',.5,'Edilio Canepa',False,'Explore B2B digital sales, discovery, CRM, lead scoring and solution selling.')]
ROW=re.compile(r'(\d{2}/\d{2}/2027)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{2})H(\d{2})-(\d{2})H(\d{2})\s*(.*)')
ANCHOR=datetime.date(2027,1,11)
def build(pdf,meta,kind):
 text=subprocess.check_output(['pdftotext','-layout',pdf,'-'],text=True)
 pages=text.split('\f'); out=[]; subject=-1
 for page_index,page in enumerate(pages):
  rows=list(ROW.finditer(page))
  if not rows: continue
  # Each courses annex page has one offering. Seminar pages have several sections.
  chunks=[page] if kind=='course' else re.split(r'\n\s*\n(?=[A-ZÀÉ][^\n]+\n\s*(?:Date|\n))',page)
  if kind=='seminar':
   # Locate the header immediately above each Date/Day/Time table, retaining section titles.
   starts=[m.start() for m in re.finditer(r'^.*\S[^\n]*\n\s*Date\s+Day\s+Time slot[^\n]*\n',page,re.M)]
   chunks=[page[a:b] for a,b in zip(starts,starts[1:]+[len(page)])]
  for chunk in chunks:
   matches=list(ROW.finditer(chunk))
   if not matches: continue
   header=chunk[:matches[0].start()]
   groupmatch=re.search(r'(?:GROUP\s+|Group\s+)([12])',header)
   group=int(groupmatch[1]) if groupmatch else None
   if group!=2: subject+=1
   name,ects,teacher,mandatory,description=meta[subject]
   code=('C' if kind=='course' else 'S')+str(subject+1)
   unique={}
   for m in matches:
    date=datetime.datetime.strptime(m[1],'%d/%m/%Y').date()
    assert date.strftime('%A')==m[2],(code,m[1],m[2])
    start=int(m[3])*60+int(m[4]); end=int(m[5])*60+int(m[6]); assert start<end
    key=(date.isoformat(),start,end)
    if key not in unique: unique[key]={'date':key[0],'start':start,'end':end,'week':(date-ANCHOR).days//7+1,'label':'Exam' if 'EXAM' in m[7] else 'Class','teachers':[]}
    if m[7].strip() not in unique[key]['teachers']: unique[key]['teachers'].append(m[7].strip())
   notes=[]
   if ects is None: notes.append('ECTS not specified in the supplied catalogue. Not included in known credit totals; confirm with HEC.')
   if code=='C2': notes.append('The annex also lists two asynchronous entries without dates or times. They are not placed on the timetable.')
   if code=='C12': notes.append('6 ECTS and exact nonstandard times are retained from the supplied catalogue; the syllabus is marked as a prior-year version subject to update.')
   if code=='S8': notes.append('Catalogue credit typo “0,.25” is normalised to 0.25 ECTS.')
   if code=='S1': notes.append('The annex uses the alternate title “Sexual & Gender-Based Violence: CRRR Condemn, React, Rescue, Repair”.')
   out.append(dict(id=code+(f'-G{group}' if group else ''),code=code,name=name,kind=kind,subtype=('Mandatory seminar' if subject in [2,3] else 'Skill seminar') if kind=='seminar' else ('Mandatory course' if mandatory else 'Course elective'),group=group,ects=ects,teacher=teacher,mandatory=mandatory,description=description,notes=notes,sourcePage=page_index+1,sessions=list(unique.values())))
 assert subject+1==len(meta),(kind,subject,len(meta))
 return out

# Syllabus pages are anchored explicitly because the two PDFs have different
# layouts and several schedules use abbreviated titles. The calendar annex
# remains the source for dated sessions; these pages supply the course text.
SYLLABUS_PAGES={
 'C1':(3,6),'C2':(8,10),'C3':(12,14),'C4':(16,19),'C5':(20,23),
 'C6':(24,26),'C7':(27,31),'C8':(32,38),'C9':(39,41),'C10':(42,45),
 'C11':(46,50),'C12':(51,55),
 'S1':(3,6),'S2':(7,10),'S3':(11,13),'S4':(14,16),'S5':(17,20),
 'S6':(21,23),'S7':(24,26),'S8':(27,31),'S9':(32,34),
}
SYNOPSIS_HEADINGS=(r'SYNOPSIS\s*/\s*OVERVIEW',r'SYNOPSIS',r'PRESENTATION',r'OVERVIEW')
SYNOPSIS_END=(r'OBJECTIFS\s+PEDAGOGIQUES\s*/\s*LEARNING\s+OUTCOMES',
 r'INTENDED\s+LEARNING\s+OBJECTIVES',r'LEARNING\s+OUTCOMES',r'PEDAGOGICAL\s+OBJECTIVES',
 r'DESCRIPTION\s+DETAILLEE\s*/\s*DETAILED\s+DESCRIPTION',r'DETAILED\s+DESCRIPTION',
 r'MATERIEL\s+PEDAGOGIQUE\s*/\s*TEACHING\s+MATERIALS',r'TEACHING\s+METHODS?',
 r'METHODES\s+PEDAGOGIQUES\s*/\s*TEACHING\s+METHODS?')
OUTCOME_HEADINGS=(r'OBJECTIFS\s+PEDAGOGIQUES\s*/\s*LEARNING\s+OUTCOMES',
 r'INTENDED\s+LEARNING\s+OBJECTIVES',r'PEDAGOGICAL\s+OBJECTIVES',r'LEARNING\s+OUTCOMES',
 r'LEARNING\s+OBJECTIVES')
CONTENT_END=(r'CEMS\s+LEARNING\s+OUTCOMES',r'DESCRIPTION\s+DETAILLEE\s*/\s*DETAILED\s+DESCRIPTION',
 r'DETAILED\s+DESCRIPTION',r'MATERIEL\s+PEDAGOGIQUE\s*/\s*TEACHING\s+MATERIALS',
 r'TEACHING\s+METHODS?',r'METHODES\s+PEDAGOGIQUES\s*/\s*TEACHING\s+METHODS?',
 r'COURSEWORK\s*&\s*EVALUATIONS?',r'BIOGRAPHIE')
def heading_pattern(headings):
 return re.compile(r'^\s*(?:'+ '|'.join(headings) + r')\s*:?\s*$',re.I|re.M)
def clean_section(value):
 value=unicodedata.normalize('NFKC',value)
 lines=[]
 for raw in value.splitlines():
  line=re.sub(r'\s+',' ',raw).strip()
  if not line or re.fullmatch(r'(?:\d+|pre-experience|pre-expérience|202[0-9](?:[/-]202[0-9])?|ec ar|da n|up sio|te)',line,re.I): continue
  if lines and lines[-1].endswith('-') and line[:1].islower():
   lines[-1]=lines[-1][:-1]+line
  elif re.match(r'(?:[•●▪◦o]\s+|[-–]\s+|\d+[.)]\s+)',line):
   lines.append('\n'+line)
  else:
   if lines and lines[-1].startswith('\n'): lines[-1]+=' '+line
   elif lines: lines[-1]+=' '+line
   else: lines.append(line)
 return re.sub(r' *\n *','\n', ' '.join(lines)).strip()
def extract_section(text,heading_re,end_re):
 start=heading_re.search(text)
 if not start:return None,None
 tail=text[start.end():]
 end=end_re.search(tail) if end_re else None
 content=clean_section(tail[:end.start()] if end else tail)
 return content,start.group(0).strip().rstrip(':')
def enrich(courses,course_pdf,seminar_pdf):
 page_cache={}
 for kind,path in [('course',course_pdf),('seminar',seminar_pdf)]:
  page_cache[kind]=subprocess.check_output(['pdftotext','-layout',path,'-'],text=True).split('\f')
 for course in courses:
  first,last=SYLLABUS_PAGES[course['code']]
  text='\n'.join(page_cache[course['kind']][first-1:last])
  synopsis,heading=extract_section(text,heading_pattern(SYNOPSIS_HEADINGS),heading_pattern(SYNOPSIS_END))
  # Some seminar records label their synopsis as a short “course overview”.
  if not synopsis and course['code'] in ('S2','S3'):
   synopsis,heading=extract_section(text,re.compile(r'^\s*Course overview(?:\s*\(executive summary\))?\s*:?\s*$',re.I|re.M),heading_pattern(CONTENT_END))
  assert synopsis and len(synopsis)>40,(course['id'],'missing synopsis',first,last)
  course['synopsis']=synopsis
  course['synopsisHeading']=heading
  course['synopsisPage']=first
  course.pop('description',None)
  outcome_pattern=heading_pattern(OUTCOME_HEADINGS)
  outcome,original_heading=extract_section(text,outcome_pattern,heading_pattern(CONTENT_END))
  if outcome and len(outcome)>20:
   # A translated “pedagogical objectives / learning outcomes” heading is one
   # source section; retain it once, under its own original heading.
   bilingual='PEDAGOGIQUES' in original_heading.upper() or 'PEDAGOGICAL' in original_heading.upper() or 'OBJECTIVES' in original_heading.upper()
   if 'PEDAGOGICAL OBJECTIVES' in original_heading.upper() or original_heading.upper()=='INTENDED LEARNING OBJECTIVES':
    course['pedagogicalObjectives']=outcome
    course['pedagogicalObjectivesHeading']=original_heading
   else:
    course['learningOutcomes']=outcome
    course['learningOutcomesHeading']=original_heading
  # Preserve both separate outcome blocks where the PDF provides them.
  if course['code']=='C1':
   cems=re.compile(r'^\s*CEMS\s+LEARNING\s+OUTCOMES\s*:?\s*$',re.I|re.M)
   learning,lab=extract_section(text,cems,heading_pattern((r'TEACHING\s+METHODS?',r'METHODES\s+PEDAGOGIQUES')))
   if learning:
    course['learningOutcomes']=learning;course['learningOutcomesHeading']=lab
   intended,lab=extract_section(text,re.compile(r'^\s*INTENDED\s+LEARNING\s+OBJECTIVES\s*:?\s*$',re.I|re.M),heading_pattern((r'CEMS\s+LEARNING\s+OUTCOMES',)))
   if intended:
    course['pedagogicalObjectives']=intended;course['pedagogicalObjectivesHeading']=lab
  if course['code']=='C12':
   # Page text uses a light watermark that splits the first synopsis word.
   course['synopsis']=course['synopsis'].replace('ec ar Money','Money').replace('ec ar','').strip()
  course['totalSessions']=len(course['sessions'])
  course['totalHours']=round(sum(s['end']-s['start'] for s in course['sessions'])/60,2)
  if course['kind']=='seminar':
   course['subtype']='Mandatory skills seminar' if course['mandatory'] else 'Skills seminar'
 return courses
if __name__=='__main__':
 if len(sys.argv)!=3: sys.exit(__doc__)
 course_pdf,seminar_pdf=sys.argv[1:]
 courses=build(course_pdf,COURSES,'course')+build(seminar_pdf,SEMINARS,'seminar')
 courses=enrich(courses,course_pdf,seminar_pdf)
 data={'version':'2026-11-05','semesterStart':'2027-01-11','semesterEnd':'2027-04-16','calendarEnd':'2027-04-30','timezone':'Europe/Paris',
 'sources':[{'title':'2026–2027 Spring Courses Catalogue','filename':'2026-2027-Spring-Courses-Catalogue.pdf','url':'sources/2026-2027-Spring-Courses-Catalogue.pdf'},
 {'title':'2026–2027 Spring Skill Seminars Catalogue','filename':'2026-2027-Spring-Skill-Seminars-Catalogue.pdf','url':'sources/2026-2027-Spring-Skill-Seminars-Catalogue.pdf'}], 'courses':courses}
 (ROOT/'data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'data.js').write_text('/* Generated by scripts/import_catalogues.py; edit the importer, then rebuild. */\nwindow.CATALOGUE = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n')
 embedded={s['filename']:'data:application/pdf;base64,'+base64.b64encode((ROOT/'sources'/s['filename']).read_bytes()).decode('ascii') for s in data['sources']}
 (ROOT/'sources.js').write_text('/* Embedded original PDFs for offline/static viewing. */\nwindow.SOURCE_PDFS = '+json.dumps(embedded)+';\n')
 print(f'{len(courses)} offerings, {len(set(c["code"] for c in courses))} subjects, {sum(len(c["sessions"]) for c in courses)} dated session blocks')
 for c in courses: print(c['id'],len(c['synopsis']),c.get('learningOutcomesHeading'),c.get('pedagogicalObjectivesHeading'),c['totalHours'])
