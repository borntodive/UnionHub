# UnionConnect — Use Case Analysis
## Perspective of the Union Representative (Aviation Sector)

**Version:** 1.3
**Date:** February 2026
**Context:** Native mobile app (iOS/Android) for managing CISL union members in the aviation sector

> **NOTE v1.1:** There is no separation between "member" and "user". Each member is a system user who logs in via crewcode. New field **role** (`pilot` / `cabin_crew`) with role-specific grades.
>
> **NOTE v1.2:** **Grades** are now a CRUD entity managed by the SuperAdmin (like Bases and Contracts). Each grade has a code + name and belongs to a `role`.
>
> **NOTE v1.3:** All documentation translated to English. Grade names in English. Migrated to **Expo + React Native** for true native app experience on iOS and Android.

---

## 1. System Actors

| Actor | Description |
|--------|-------------|
| **SuperAdmin** | Central system administrator (CISL national/regional headquarters). Manages structure, configurations, and all data across all roles. Has no assigned professional role. |
| **Admin** | Local union representative (RSA/RSU). Has an assigned **professional role** (`pilot` or `cabin_crew`) and can view/manage **ONLY** members of their own role. |
| **User (Member)** | Worker registered with the union. Each member IS a user (single table). Login via **crewcode + password**. Default password: "password" (mandatory change on first login). Has limited access to their own data. |

> **NOTE v1.1:** There is no separation between "member" and "user". Each member is a system user who logs in via crewcode. New field **role** (`pilot` / `cabin_crew`) with role-specific grades.
>
> **NOTE v1.2:** **Grades** are now a CRUD entity managed by the SuperAdmin (like Bases and Contracts). Each grade has a code + name and belongs to a `role`.
>
> **NOTE v1.3:** All documentation translated to English. Grade names in English. Extensible UI design for future Tools section. Native mobile app with offline support and biometric authentication.

---

## 2. Use Cases by Actor

### 2.1 SuperAdmin

| ID | Use Case | Description |
|----|-----------|-------------|
| SA-01 | Create Admin | Create accounts for new union representatives (RSA/RSU) |
| SA-02 | Manage Admin | Edit, disable, or delete Admin accounts |
| SA-03 | View all members | Full access to all members across all bases |
| SA-04 | Configure bases | Manage the list of operational bases (FCO, MXP, VCE, NAP, CAT, etc.) |
| SA-05 | Configure contracts | Manage contract types (CCNL Naviganti, CCNL Handling, etc.) |
| SA-06 | Configure grades (CRUD) | Manage the list of grades/qualifications (code + name + belonging `role`). Full CRUD as for bases and contracts. Each grade belongs to a `role` (`pilot` or `cabin_crew`). |
| SA-06a | Configure PDF field mappings | Manage extraction mappings per role: map PDF form fields to member fields, configure OCR patterns for scanned documents. Allows different mappings for pilots vs cabin crew. |
| SA-06b | Configure Excel field mappings | Manage column mappings per role for bulk import: map Excel columns to member fields with validation rules. Allows different templates for pilots vs cabin crew. |
| SA-06b | Configure PDF field mappings (v1.3) | Set up field mappings for PDF extraction per role. Maps PDF form field names to member fields. Configure OCR patterns for scanned documents. Allows different mappings for pilots vs cabin crew forms. |
| SA-07 | Global export | Export complete member list in CSV/Excel for national reporting |
| SA-08 | National statistics | View dashboard with member distribution by base, contract, grade |
| SA-09 | Manage communication templates | Create and edit email/WhatsApp templates for standard communications |
| SA-10 | Audit log | View log of all operations (who did what and when) |
| SA-11 | Backup and data restore | Perform periodic database backups |
| SA-12 | Manage global deadlines | Configure contract expiries, membership renewals, membership fees |

### 2.2 Admin (Union Representative — scoped by role)

> **The Admin views and manages ONLY members of their own professional role.** A pilots Admin cannot see cabin crew members and vice versa. The filter is automatically applied by the backend.

