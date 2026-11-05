#!/usr/bin/env python3
import json, datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data.json').read_text())
def label(nums):
 out=[]; start=prev=nums[0]
 for n in nums[1:]:
  if n==prev+1:prev=n;continue
  out.append(str(start) if start==prev else f'{start}–{prev}');start=prev=n
 out.append(str(start) if start==prev else f'{start}–{prev}')
 return ', '.join(out)
text='''# Catalogue data audit

Imported 5 November 2026 from the two supplied 2026–2027 Spring catalogues.

- 21 subjects, 25 group offerings, 206 distinct dated sessions.
- Week 1: Monday 11 January–Sunday 17 January 2027. Weeks advance continuously on Mondays, including holidays.
- Formula: `floor((date − 2027-01-11) / 7 days) + 1`, using civil dates rather than elapsed local-time hours.
- All times are Europe/Paris. Session dates are explicit; no weekly recurrence is inferred.
- Courses catalogue schedule annex: PDF pages 56–68. Seminars schedule annex: PDF pages 35–37.
- Course titles follow the contents/syllabus; shortened annex titles are mapped explicitly in the importer.
- Course descriptions in the app are short summaries; source page references point to schedule annexes, not the synopsis pages.

## Offerings

C = course; S = seminar. App codes are arbitrary. G1/G2 are alternatives.

| Code | Name | Mandatory | ECTS | First–last date | Exact active weeks | Sessions | Annex page |
| --- | --- | --- | ---: | --- | --- | ---: | ---: |
'''
for c in data['courses']:
 dates=sorted(s['date'] for s in c['sessions']);weeks=sorted(set(s['week'] for s in c['sessions']))
 text+=f"| {c['id']} | {c['name']} | {'Yes' if c['mandatory'] else 'No'} | {c['ects'] if c['ects'] is not None else 'Unknown'} | {dates[0]} – {dates[-1]} | {label(weeks)} | {len(c['sessions'])} | {c['sourcePage']} |\n"
text+='''
## Exceptions kept visible

1. **S3 Mastering and Navigating BP**: ECTS not specified. Stored as `null`; never silently treated as a confirmed zero.
2. **S5 An Introduction to Worlds**: ECTS not specified. Each dated time appears three times, once per co-teacher. Two unique teaching sessions are retained with all three teachers.
3. **S8 Designing Your Career Through LinkedIn**: the source prints “0,.25”. Normalised to 0.25 ECTS and disclosed in the course notes.
4. **C2 Business, Geopolitics…**: two “asynchronous” entries have no dates/times. Disclosed, not fabricated or placed in the timetable.
5. **C4 Firms’ Accounts…**: the exam on 24 March, 14:30–16:00 (week 11) is retained and labelled as an exam.
6. **C12 The Future of Money**: the supplied syllabus states 6 ECTS, and is a prior-year version marked subject to update. The value is retained with a note rather than changed to a typical elective value.
7. **Nonstandard elective times**: C9 uses 14:00 and 15:40 on some Fridays; C12 uses 09:00, 10:30 and 14:00 as well as 14:40; C4's exam starts at 14:30. The six standard elective start times are not imposed on these exceptions.
8. **Mandatory seminars versus mandatory skills seminars**: S3 and S4 are listed as “Mandatory seminars”, separately from S1 and S2 “Mandatory skill seminars”. The app retains this subtype and includes both in the seminars credit subtotal.
9. **Groups are alternatives**: C1, S1, S2 and S3 have G1/G2. The app allows only one offering per subject. HEC group assignment must still be checked.
10. **Catalogue scope**: mandatory designations follow International Business, not a personalised assessment of any exchange student's requirements.

## Continuous teaching weeks

| Week | Monday | Sunday |
| ---: | --- | --- |
'''
anchor=datetime.date(2027,1,11)
for w in range(1,17):
 start=anchor+datetime.timedelta(days=(w-1)*7)
 text+=f'| {w} | {start} | {start+datetime.timedelta(days=6)} |\n'
(ROOT/'docs/DATA-AUDIT.md').write_text(text)
print('Wrote docs/DATA-AUDIT.md')
