# Catalogue data audit

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
| C1-G1 | Global Leadership | Yes | 6 | 2027-03-17 – 2027-04-13 | 10–14 | 20 | 56 |
| C1-G2 | Global Leadership | Yes | 6 | 2027-03-19 – 2027-04-15 | 10–14 | 20 | 57 |
| C2 | Business, Geopolitics and the Changing Global Environment | No | 3 | 2027-03-02 – 2027-03-31 | 8–10, 12 | 8 | 58 |
| C3 | Diversity, Equity and Inclusiveness (DEI) | No | 3 | 2027-01-27 – 2027-03-10 | 3–5, 7–9 | 12 | 59 |
| C4 | Firms’ Accounts, M&A and Restructuring | No | 3 | 2027-02-04 – 2027-03-24 | 4–5, 7–11 | 13 | 60 |
| C5 | International Impact Investing: Cross-National Strategies for Social and Environmental Change | No | 3 | 2027-01-29 – 2027-02-12 | 3–5 | 12 | 61 |
| C6 | Investment Banking | No | 5 | 2027-01-18 – 2027-03-26 | 2–11 | 20 | 62 |
| C7 | Luxury Management | No | 3 | 2027-02-22 – 2027-03-11 | 7, 9 | 12 | 63 |
| C8 | Mega Trends | No | 3 | 2027-02-01 – 2027-02-08 | 4–5 | 12 | 64 |
| C9 | Sociopolitical Strategies in Emerging Markets | No | 3 | 2027-02-23 – 2027-03-05 | 7–8 | 12 | 65 |
| C10 | Strategy and Leadership in Professional and Financial Services | No | 3 | 2027-02-09 – 2027-02-18 | 5–6 | 12 | 66 |
| C11 | Technology Strategy: Platforms, Data Analytics & AI (Data Analytics) | No | 5 | 2027-03-04 – 2027-04-02 | 8–12 | 16 | 67 |
| C12 | The Future of Money: Innovation and Policy | No | 6 | 2027-04-09 – 2027-04-16 | 13–14 | 5 | 68 |
| S1-G1 | Prevent: Sexual & Gender Based Violence | Yes | 0.25 | 2027-01-12 – 2027-01-12 | 1 | 2 | 35 |
| S1-G2 | Prevent: Sexual & Gender Based Violence | Yes | 0.25 | 2027-01-12 – 2027-01-12 | 1 | 2 | 35 |
| S2-G1 | Strategic Compliance and Economic Warfare | Yes | 0.25 | 2027-01-12 – 2027-01-12 | 1 | 2 | 35 |
| S2-G2 | Strategic Compliance and Economic Warfare | Yes | 0.25 | 2027-01-12 – 2027-01-12 | 1 | 2 | 35 |
| S3-G1 | Mastering and Navigating BP | Yes | Unknown | 2027-01-25 – 2027-01-25 | 3 | 4 | 36 |
| S3-G2 | Mastering and Navigating BP | Yes | Unknown | 2027-01-26 – 2027-01-26 | 3 | 4 | 36 |
| S4 | CEMS Global Citizenship Seminar: Hacking the SDGs with a BHR Lens | Yes | 1 | 2027-01-21 – 2027-01-22 | 2 | 4 | 36 |
| S5 | An Introduction to Worlds: Seeing Strategy Beyond Markets | No | Unknown | 2027-01-13 – 2027-01-13 | 1 | 2 | 37 |
| S6 | CEMS Practical Negotiation | No | 0.5 | 2027-02-16 – 2027-02-16 | 6 | 2 | 37 |
| S7 | CEMS Practical Sales | No | 0.5 | 2027-02-16 – 2027-02-16 | 6 | 2 | 37 |
| S8 | Designing Your Career Through LinkedIn | No | 0.25 | 2027-01-15 – 2027-01-15 | 1 | 2 | 37 |
| S9 | Digital Sales Bootcamp | No | 0.5 | 2027-03-01 – 2027-03-03 | 8 | 4 | 37 |

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
| 1 | 2027-01-11 | 2027-01-17 |
| 2 | 2027-01-18 | 2027-01-24 |
| 3 | 2027-01-25 | 2027-01-31 |
| 4 | 2027-02-01 | 2027-02-07 |
| 5 | 2027-02-08 | 2027-02-14 |
| 6 | 2027-02-15 | 2027-02-21 |
| 7 | 2027-02-22 | 2027-02-28 |
| 8 | 2027-03-01 | 2027-03-07 |
| 9 | 2027-03-08 | 2027-03-14 |
| 10 | 2027-03-15 | 2027-03-21 |
| 11 | 2027-03-22 | 2027-03-28 |
| 12 | 2027-03-29 | 2027-04-04 |
| 13 | 2027-04-05 | 2027-04-11 |
| 14 | 2027-04-12 | 2027-04-18 |
| 15 | 2027-04-19 | 2027-04-25 |
| 16 | 2027-04-26 | 2027-05-02 |