| ID | Use Case | Description |
|----|-----------|-------------|
| A-01 | Register new member | Upload PDF form and create member profile (for their own role) |
| A-02 | Search member | Search by first name, last name, crewcode, email |
| A-03 | Filter members | Filter by base, contract, grade, status |
| A-04 | View member profile | See all details of a member |
| A-05 | Edit member | Update data (base change, contract, grade, contact details) |
| A-06 | Deactivate member | Mark as no longer a member (resignation, retirement) |
| A-07 | Contact member | Send individual WhatsApp message or email |
| A-08 | Mass communication | Send message to a filtered group (e.g. all FCO on contract X) |
| A-09 | Create contact list | Create a WhatsApp group or broadcast list from a filtered selection |
| A-10 | View base statistics | Dashboard with members in own area |
| A-11 | Export list | Export filtered list in CSV/Excel/PDF |
| A-12 | Manage notes | Add/edit private notes on a member |
| A-13 | Manage RSA flag | Mark members who are also union representatives |
| A-14 | Manage ITUD flag | Manage ITUD-specific flag (Member on Fixed-Term Unified Contract or similar) |
| A-15 | Import member list | Bulk import from CSV/Excel file with preview, validation, and duplicate handling |
| A-16 | View change history | See changes made to a profile over time |

### 2.3 User (Member)

| ID | Use Case | Description |
|----|-----------|-------------|
| U-01 | View own profile | See own data registered in the system |
| U-02 | Request data change | Notify the Admin of a change (base change, phone number, etc.) |
| U-03 | View communications | Read received union communications |
| U-04 | Download documents | Access relevant union documents (CCNL, circulars, etc.) |
| U-05 | Contact the representative | Send a message to own Admin/RSA |
| U-06 | Mandatory password change | On first login (password="password"), mandatory password change |
| U-07 | Biometric login | Use Face ID/Touch ID for quick secure access (after first login) |

---

## 3. Detailed User Stories

### 3.1 User Stories — SuperAdmin

**SA-US-01: Organisational structure management**
> As a SuperAdmin, I want to configure the bases, contracts, and grades available in the system via CRUD (create, edit, delete), so that Admins can correctly classify members according to the real structure of the company. Grades must be associated with a `role` (`pilot` or `cabin_crew`), and the member form will show only the grades for the selected `role`.

**SA-US-05: Grade management by role**
> As a SuperAdmin, I want to be able to create, edit, and delete professional grades (e.g. Commander, First Officer, Senior Cabin Crew), associating them with the correct `role` (`pilot` or `cabin_crew`), so that qualifications are always aligned with operational and contractual reality.

**SA-US-02: Macro overview**
> As a SuperAdmin, I want to view a dashboard with the total number of members per base, contract, and monthly variation, so that I can monitor the health of the union at national level and identify growing or declining bases.

**SA-US-03: Compliance and audit**
> As a SuperAdmin, I want to access a complete log of all operations (creations, edits, deletions), so that I can respond to any legal or union audit request.

**SA-US-04: Admin management**
> As a SuperAdmin, I want to create and disable Admin accounts, so that only active and authorised representatives can access member data.

### 3.2 User Stories — Admin (Union Representative)

**A-US-01: New member registration via PDF**
> As an Admin, I want to upload the paper membership form (scanned/photographed) and have the system automatically pre-fill the fields via OCR, so that I can register a new colleague in a few minutes after collecting the physical form at the airport.

**A-US-02: Quick search on the go**
> As an Admin, I want to search for a member by typing the crewcode or last name on my smartphone while at the airport, so that I can immediately answer information requests during briefings or in the crew room.

**A-US-03: Filter for base meeting (scoped by role)**
> As a pilots Admin, I want to filter all enrolled pilots at the Rome Fiumicino (FCO) base, so that I can send a specific communication ahead of a pilots union assembly and prepare the list of expected attendees. I must not see cabin crew members.

**A-US-11: Role separation**
> As a pilots Admin, I must not see cabin crew members in my list, so that management is focused and there is no risk of contacting members outside my remit.

**A-US-04: Base transfer update**
> As an Admin, I want to update a member's base from FCO to MXP in a single operation, so that the colleague is correctly assigned to the new base and the Milan representative can see them in their list.

**A-US-05: Urgent communication via WhatsApp**
> As an Admin, I want to select all members at a base and send a WhatsApp broadcast message with an urgent communication (e.g. strike, assembly), so that I reach the maximum number of colleagues in the shortest time possible, bypassing company email anti-spam filters.

**A-US-06: Resignation management**
> As an Admin, I want to mark a member as "resigned" with a date and reason, so that they are excluded from future communications but their historical data remains accessible for any disputes or recovery.

**A-US-07: Export for assembly minutes**
> As an Admin, I want to export in PDF the list of FCO members with first name, last name, and an empty signature field, so that I can use it as an attendance sheet for the monthly union assembly.

**A-US-08: Contract statistics**
> As an Admin, I want to see how many members I have per contract type at my base, so that I can plan targeted communications and understand where to focus union activity.

**A-US-09: Disciplinary proceeding notes**
> As an Admin, I want to add private notes on a member (e.g. "disciplinary proceeding open", "legal assistance request sent on 15/01"), so that I can keep track of ongoing cases without the member themselves seeing them.

**A-US-10: Identify RSA members for internal communications**
> As an Admin, I want to filter all members with the RSA flag active, so that I can organise internal meetings of union representatives only.

**A-US-15: Bulk import from Excel**
> As an Admin, I want to upload an Excel file with multiple members and see a preview of the data before importing, so that I can correct any errors and avoid creating duplicate records. The system should validate crewcode uniqueness and show me which rows have problems before I confirm the import.

**A-US-16: Offline member access**
> As an Admin, I want to view member information even without internet connection (e.g., in the airport basement or in flight mode), so that I can always access critical data when needed. The app should sync automatically when connection returns.

### 3.2b User Stories — SuperAdmin (Configuration)

**SA-US-06a: PDF field mapping configuration**
> As a SuperAdmin, I want to configure field mappings for PDF extraction per role (pilots vs cabin crew), so that the system can correctly extract data from different membership form layouts. I need to map PDF form field names to member fields and configure OCR patterns for scanned documents.

**SA-US-06b: Excel column mapping configuration**
> As a SuperAdmin, I want to configure column mappings for Excel bulk import per role, so that Admins can import member lists from spreadsheets with different column layouts. I need to map Excel columns to member fields, mark required fields, and set validation rules (e.g., lookup base codes against the database).

---

## 4. Realistic Scenarios of Daily Use

### Scenario 1: Monday morning at the airport — the union week

**06:30 — FCO crew room**

Marco is the CISL RSA pilots representative for Fiumicino. He sees only enrolled pilots. While waiting for the briefing, he opens UnionConnect on his phone (Face ID unlock):
- He checks notifications: 2 new members pending approval (PDF forms uploaded last night)
- He checks contact requests: a member has flagged "data change - base transfer FCO→MXP"
- He opens the member's profile, updates the base, saves: the colleague disappears from his list and appears in the Malpensa Admin's list

**09:15 — Receipt of paper form**

A passing colleague hands Marco a handwritten membership form:
- Marco opens the app, taps "+" → "Upload PDF"
- He selects "Pilot" role and photographs the form using the native camera
- The OCR system pre-fills the fields: First Name, Last Name, Crewcode, Base=FCO, Contract=Naviganti, Grade=First Officer
- Marco checks, corrects the phone number (written incorrectly), saves
- The system automatically sends a welcome email and WhatsApp message to the new member: "Welcome to the CISL union! Your FCO representative is Marco R. Contact: [link]"

**11:00 — Urgent assembly**

Management has announced an unexpected shift change. Marco needs to call an assembly:
- He opens the filter: Base=FCO, Contract=Naviganti, Status=Active
- Result: 143 members
- He selects "Send WhatsApp broadcast"
- He writes the message: "Urgent assembly TODAY at 14:00, Terminal 1 meeting room. Seasonal shift change: impact on summer rotations. Bring your schedule. Marco"
- He confirms sending: the 143 messages are sent via WhatsApp Business API

### Scenario 2: Handling a complex case

**A member is summoned by management for a disciplinary proceeding**

Giovanna, a flight attendant with 8 years of seniority, calls Marco in desperation:
- Marco opens Giovanna's profile on UnionConnect (cached data loads instantly even with poor signal)
- He adds a note: "12/02/2026 - Summoned for disciplinary proceeding regarding lateness on 04/01. Medical documentation submitted. CISL legal assistance requested. Case: CISL-2026-0089"
- He checks the contract details: Naviganti, FCO, Senior Cabin Crew
- He contacts the CISL legal consultant with the precise data
- Three weeks later: he adds a note "02/03/2026 - Proceeding closed. Medical documentation accepted."

### Scenario 3: Year-end — report for congress

Marco must prepare the annual report for the CISL provincial congress:
- He opens the statistics for his base (FCO)
- He views: 143 active members, 12 new registrations in 2025, 5 resignations (3 retirements, 2 company changes), net change +7
- He filters by contract: 98 Naviganti, 45 Handling
- He filters by grade: 12 Commanders, 34 First Officers, 52 Cabin Crew, 45 Ground Staff
- He exports the report in PDF
- The SuperAdmin consolidates data from all bases for the national report

---

## 5. Complete New Member Registration Flow

### 5.1 Standard Flow (via paper PDF)

```
PHASE 1 — PHYSICAL FORM COLLECTION
─────────────────────────────────────────────────────────────────
Worker                        Union Representative (Admin)
    │                                     │
    ├─ Fills in paper form ─────────────► │
    │  (first name, last name, crewcode,   │
    │   base, contract, grade,            │
    │   phone, email, signature)          │
    │                                     │
    │                          ┌──────────▼──────────────┐
    │                          │ Photographs/scans the   │
    │                          │ form with the app       │
    │                          │ (expo-document-picker)  │
    │                          └──────────┬──────────────┘
    │
PHASE 2 — PDF DATA EXTRACTION (automatic, with fallback)
─────────────────────────────────────────────────────────────────
    │                          ┌──────────▼──────────────┐
    │                          │ Try 1: PDF Form Fields  │
    │                          │ Reads fillable fields   │
    │                          │ using SuperAdmin config │
    │                          │ Confidence: 0.92 ✓      │
    │                          └──────────┬──────────────┘
    │                                     │
    │                          ┌──────────▼──────────────┐
    │                          │ Try 2: OCR Fallback     │ ← If no form fields
    │                          │ Extracts text, pattern  │
    │                          │ matching via mapping    │
    │                          │ Confidence: 0.65 △      │
    │                          └──────────┬──────────────┘
    │                                     │
    │                          ┌──────────▼──────────────┐
    │                          │ Try 3: Manual Entry     │ ← If OCR fails
    │                          │ Empty form, user types  │
    │                          │ Confidence: 0           │
    │                          └──────────┬──────────────┘
    │                                     │
    │                          ┌──────────▼──────────────┐
    │                          │ Pre-fills form:         │
    │                          │ • first name ✓          │
    │                          │ • last name ✓           │
    │                          │ • crewcode ✓            │
    │                          │ • base [FCO]            │
    │                          │ • contract [Naviganti]  │
    │                          │ • grade [F/O]           │
    │                          │ • phone +39...          │
    │                          │ • email ...@...         │
    │                          │                         │
    │                          │ PDF visible alongside   │
    │                          │ for verification        │
    │                          │ (react-native-pdf)      │
    │                          └──────────┬──────────────┘

**Field Mapping Configuration (SuperAdmin):**

SuperAdmin can configure field mappings per role (pilots vs cabin crew):

| PDF Field Name | Member Field | Type | Required |
|----------------|--------------|------|----------|
| `nome` | `first_name` | pdf_field | Yes |
| `cognome` | `last_name` | pdf_field | Yes |
| `crew_code` | `crewcode` | ocr_pattern | Yes |
| `telefono` | `phone` | pdf_field | No |

> Different forms for pilots and cabin crew can have different mappings.
> OCR patterns use regex for scanned documents where form fields aren't available.

PHASE 3 — VERIFICATION AND SAVING
─────────────────────────────────────────────────────────────────
    │                          ┌──────────▼──────────────┐
    │                          │ Admin verifies data,    │
    │                          │ corrects any OCR        │
    │                          │ errors                  │
    │                          │ Sets ITUD/RSA flags     │
    │                          │ Adds initial notes      │
    │                          └──────────┬──────────────┘
    │                                     │
    │                          ┌──────────▼──────────────┐
    │                          │ SAVE profile            │
    │                          │ → Uniqueness validation │
    │                          │   crewcode and email    │
    │                          └──────────┬──────────────┘

PHASE 4 — AUTOMATIC NOTIFICATIONS
─────────────────────────────────────────────────────────────────
    │                                     │
    │◄── Welcome EMAIL ───────────────────┤
    │    "Welcome to CISL!                │
    │     Your login credentials:         │
    │     Crewcode: [crewcode]            │
    │     Password: password              │
    │     Change it on first login!"      │
    │                                     │
    │◄── Welcome WHATSAPP ────────────────┤
    │    "Hi [Name]! You are now          │
    │     registered with the CISL union. │
    │     Your representative is [Admin]. │
    │     Log in with crewcode: [code]"   │
    │                                     │
    │    Admin receives confirmation ◄────┤
    │    "Registration of [Name] complete"│

PHASE 5 — ARCHIVING
─────────────────────────────────────────────────────────────────
    │                          ┌──────────▼──────────────┐
    │                          │ PDF form archived       │
    │                          │ in member profile       │
    │                          │ (for future reference)  │
    │                          └─────────────────────────┘
```

### 5.2 Alternative Flow (direct digital registration)

For tech-savvy new members or remote registrations:
1. Admin generates a personalised pre-registration link
2. The member fills in the online form from their own device
3. The member signs digitally (on-screen signature or OTP)
4. Admin receives notification and approves
5. Automatic notifications sent

### 5.3 Duplicate Management

Before saving, the system checks:
- **Crewcode already present** → blocking error (crewcode unique per company)
- **Email already present** → warning with link to existing profile
- **Similar first name + last name + base** → possible duplicate warning, admin confirms

---

## 6. Searching, Filtering, and Contacting Members

### 6.1 Quick Search (global search bar)

The representative can search by:
- **First Name / Last Name** (partial search, e.g. "Ros" finds Rossi, Rosato, Rosario)
- **Crewcode** (unique company identifier)
- **Email**
- **Phone number**

**Mobile use case:** Marco is in the crew room, a colleague asks for information. He types "ros" and in 2 seconds has the full profile.

### 6.2 Advanced Filters

```
AVAILABLE FILTERS:
┌─────────────────────────────────────────┐
│ Role:          [Pilot] [CC]             │  ← SuperAdmin only (Admin filtered auto)
│                                         │
│ Base:          [FCO] [MXP] [VCE] [NAP] │
│                [CAT] [BGY] [BLQ] [...]  │
│                                         │
│ Contract:      [Naviganti] [Handling]   │
│                [Administrative] [...]   │
│                                         │
│ Grade:         (depends on role)        │
│  Pilot:        [Cmdr] [F/O] [S/O] [Cdt]│
│  CC:           [Cab.Mgr] [Senior] [CC]  │
│                                         │
│ Status:        [Active] [Resigned]      │
│                [Suspended] [All]        │
│                                         │
│ Flag:          [ITUD] [RSA]             │
│                                         │
│ Registration:  From [__/__/____]        │
│                To   [__/__/____]        │
└─────────────────────────────────────────┘
```

**Typical combined filter examples:**
- All CC (Cabin Crew) FCO → assembly communications
- All members with ITUD flag → potentially on fixed-term contract, watch deadlines
- RSA at all bases → national representatives meeting
- New registrations last month → personalised welcome follow-up

### 6.3 List Sorting

- Alphabetical (last name A→Z, Z→A)
- By registration date (most recent first)
- By base (grouped)
- By grade

### 6.4 Contact Modes

```
For individual member:
├── 📱 Individual WhatsApp → directly opens WA chat with pre-filled number
├── 📧 Individual email → opens email client with pre-filled recipient
└── 📞 Call → opens dialler with pre-filled number

For groups (after filter):
├── 📣 WhatsApp Broadcast → message to all filter results (via WA Business API)
├── 📧 Group email → BCC to all (privacy) or via template with personalisation
└── 👥 Create WhatsApp group → automatically creates WA group with filtered members
```

---

## 7. Edge Cases and Anomaly Management

### 7.1 Base Transfer

**Trigger:** Employee transfer from one base to another (e.g. FCO → MXP)

**Flow:**
1. FCO Admin receives communication (phone call, WhatsApp, form)
2. Opens member profile → Edit → Base field: FCO → MXP
3. System notifies MXP Admin: "New transferred member: [Name]. Previously at FCO."
4. The member is removed from the FCO list and added to MXP
5. **History:** the previous base is recorded with the date of change

**Special case:** Multi-base member (pilots operating across multiple airports)
→ Proposal: primary base field + secondary bases

### 7.2 Contract Change

**Trigger:** Transition from fixed-term to permanent contract, profile change (from handling to navigante after training)

**Flow:**
1. Admin edits the Contract field
2. System automatically updates the member's group for future communications
3. Contract change history maintained

### 7.3 Grade Change / Promotion

**Trigger:** Promotion from First Officer to Commander, from Cabin Crew to Senior

**Flow:**
1. Admin updates the Grade field
2. System can automatically send a congratulations message (optional, configurable)
3. Promotion history maintained

### 7.4 Voluntary Resignation

**Trigger:** Member communicates their wish to resign

**Flow:**
1. Admin opens profile → Status: Active → Resigned
2. Enters resignation date and reason (optional: union change, retirement, company change, transfer abroad)
3. Member is excluded from all future communications
4. Data is retained (legally required, see GDPR section)
5. Admin cannot delete the profile, only deactivate it

**Data retention period:** minimum 10 years (Italian fiscal and union obligations)

### 7.5 Retirement

Same as resignation, with reason "retirement". Optional management of membership as "retired union member" (special category).

### 7.6 Death

**Sensitive flow:**
1. Admin marks as "deceased" (not "resigned")
2. No automatic communication
3. Data retained for any pension/insurance matters
4. Family access to union documents (upon formal request)

### 7.7 Member with Incorrect Crewcode

**Trigger:** Discovery of an error in the crewcode entered at registration

**Flow:**
1. Admin edits the crewcode → system checks uniqueness
2. Change log maintained (old crewcode, new crewcode, date, who made the change)
3. Important: the crewcode is a company identifier, not a union one — possible cross-checks required

### 7.8 Unreachable Member

**Trigger:** WhatsApp number inactive, invalid email

**Flow:**
1. System marks the channel as "unreachable" after X failed attempts
2. Admin receives notification: "Unable to deliver messages to [Name] — number inactive"
3. Admin manually updates contact data

### 7.9 Double Registration (same worker at two bases)

**Trigger:** Worker registered at both FCO and MXP (transfer with double registration)

**Flow:**
1. System detects potential duplicate (same first/last name or crewcode)
2. Warning sent to Admins at both bases
3. SuperAdmin decides which profile to keep and performs merge/deletion

---

## 8. Suggested Additional Features

### 8.1 Export and Reporting

| Feature | Format | Use |
|-------------|---------|----------|
| Member list export | CSV, Excel, PDF | Assembly minutes, reporting |
| Assembly attendance list | PDF with signature space | Print for physical assemblies |
| Base statistical report | Illustrated PDF | Union congress, reports |
| Label export | A4 PDF | Mailing of paper materials |
| Full register | Excel | Backup, data migration |

### 8.2 Statistics and Dashboard

**Admin Dashboard:**
- Total active members / change vs previous month
- Distribution by contract (pie chart)
- Distribution by grade (bar chart)
- New registrations last 30/60/90 days
- Members with incomplete data (alert)
- Members not reached by communications (alert)

**SuperAdmin Dashboard:**
- Base map with member counts
- National registration trend (12-month line chart)
- Base comparison (which is growing, which is declining)
- Communication response rate

### 8.3 Calendar and Deadlines

- Membership fee expiry (if managed in app)
- Fixed-term contract expiry (ITUD flag automatic alert 30/60/90 days before)
- Union membership card renewal
- Open case deadlines (disciplinary proceedings, etc.)
- Scheduled assemblies with automatic reminder to members

### 8.4 Communications and Templates

**Predefined templates (configurable):**
- Welcome new member
- Assembly summons
- Strike notice
- Collective contract renewal
- Assembly results
- Greetings (birthday, holidays — optional)

**Communication management:**
- Sent message history per member
- WhatsApp delivery rate (read/delivered)
- Scheduled sending (e.g. "send tomorrow at 08:00")
- Message preview before mass sending

### 8.5 Document Management

- Upload documents attached to member profile (PDF membership form, case documentation)
- Documents shared with all members (current CCNL, supplementary agreements, circulars)
- Push/WhatsApp notification when an important new document is published

### 8.6 Integration with Company Systems (future)

- Crewcode verification with airline HR system (if API available)
- Automatic import of organisational changes (transfers, promotions)
- Integration with national CISL portal

---

## 9. WhatsApp Integration — Use by the Union Representative

### 9.1 Context

WhatsApp is the dominant communication tool in the aviation sector. Pilots and cabin crew are often unreachable via company email (anti-spam filters, they don't check it outside work), but are always on WhatsApp. For the union representative, it is the primary tool.

### 9.2 Types of WhatsApp Messages

#### A) Individual Message
**When:** Personal assistance, sensitive communication, response to a specific request

**Flow:**
1. Admin opens member profile
2. Taps "WhatsApp" button
3. WhatsApp (native) opens with pre-loaded number
4. Admin writes personalised message

**Or (with WhatsApp Business API):**
1. Admin opens profile → "Send WhatsApp message"
2. Chooses template or writes free text
3. Sends from within the app
4. Delivery status visible in member profile

#### B) WhatsApp Broadcast (one to many, without creating a group)
**When:** Urgent communications, notices, assembly summons

**Characteristic:** The member receives the message as if from a private chat with the union representative, without seeing other recipients. Respects privacy.

**Flow:**
1. Admin applies filters (e.g. Base=FCO, Contract=Naviganti)
2. Selects "Send WhatsApp broadcast"
3. Writes or selects message template
4. Preview recipient list (143 people)
5. Confirms sending
6. System sends via WhatsApp Business API
7. Dashboard with delivery report: 143 sent, 141 delivered, 2 not delivered (inactive numbers)

**WhatsApp Business API limitation:** Requires Meta pre-approved templates for outbound messages to users who have not written in the last 24h. Or requires the member to have consented to receive messages.

#### C) Managed WhatsApp Group
**When:** Ongoing communications with a stable group (e.g. RSA members at all bases, regional delegates)

**Flow:**
1. Admin creates a "List" in UnionConnect (e.g. "RSA Northern Bases")
2. Adds members manually or via filter
3. System creates a corresponding WhatsApp group (via API)
4. Admin manages from app: adds/removes members as they change
5. UnionConnect list ↔ WhatsApp group synchronisation

#### D) Automatic Reminders via WhatsApp
**When:** Deadlines, scheduled assemblies, renewals

**Flow:**
1. Admin creates event/deadline in app calendar
2. Configures reminder: "WhatsApp 24h before + 2h before"
3. System sends automatically on the scheduled day/time
4. Example: "FCO Assembly TOMORROW at 10:00. Agenda: [link]. Marco CISL"

### 9.3 WhatsApp Consent and Opt-in

To comply with WhatsApp Business policies and GDPR:
- At the time of registration, the form includes **explicit consent** to receive union communications via WhatsApp
- The consent flag is stored in the member profile
- The member can revoke consent (flag deactivated → no automatic WA messages)
- For manual messages (click-to-chat), consent is implicit in having provided the number

### 9.4 Limitations and Fallback

| Scenario | Behaviour |
|----------|---------------|
| Number not on WhatsApp | Automatic flag, fallback to SMS or email |
| Number unreachable | Alert to Admin after 2 failed attempts |
| Member blocks the representative | Admin notification, update preferred channel |
| API message limit reached | Sending queue, staggered sending |

---

## 10. GDPR and Privacy Considerations for Union Data

### 10.1 Nature of Data — Special Category

> **LEGAL WARNING:** Data on union membership is **special category data** under Art. 9 GDPR and Art. 9 of D.Lgs. 196/2003 (Italian Privacy Code, amended by D.Lgs. 101/2018). Its processing requires enhanced legal bases and elevated security measures.

**Sensitive data present in UnionConnect:**
- Union membership (special category data by definition)
- Notes on disciplinary proceedings (judicial data)
- Crewcode + name = certain identifier of the worker
- Personal contact data (private phone, personal email)

### 10.2 Legal Bases for Processing

| Processing | Legal Basis | Regulatory Reference |
|------------|---------------|----------------------|
| Union membership management | Art. 9(2)(d) GDPR — legitimate union activity | + Art. 9 c. 2 lett. b) D.Lgs. 196/2003 |
| Communications to members | Performance of the associative contract | Art. 6(1)(b) GDPR |
| Sending communications via WA | Explicit consent | Art. 6(1)(a) + Art. 9(2)(a) GDPR |
| Historical data retention | Legal obligations (fiscal, union) | Art. 6(1)(c) GDPR |
| Notes on proceedings | Legitimate interest + consent | Art. 6(1)(f) + protection of workers' rights |

### 10.3 Mandatory Technical Security Measures

**Authentication and access:**
- [x] Biometric authentication (Face ID/Touch ID) for quick secure access
- [x] Password policy: minimum 12 characters, change every 90 days
- [x] Automatic session timeout after inactivity (e.g. 15 minutes)
- [x] Log of all accesses (who, when, from where)
- [x] Secure token storage (iOS Keychain / Android Keystore via expo-secure-store)

**Data transmission:**
- [x] Mandatory HTTPS connections (TLS 1.2+)
- [x] Valid SSL certificates
- [x] APIs protected with Bearer token authentication
- [x] Certificate pinning for production builds

**Storage:**
- [x] Database encrypted at-rest (AES-256 or equivalent)
- [x] Encrypted backups
- [x] Encrypted PDF membership forms
- [x] Local app data encrypted (SecureStore / Keychain)

**Application:**
- [x] Minimisation principle: Admin sees only members of their own base
- [x] Role-based access control (RBAC)
- [x] No download/export without tracked log
- [x] OTA updates via secure channels (Expo Updates)

### 10.4 Members' Rights (Data Subjects)

| Right | How to implement it in app |
|---------|--------------------------|
| **Access** (art. 15) | "My data" section in the user app — displays all stored data |
| **Rectification** (art. 16) | Change request form → Admin notified and acts |
| **Erasure** (art. 17) | Not immediate (retention obligations), but anonymisation after minimum period |
| **Restriction** (art. 18) | "Data in dispute" flag — blocks marketing communications |
| **Portability** (art. 20) | JSON/CSV export of own data upon request |
| **Objection** (art. 21) | Opt-out from non-essential communications (e.g. WhatsApp broadcast) |

### 10.5 Privacy Notice (to be implemented)

At the time of registration (digital or via paper form), the member must receive:
- Full privacy notice (Data Controller: [CISL Organisation])
- Purposes of processing
- Retention periods
- Exercisable rights
- Explicit consent for WhatsApp and union marketing communications
- Biometric data usage notice (for Face ID/Touch ID)

The PDF registration form must include a dedicated section for privacy consent with a separate signature.

### 10.6 Data Retention

| Data type | Retention period | Justification |
|-------------|----------------------|-------------|
| Active member | Until resignation + 10 years | Pension/fiscal obligations |
| Resigned member data | 10 years from resignation date | Art. 2220 CC + union obligations |
| System access logs | 1 year | Information security |
| Communications sent | 5 years | Verification of union activity |
| Proceeding notes | 10 years | Standard limitation period |
| PDF membership forms | 10 years | Proof of consent |

### 10.7 Appointment of Data Processors

If the app is managed by an external provider (hosting, development), a **Data Processing Agreement (DPA)** must be signed pursuant to Art. 28 GDPR. The provider becomes the Data Processor.

Individual Admins may be appointed as **Authorised Processors** with a specific letter of appointment.

### 10.8 Security Incidents (Data Breach)

In the event of unauthorised access to data:
- Notification to the Supervisory Authority within **72 hours** (Art. 33 GDPR)
- Notification to data subjects if high risk (Art. 34 GDPR)
- The app must include documented incident response procedures

### 10.9 Record of Processing Activities

The CISL organisation must maintain a **Record of Processing Activities** (Art. 30 GDPR) that includes UnionConnect as a processing system. The app can help automatically generate a section of the record.

---

## 11. UX Considerations for Mobile Use

The union representative works primarily from their phone, often in noisy environments (airport, gate, crew room):

- **Native mobile app:** True native performance with 60fps smooth scrolling (React Native)
- **Quick actions:** The most frequent actions (search member, send WA, add note) must be accessible in max 3 taps
- **Offline mode:** Member list viewable even without connection (sync when connectivity returns via TanStack Query)
- **Biometric login:** Face ID/Touch ID for instant secure access
- **Push notifications:** Instant delivery of urgent communications
- **Dark mode:** For use in the cockpit or low-light environments
- **Readable font:** Large text, high contrast, for readability with external light glare
- **Clear visual feedback:** Message send confirmations, network errors, loading indicators
- **Native PDF handling:** Smooth PDF preview and zoom with react-native-pdf

---

## 12. Prioritised Functional Requirements Summary

### P0 — Essential (MVP)
- [x] Member management (full CRUD)
- [x] Registration via PDF upload
- [x] Member search and filter
- [x] Individual WhatsApp sending (click-to-chat)
- [x] Welcome notification (email + WhatsApp) on creation
- [x] Role management (SuperAdmin, Admin, User)
- [x] Filter by base — Admin sees only their own members
- [x] Biometric authentication (Face ID/Touch ID)
- [x] Native iOS/Android app experience
- [x] Offline data access

### P1 — High Priority
- [x] WhatsApp broadcast to filtered list
- [x] CSV/Excel member list export
- [x] Base statistics dashboard
- [x] Private notes on members
- [x] Status management (active, resigned)
- [x] Profile change history
- [x] Push notifications
- [x] OTA updates without app store review

### P2 — Medium Priority
- [ ] Automatic OCR from PDF
- [ ] Deadline calendar with reminders
- [ ] Customisable message templates
- [ ] Assembly PDF report (with signature space)
- [ ] Synchronised WhatsApp group management
- [ ] Document scanning with camera

### P3 — Future Enhancement
- [ ] Airline HR API integration
- [ ] Digital membership signature
- [ ] Advanced member self-service portal
- [ ] Communication sentiment analysis
- [ ] Multi-language support

---

*Document created on the basis of analysis of the UnionConnect app fields and the operational workflow of a union representative in the Italian aviation sector. Updated for Expo + React Native native mobile app architecture.*
