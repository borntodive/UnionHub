# UnionConnect — UX/UI Design Document

**Version:** 1.3
**Date:** 2026-02-12
**Stack:** Expo 52+ / React Native 0.76+, iOS/Android native apps
**Context:** Aviation union member management app (CISL)

> **NOTE v1.1:** Every member IS a user (single table). Login via crewcode + password. New "Role" field (Pilot / Cabin Crew) with role-specific grades. Admin scoped by role. "Reset password" via email linked to the crewcode.
>
> **NOTE v1.2:** **Grades** are now a CRUD entity managed by the SuperAdmin (like Bases and Contracts). Each grade has a code + name and belongs to a role. The grade field in the member form is a dynamic `<Picker>` that loads grades from the `grades` table filtered by the selected role.
>
> **NOTE v1.3:** The entire app UI is now in English (labels, buttons, toasts, alerts, placeholders, empty states). Professional roles have been renamed in English: `pilot` / `cabin_crew`. Migrated from Ionic to **Expo + React Native** for true native app experience. The Information Architecture has been extended with a "Tools" section for future features (Payslip Calculator, FTL Calculator).

---

## Table of Contents

1. [Users and Roles](#1-users-and-roles)
2. [Information Architecture](#2-information-architecture)
3. [Navigation Flows](#3-navigation-flows)
4. [Design System](#4-design-system)
5. [Main Screen Wireframes](#5-main-screen-wireframes)
6. [PDF Upload / OCR Flow](#6-pdf-upload--ocr-flow)
7. [UI States: Loading, Error, Empty State](#7-ui-states-loading-error-empty-state)
8. [Notifications and Feedback](#8-notifications-and-feedback)
9. [Accessibility](#9-accessibility)
10. [Mobile-First Considerations](#10-mobile-first-considerations)

---

## 1. Users and Roles

### Concept: Member = User (single entity)

There is no distinction between "user" and "member": they are the **same entity**. Every member is also a user with login credentials (crewcode + password). The entity's application role (SuperAdmin, Admin, User) determines the features accessible in the app. The default password for a new member is set by the Admin — on first login, a mandatory password change is required.

### Permissions Matrix

| Feature                                   | SuperAdmin | Admin | User |
|-------------------------------------------|:----------:|:-----:|:----:|
| Login (crewcode + password)               | ✓          | ✓     | ✓    |
| View own data                             | ✓          | ✓     | ✓    |
| Edit own basic data                       | ✓          | ✓     | ✓    |
| Members list (own role only)              | ✓ (all)    | ✓ *   | ✗    |
| Search members                            | ✓ (all)    | ✓ *   | ✗    |
| Create member (manual/PDF)                | ✓          | ✓ *   | ✗    |
| Edit member                               | ✓          | ✓ *   | ✗    |
| View notes, ITUD flag, RSA                | ✓          | ✓     | ✗    |
| Manage bases (code + name)                | ✓          | ✗     | ✗    |
| Manage contracts (code + name)            | ✓          | ✗     | ✗    |
| Manage grades (code + name + role)        | ✓          | ✗     | ✗    |
| Manage other Admins                       | ✓          | ✗     | ✗    |
| Email / WhatsApp notifications            | ✓          | ✓ *   | ✗    |

> **\* Admin scoped by role:** The Admin has an assigned professional role (Pilot or Cabin Crew) and can see/manage **only the members of their own role**. The SuperAdmin sees and manages all members regardless of role.

### Member Fields

**Visible to all (including User):**
- First name, Last name
- Email
- Crewcode (also used for login)
- Phone
- **Role** (Pilot / Cabin Crew)
- Base (code + name)
- Contract (code + name)
- Grade (depends on role — see below)

**Grades (CRUD entity managed by SuperAdmin):**

Grades are managed by the SuperAdmin via CRUD (like bases and contracts). Each grade has a `code`, `name` and membership `role`. The Grade field in the member form is a dynamic `<Picker>` that loads grades from the `grades` table filtered by the selected Role. If the Role is changed, the Grade is reset.

Default grades (inserted via seeder):

| Role         | Code   | Name                   |
|--------------|--------|------------------------|
| Pilot        | CMD    | Commander              |
| Pilot        | FO     | First Officer          |
| Pilot        | SO     | Second Officer         |
| Pilot        | ALL    | Cadet                  |
| Cabin Crew   | RDC    | Cabin Manager          |
| Cabin Crew   | SEN    | CC Senior              |
| Cabin Crew   | ADV    | Cabin Crew             |

**Visible to Admin / SuperAdmin only:**
- Notes
- ITUD flag (boolean)
- RSA flag (boolean)

---

## 2. Information Architecture

```
UnionConnect
├── AUTH
│   ├── Login (crewcode + password)
│   └── Reset Password (via email linked to crewcode)
│
├── USER (role: User — every member is a user)
│   ├── Profile
│   │   ├── Personal data (read/partial edit)
│   │   └── Change password
│   └── Tools (future)
│       ├── Payslip Calculator (future)
│       └── FTL Calculator (future)
│
├── ADMIN (role: Admin — scoped to own role*)
│   ├── Dashboard (counts only members of own role)
│   ├── Members (own role members only)
│   │   ├── List + Search
│   │   ├── Member detail
│   │   ├── Create member
│   │   │   ├── Via manual form
│   │   │   └── Via PDF upload (OCR)
│   │   └── Edit member
│   ├── Profile
│   └── Tools (future — same as User + admin tools)
│       ├── Payslip Calculator (future)
│       └── FTL Calculator (future)
│
└── SUPERADMIN (role: SuperAdmin — all roles)
    ├── [all Admin features, no role restriction]
    ├── Settings
    │   ├── Manage Bases
    │   │   ├── Bases list
    │   │   ├── Create base
    │   │   └── Edit/Delete base
    │   ├── Manage Contracts
    │   │   ├── Contracts list
    │   │   ├── Create contract
    │   │   └── Edit/Delete contract
    │   ├── Manage Grades
    │   │   ├── Grades list (filter by role)
    │   │   ├── Create grade (code + name + role)
    │   │   └── Edit/Delete grade
    │   └── Manage Admins
    │       ├── Admins list
    │       ├── Create admin
    │       └── Edit/Deactivate admin
    ├── Profile
    └── Tools (future)
        ├── Payslip Calculator (future)
        └── FTL Calculator (future)
```

> **\* Admin Scoping:** The Admin accesses only the members of their own professional role (Pilot OR Cabin Crew). The SuperAdmin has no such restriction and sees all members.

> **Note on extensibility:** The tab bar is designed to accommodate up to **5 tabs**. If sections grow beyond 5 in the future, the **"More" overflow** pattern is adopted (an extra tab that opens a menu with the additional items). For now:
> - **User:** Profile + Tools (2 tabs, with the ability to add items to Tools in the future)
> - **Admin:** Home + Members + Profile (3 tabs, Tools becomes the 4th tab when active)
> - **SuperAdmin:** Home + Members + Settings + Profile (4 tabs, Tools becomes the 5th tab or an item in "More")

---

## 3. Navigation Flows

### 3.1 Authentication Flow (all roles)

Login is performed via **crewcode + password** (not email). The "Reset password" function sends a recovery link to the email associated with the crewcode in the database.

```
[App Launch]
     │
     ▼
[Splash Screen 2s]
     │
     ├─ Valid token? ──YES──► [Home by role]
     │
     NO
     ▼
[Login Screen]
  [Crewcode] + [Password]
     │
     ├─ Valid credentials?
     │    ├─ YES ──► [Routing by role]
     │    │            ├─ SuperAdmin ──► [Dashboard Admin]
     │    │            ├─ Admin      ──► [Dashboard Admin]
     │    │            └─ User       ──► [My Profile]
     │    │
     │    └─ NO  ──► [Show inline error] ──► [Login Screen]
     │
     └─ "Reset password?" ──► [Reset Password]
              │
              ▼
         [Enter crewcode]
              │
              ▼
         [Email sent to address linked to crewcode]
              │
              ▼
         [Login Screen]
```

### 3.2 User Flow (base role)

Every member is also a user: they log in with their crewcode and view their personal profile.

```
[Login] ──► [My Profile]
                    │
                    ├─ Section: Personal Data (read-only)
                    │   Name, Surname, Email, Crewcode
                    │   Role, Grade, Phone, Base, Contract
                    │
                    ├─ [Edit Phone] ──► [Edit Modal] ──► [Save]
                    │
                    └─ [Change Password] ──► [Password Modal] ──► [Save]
```

> **UX Note:** The User role sees a simplified UI with a 2-tab tab bar (Profile + Tools). Only their own profile is accessible. The Tools tab is visible but shows a "Coming soon" state until future features are active.

### 3.3 Admin Flow — Members List and Detail

The list shows **only the members of the role managed by the Admin** (Pilots OR Cabin Crew). The SuperAdmin sees all members and has a Role filter chip to toggle the view.

```
[Dashboard]
     │
     ├─ Tab: Members
     │         │
     │         ▼
     │    [Members List]
     │    (Admin: only members of own role)
     │    (SuperAdmin: all, with role filter)
     │    ┌──────────────────┐
     │    │ 🔍 Search...      │
     │    │ [Filter: Role]   │  ← SuperAdmin only
     │    │ [Filter: Base]   │
     │    │                  │
     │    │ ● Rossi Marco    │
     │    │   FCO | AZ | CPT │
     │    │                  │
     │    │ ● Bianchi Sara   │
     │    │   MXP | RZ | F/O │
     │    └──────────────────┘
     │         │
     │    [Tap member]
     │         │
     │         ▼
     │    [Member Detail]
     │         │
     │         ├─ [Edit] ──► [Edit form] ──► [Save]
     │         └─ [Back to list]
     │
     └─ FAB (+) ──► [Choose mode]
                          ├─ "Manual entry" ──► [Create Form]
                          └─ "Upload PDF"   ──► [OCR Flow]
```

### 3.4 SuperAdmin Flow — Settings

```
[Dashboard]
     │
     └─ Tab: Settings
                │
                ├─ Bases ──► [Bases List]
                │                │
                │           [+ Add] ──► [Base Form: Code + Name]
                │                │
                │           [Tap base] ──► [Edit/Delete]
                │
                ├─ Contracts ──► [Contracts List]
                │                    │
                │               [+ Add] ──► [Contract Form]
                │                    │
                │               [Tap contract] ──► [Edit/Delete]
                │
                ├─ Grades ──► [Grades List]
                │                │
                │           [Filter Role: All | Pilots | Cabin Crew]
                │                │
                │           [+ Add] ──► [Grade Form: Code + Name + Role]
                │                │
                │           [Tap grade] ──► [Edit/Delete]
                │
                ├─ PDF Field Mappings ──► [Mappings List]
                │                           │
                │                      [Filter Role: Pilot | Cabin Crew]
                │                           │
                │                      [+ Add] ──► [Mapping Form]
                │                           │      Role selection
                │                           │      Field mappings grid
                │                           │      OCR patterns
                │                           │
                │                      [Tap mapping] ──► [Edit/Delete]
                │                           │
                │                      [Set as Default]
                │
                ├─ Excel Field Mappings ──► [Templates List]
                │                              │
                │                         [Filter Role: Pilot | Cabin Crew]
                │                              │
                │                         [+ Add] ──► [Template Form]
                │                              │      Role selection
                │                              │      Column mappings
                │                              │      Validation rules
                │                              │      [Download Sample]
                │                              │
                │                         [Tap template] ──► [Edit/Delete]
                │                              │
                │                         [Set as Default]
                │
                └─ Admins ──► [Admins List]
                                          │
                                     [+ Add] ──► [Admin Form]
                                          │
                                     [Tap admin] ──► [Detail/Deactivate]
```

---

## 4. Design System

### 4.1 Color Palette

The design reflects a professional union identity: reliability, authority, clarity.

```
PRIMARY
  primary:         #177246   (CISL institutional green)
  primaryDark:     #162f58
  primaryLight:    #2a5099

SECONDARY (warm accent, action)
  secondary:       #DA0E32   (CISL red, main CTA)
  secondaryDark:   #c5303b
  secondaryLight:  #f04f5b

NEUTRALS
  background:      #F8F9FA
  surface:         #FFFFFF
  text:            #212529
  textSecondary:   #6C757D
  border:          #E0E0E0

SEMANTIC
  success:         #2E7D32   (Confirmation green)
  warning:         #E65100   (Warning orange)
  danger:          #C62828   (Error red)
  info:            #0277BD   (Info blue)
```

### 4.2 Typography

```
Font: "Inter" (system fallback: -apple-system, BlinkMacSystemFont, "Segoe UI")

Scale:
  text-xs:    11  / line-height: 1.4   → badge label, caption
  text-sm:    13  / line-height: 1.5   → secondary notes
  text-base:  15  / line-height: 1.6   → body text, form
  text-md:    17  / line-height: 1.5   → card titles, list items
  text-lg:    20  / line-height: 1.4   → section titles
  text-xl:    24  / line-height: 1.3   → page title
  text-2xl:   28  / line-height: 1.2   → dashboard header

Weight:
  Regular (400): body text
  Medium (500):  form labels, tab bar
  SemiBold (600): card titles, member name in list
  Bold (700):    page titles, CTA
```

### 4.3 Spacing and Grid

```
Base unit: 4px

Scale:
  space-1:  4px
  space-2:  8px
  space-3:  12px
  space-4:  16px   ← standard card padding
  space-5:  20px
  space-6:  24px   ← gap between sections
  space-8:  32px
  space-10: 40px
  space-12: 48px   ← header padding

Border radius:
  radius-sm:  6px   → badge, input
  radius-md:  12px  → card, modal
  radius-lg:  20px  → bottom sheet
  radius-full: 9999px → avatar, chip
```

### 4.4 React Native Components Reference

| Context                               | React Native / Expo Component         | Notes                                             |
|---------------------------------------|---------------------------------------|---------------------------------------------------|
| Main navigation                       | `@react-navigation/bottom-tabs`       | Max 4-5 tabs, icons + labels                        |
| Page header                           | Custom Header with `SafeAreaView`     | Native stack navigator header                     |
| Members list                          | `FlatList` with `refreshControl`      | Virtualized for performance on long lists         |
| Member card                           | `TouchableOpacity` + `Card`           | With colored initials avatar                      |
| Search                                | `TextInput` with `Search` icon        | With 300ms debounce                               |
| Form fields                           | `TextInput` + `react-hook-form`       | Floating label (custom)                           |
| Selectors (base/contract/role/grade)  | `@react-native-picker/picker`         | Native picker on iOS/Android                      |
| Toggle (ITUD, RSA)                    | `Switch`                              | Primary color                                     |
| Textarea (notes)                      | `TextInput` multiline                 | Auto-grow                                         |
| PDF upload                            | `expo-document-picker`                | Native file picker                                |
| Creation modal                        | `@react-navigation/native-stack`      | Full screen modal presentation                    |
| Confirmation alert                    | `Alert.alert()`                       | Native alert dialog                               |
| Toast notifications                   | `react-native-toast-message`          | Bottom position, 3s duration                      |
| Loading overlay                       | `ActivityIndicator`                   | Spinner overlay                                   |
| Refresh                               | `RefreshControl`                      | Pull-to-refresh on FlatList                       |
| Add FAB                               | `TouchableOpacity` (FAB style)        | Secondary red, `+` icon                           |
| Filter chip                           | `TouchableOpacity` (Chip style)       | Quick filters (by role, by base)                  |
| Skeleton loading                      | `react-native-skeleton-placeholder`   | Placeholder while list is loading                 |
| Segmented control                     | `SegmentedControl` (custom)           | For alternative views (e.g. OCR/Manual)           |
| Accordion (detail)                    | `react-native-collapsible`            | For collapsible sections in detail view           |

### 4.5 Iconography

Library: **@expo/vector-icons** (Ionicons, MaterialIcons)

```
Main actions:
  add-circle-outline     → New member
  search-outline         → Search
  person-circle-outline  → Profile
  settings-outline       → Settings
  document-text-outline  → PDF/Documents
  cloud-upload-outline   → Upload
  pencil-outline         → Edit
  trash-outline          → Delete
  checkmark-circle       → Success
  close-circle           → Error
  warning-outline        → Warning
  information-circle     → Info
  eye-outline / eye-off  → Show/hide password
  mail-outline           → Email
  logo-whatsapp          → WhatsApp (if available)
  airplane-outline       → Base / Aviation (theme)
  card-outline           → Card/Contract
  flag-outline           → ITUD/RSA flag
  people-outline         → Role / Professional category
```

---

## 5. Main Screen Wireframes

### 5.1 Login

Login is performed with **crewcode** (not email) and password. The "Reset password" link starts the recovery flow via the email associated with the crewcode in the database.

```
┌─────────────────────────────┐
│                             │
│         [Logo CISL]         │
│       UnionConnect          │
│                             │
│  ┌─────────────────────┐    │
│  │ 👤 Crewcode         │    │  ← autoCapitalize="characters"
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ 🔒 Password      👁 │    │  ← secureTextEntry with toggle
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │      LOGIN          │    │  ← TouchableOpacity (primary)
│  └─────────────────────┘    │
│                             │
│  Reset password?            │  ← text link → recovery via email
│                             │     linked to crewcode
└─────────────────────────────┘

Inline validation:
  - Empty crewcode: "Enter your crewcode"
  - Empty password: "Enter your password"
  - Invalid credentials: "Invalid crewcode or password"
  - First login: Redirect to "Change password" if must_change_password=true

Biometric login (after first successful login):
  - Face ID / Touch ID prompt on subsequent app opens
  - Fallback to password if biometric fails
```

### 5.2 Admin Dashboard (Home)

The "Members" stat card shows the **count filtered by the role managed by the Admin** (Pilots or Cabin Crew). The SuperAdmin sees the overall total with the label "Members (all)".

```
┌─────────────────────────────┐
│ ≡  UnionConnect      👤     │  ← SafeAreaView + custom header
├─────────────────────────────┤
│ Welcome, Marco              │  ← personalized with name
│                             │
│  ┌──────────────┐ ┌───────┐ │
│  │    148       │ │   3   │ │  ← stat cards (TouchableOpacity)
│  │ Pilots       │ │ Bases │ │  ← dynamic label:
│  │ (or CC)      │ │ act.  │ │     Admin → "Pilots" or "Cabin Crew"
│  └──────────────┘ └───────┘ │     SuperAdmin → "Members (all)"
│                             │
│  Recently added             │
│  ┌─────────────────────┐    │
│  │ ●  Rossi Marco      │    │
│  │    FCO · AZ · CPT   │    │
│  │    added 2h ago     │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ ●  Chen Li          │    │
│  │    MXP · RZ · F/O   │    │
│  │    added yesterday  │    │
│  └─────────────────────┘    │
│                             │
│  [View all members →]       │
│                             │
├─────────────────────────────┤
│ 🏠 Home  👥 Members  👤 Me  │  ← BottomTabNavigator (3 tabs Admin)
└─────────────────────────────┘
```

### 5.3 Members List (Admin/SuperAdmin)

The filter chips include a row for **Role** (visible only to the SuperAdmin; the Admin already sees only their own role, so the filter is not needed) and a row for Base.

```
┌─────────────────────────────┐
│ ←  Members            (148) │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🔍  Search by name...   │ │  ← TextInput with search icon
│ └─────────────────────────┘ │
│                             │
│ [All] [Pilots] [CC]         │  ← Scrollable chip filters
│                             │     (visible to SuperAdmin only)
│ [All] [FCO] [MXP] [VCE]    │  ← Base filters
│                             │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │ ●  Bianchi Sara         │ │  ← TouchableOpacity card
│ │    MXP · Ryanair · F/O  │ │     with avatar initials
│ │                    ›    │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ●  Chen Li              │ │
│ │    MXP · Ryanair · F/O  │ │
│ │                    ›    │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ●  De Luca Antonio      │ │
│ │    FCO · Azzurra · CPT  │ │
│ │                    ›    │ │
│ └─────────────────────────┘ │
│            ...              │
│                             │
│                       [+]   │  ← FAB (TouchableOpacity, red)
├─────────────────────────────┤
│ 🏠 Home  👥 Members  👤 Me  │
└─────────────────────────────┘

Avatar colors:
  Deterministically generated from the first letter of the surname
  A-E: #177246, F-J: #2E7D32, K-O: #6A1B9A,
  P-T: #E65100, U-Z: #00838F

Pull-to-refresh: Swipe down to reload list
Infinite scroll: Load more as user scrolls
```

### 5.4 Member Detail (Admin/SuperAdmin)

The **Role** field is displayed in the "Professional Data" section, before the Grade.

```
┌─────────────────────────────┐
│ ←  Member detail       ✏   │  ← pencil icon to edit
├─────────────────────────────┤
│                             │
│        ● M B                │  ← large avatar (56px), initials
│      Marco Bianchi          │
│      mc.bianchi@aa.it       │
│                             │
├─────────────────────────────┤
│ PROFESSIONAL DATA           │  ← Section header
│                             │
│  Crewcode    AB1234         │
│  Role        Pilot          │
│  Base        FCO — Roma     │
│  Contract    AZ — Alitalia  │
│  Grade       Commander      │
│                             │
├─────────────────────────────┤
│ CONTACTS                    │
│                             │
│  Phone       +39 333 1234567│
│  Email       mc.bianchi@... │
│                             │
├─────────────────────────────┤
│ ADMINISTRATIVE (Admin only) │  ← visible to Admin/SuperAdmin only
│                             │
│  ITUD   [● ON ]             │  ← Switch (disabled in view mode)
│  RSA    [  OFF]             │
│                             │
│  Notes:                     │
│  ┌─────────────────────┐    │
│  │ FCO base delegate.  │    │
│  │ Renewal March 2026. │    │
│  └─────────────────────┘    │
│                             │
├─────────────────────────────┤
│ 🏠 Home  👥 Members  👤 Me  │
└─────────────────────────────┘
```

### 5.5 Edit Member Form

The **Role** field is a `<Picker>` with options "Pilot" and "Cabin Crew". The **Grade** field is a dynamic `<Picker>`: the options change based on the selected Role. When the Role changes, the Grade is reset.

```
┌─────────────────────────────┐
│ ←  Edit member              │
├─────────────────────────────┤
│                             │
│ PERSONAL DATA               │
│ ┌─────────────────────────┐ │
│ │ Name *          Marco   │ │  ← TextInput with label
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Surname *       Bianchi │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Email *  mc.b@aa.it     │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Phone     +39 333...    │ │
│ └─────────────────────────┘ │
│                             │
│ PROFESSIONAL                │
│ ┌─────────────────────────┐ │
│ │ Crewcode *    AB1234    │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Role *           Pilot  │ │  ← Picker
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Base *           FCO    │ │  ← Picker
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Contract *       AZ     │ │  ← Picker
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Grade *      Commander  │ │  ← dynamic Picker
│ │                         │ │     API /grades?role=<role>
│ │                         │ │     Shows: code – name
│ └─────────────────────────┘ │
│                             │
│ ADMINISTRATIVE (Admin only) │
│  ITUD  [● ON ]   RSA [ OFF] │  ← Switch components
│                             │
│ ┌─────────────────────────┐ │
│ │ Notes                   │ │
│ │                         │ │  ← TextInput multiline
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │     SAVE CHANGES        │ │  ← TouchableOpacity primary
│ └─────────────────────────┘ │
│                             │
│ * Required fields           │
└─────────────────────────────┘

Grade select logic:
  onRoleChange(role) {
    grades = await gradesService.getByRole(role)  // GET /api/v1/grades?role=pilot
    gradeControl.reset()  // mandatory reset on role change
  }
```

### 5.6 User Profile (User)

Every member logs in with their crewcode and is in all respects a user. The **Role** is displayed among the professional data.

```
┌─────────────────────────────┐
│    My Profile         ✏     │
├─────────────────────────────┤
│                             │
│         ●  M B              │  ← 64px avatar
│       Marco Bianchi         │
│       Crewcode: AB1234      │
│                             │
├─────────────────────────────┤
│                             │
│  Role          Pilot        │
│  Base          FCO — Roma   │
│  Contract      AZ — Alitalia│
│  Grade         Commander    │
│  Email         mc.b@aa.it   │
│  Phone         +39 333...   │
│                             │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │  Edit phone             │ │  ← only field editable by User
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │  Change password        │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │  Logout                 │ │  ← danger color (red)
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘

> **Note:** The User role has simplified navigation with bottom tabs.
```

### 5.7 SuperAdmin Settings — Base Management

```
┌─────────────────────────────┐
│ ←  Manage Bases             │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │ FCO   Roma Fiumicino    │ │  ← swipe left for actions
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ MXP   Milano Malpensa   │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ VCE   Venezia Marco Polo│ │
│ └─────────────────────────┘ │
│            ...              │
│                       [+]   │  ← FAB to add base
├─────────────────────────────┤
│ 🏠 Home  👥 Members  👤 Me  │
│              ⚙ Settings    │  ← 4th tab, SuperAdmin only
└─────────────────────────────┘

Swipe left on item (react-native-swipeable):
  ┌────────────────────────────────┐
  │ FCO   Roma Fiumicino  [✏][🗑] │
  └────────────────────────────────┘
  ✏ = Edit (color: warning)
  🗑 = Delete (color: danger, with confirmation alert)
```

### 5.8 SuperAdmin Settings — Grade Management

```
┌─────────────────────────────┐
│ ←  Manage Grades            │
├─────────────────────────────┤
│                             │
│ [All] [Pilots] [CC]         │  ← chip filters
│                             │
│ PILOTS                      │  ← section header
│ ┌─────────────────────────┐ │
│ │ CMD   Commander         │ │  ← swipe left for actions
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ FO    First Officer     │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ SO    Second Officer    │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ALL   Cadet             │ │
│ └─────────────────────────┘ │
│                             │
│ CABIN CREW                  │  ← section header
│ ┌─────────────────────────┐ │
│ │ RDC   Cabin Manager     │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ SEN   CC Senior         │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ADV   Cabin Crew        │ │
│ └─────────────────────────┘ │
│            ...              │
│                       [+]   │  ← FAB to add grade
├─────────────────────────────┤
│ 🏠 Home  👥 Members  👤 Me  │
│              ⚙ Settings    │
└─────────────────────────────┘

Grade Create/Edit Form:
┌─────────────────────────────┐
│ ←  New Grade                │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │ Code *          CMD     │ │  ← max 20 char
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Name *     Commander    │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Role *           Pilot  │ │  ← Picker
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │        SAVE             │ │  ← TouchableOpacity primary
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

PDF Field Mapping Configuration Form (SuperAdmin):
┌─────────────────────────────────────────────────────────────┐
│ ←  New PDF Field Mapping                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Mapping Name *                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Pilot Registration Form 2024                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Role *                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Pilot                                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [✓] Set as default for this role                          │
│                                                             │
│  ─────────── Field Mappings ───────────                     │
│                                                             │
│  ┌──────────────────┬──────────────────┬──────────┐        │
│  │ PDF Field        │ Member Field     │ Type     │        │
│  ├──────────────────┼──────────────────┼──────────┤        │
│  │ nome             │ nome             │ Form  ▼  │        │
│  │ cognome          │ cognome          │ Form  ▼  │        │
│  │ email            │ email            │ Form  ▼  │        │
│  │ crew_code        │ crewcode         │ OCR   ▼  │        │
│  │ telefono         │ phone            │ Form  ▼  │        │
│  └──────────────────┴──────────────────┴──────────┘        │
│                                                             │
│  [+ Add Mapping]                                           │
│                                                             │
│  ──── OCR Pattern Configuration (for OCR type) ────         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Pattern:                                            │    │
│  │ Crew Code:\s*([A-Z0-9]{3,15})                       │    │
│  │                                                     │    │
│  │ Test: AB1234 ✓ Match                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    SAVE                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

> **Field Types:**
> - **Form Field**: Reads value from fillable PDF AcroForm fields
> - **OCR Pattern**: Uses regex pattern to extract from scanned text
>
> **Available Member Fields:** nome, cognome, email, crewcode, telefono,
> grade, baseCode, contrattoCode

---

Excel Field Mapping Configuration Form (SuperAdmin):
┌─────────────────────────────────────────────────────────────┐
│ ←  New Excel Import Template                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Template Name *                                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Pilot Import Template 2024                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Role *                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Pilot                                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [✓] Set as default for this role                          │
│                                                             │
│  Expected Headers (auto-detected from sample)              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Nome, Cognome, Crewcode, Email, Telefono, Base     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ─────────── Column Mappings ───────────                  │
│                                                             │
│  ┌─────────┬─────────────┬────────────┬──────────┬────────┐│
│  │ Column  │ Header      │ Member     │ Required │Valid.  ││
│  │ Index   │ Name        │ Field      │          │Rule   ││
│  ├─────────┼─────────────┼────────────┼──────────┼────────┤│
│  │ 0       │ Nome        │ nome       │ ✓        │       ││
│  │ 1       │ Cognome     │ cognome    │ ✓        │       ││
│  │ 2       │ Crewcode    │ crewcode   │ ✓        │unique ││
│  │ 3       │ Email       │ email      │ ✓        │email  ││
│  │ 4       │ Telefono    │ telefono   │          │phone  ││
│  │ 5       │ Base        │ baseCode   │          │lookup ││
│  │ 6       │ Grado       │ gradeCode  │          │lookup ││
│  └─────────┴─────────────┴────────────┴──────────┴────────┘│
│                                                             │
│  [+ Add Column Mapping]                                    │
│                                                             │
│  ──── Validation Rules Reference ────                       │
│                                                             │
│  • **unique**: Check for duplicate values in file          │
│  • **email**: Validate email format                         │
│  • **phone**: Normalize and validate phone format           │
│  • **lookup**: Verify against database (bases, grades)      │
│  • **date**: Validate date format                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [Download Sample]        [Preview Mapping]         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    SAVE                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

> **Member Fields:** nome, cognome, email, crewcode, telefono, baseCode,
> contrattoCode, gradeCode, itud, rsa, note
>
> **Lookup Validations:**
> - `lookup_base` - Validates against bases.codice
> - `lookup_grade` - Validates against grades.codice for the selected role
> - `lookup_contract` - Validates against contracts.codice

---

## 6. PDF Upload / Extraction Flow (v1.3)

### 6.1 Entry Point

The FAB (+) in the members list opens an **Action Sheet**:

```
┌─────────────────────────────┐
│                             │
│  How do you want to add     │
│  a new member?              │
│                             │
│  ┌─────────────────────┐    │
│  │ 📄  Upload PDF      │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ ✏   Manual          │    │
│  │     entry           │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │     Cancel          │    │
│  └─────────────────────┘    │
└─────────────────────────────┘

ActionSheetIOS (iOS) / react-native-actions-sheet (Android)
```

### 6.2 PDF Upload Flow — Three-Tier Extraction (v1.3)

```
STEP 1: File Selection + Role Selection
┌─────────────────────────────┐
│ ←  New member from PDF      │
├─────────────────────────────┤
│                             │
│   Select member role:       │
│   ┌────────┐ ┌────────┐    │
│   │ Pilot  │ │ Cabin  │    │  ← Required to load correct field mapping
│   │        │ │ Crew   │    │
│   └────────┘ └────────┘    │
│                             │
│   ┌─────────────────────┐   │
│   │                     │   │
│   │   📄                │   │
│   │                     │   │
│   │  Upload the PDF     │   │  ← Tap to open file picker
│   │  of the membership  │   │
│   │  form               │   │
│   │                     │   │
│   │  [BROWSE FILES]     │   │  ← expo-document-picker
│   │                     │   │
│   └─────────────────────┘   │
│                             │
│  Supported formats: PDF     │
│  Max size: 10 MB            │
│                             │
└─────────────────────────────┘

File picker: DocumentPicker.getDocumentAsync({ type: 'application/pdf' })
```


STEP 2: Processing + Preview
┌─────────────────────────────┐
│ ←  Processing PDF...        │
├─────────────────────────────┤
│                             │
│   ┌─────────────────────┐   │
│   │                     │   │
│   │   ⏳                │   │  ← ActivityIndicator
│   │                     │   │
│   │  Extracting data    │   │
│   │  from PDF...        │   │
│   │                     │   │
│   │  [====>    ] 45%    │   │  ← Progress bar
│   │                     │   │
│   └─────────────────────┘   │
│                             │
│  Method: PDF Form Fields    │  ← Status badge updates
│  Confidence: 92%            │
│                             │
└─────────────────────────────┘

Extraction Result Badge colors:
  - Form Fields: green (#2E7D32) — "Extracted from form fields"
  - OCR: orange (#E65100) — "Extracted via OCR - please verify"
  - Manual: gray (#6C757D) — "Manual entry required"

STEP 3: Verification Screen (Split View)
┌─────────────────────────────┐
│ ←  Verify Member Data       │
├─────────────────────────────┤
│ ⚠ OCR Result - Please verify│  ← Warning banner if OCR/manual
├─────────────────────────────┤
│  ┌──────────┬────────────┐  │
│  │          │  Nome *    │  │
│  │   📄     │ ┌────────┐ │  │
│  │          │ │ Marco  │ │  │
│  │  PDF     │ └────────┘ │  │
│  │  Preview │            │  │
│  │  (tap    │  Cognome * │  │
│  │   to     │ ┌────────┐ │  │
│  │  zoom)   │ │Bianchi │ │  │
│  │          │ └────────┘ │  │
│  │          │            │  │
│  │ [View    │  Crewcode* │  │
│  │  PDF]    │ ┌────────┐ │  │
│  │          │ │AB1234  │ │  │
│  │          │ └────────┘ │  │
│  └──────────┴────────────┘  │
│                             │
│  [← PDF  Form →]            │  ← Toggle between PDF and form
│                             │
│  ┌─────────────────────┐    │
│  │     SAVE MEMBER     │    │
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘

On tablet/iPad: Side-by-side view
On phone: Tab toggle or swipe between PDF and form
```

### 6.3 Data Validation Errors

```
┌─────────────────────────────┐
│ ←  Verify Member Data       │
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐    │
│  │ ⚠ Validation Errors │    │  ← Alert banner
│  │                     │    │
│  │ • Email format      │    │
│  │   invalid           │    │
│  │ • Base code 'XYZ'   │    │
│  │   not found         │    │
│  └─────────────────────┘    │
│                             │
│  Email *                    │
│  ┌─────────────────────┐    │
│  │ marco.bianchi@      │    │  ← Red border for invalid
│  └─────────────────────┘    │
│  ⚠ Invalid email format     │  ← Inline error message
│                             │
│  Base *                     │
│  ┌─────────────────────┐    │
│  │ XYZ                 │    │  ← Red border
│  └─────────────────────┘    │
│  ⚠ Base 'XYZ' not found.    │
│    Available: FCO, MXP...   │
│                             │
└─────────────────────────────┘
```

---

## 7. UI States: Loading, Error, Empty State

### 7.1 Loading States

```
Initial Load (Full Screen):
┌─────────────────────────────┐
│                             │
│         [Logo]              │
│                             │
│      UnionConnect           │
│                             │
│        ⏳                   │  ← ActivityIndicator
│                             │
│    Loading members...       │
│                             │
└─────────────────────────────┘

List Loading (Skeleton):
┌─────────────────────────────┐
│                             │
│ ┌─────────────────────────┐ │
│ │ ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓▓ │ │  ← Skeleton placeholder
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓▓ │ │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │
│ └─────────────────────────┘ │
│ ...                         │
└─────────────────────────────┘

Pull-to-Refresh:
  ↓ Pull down to refresh indicator
```

### 7.2 Error States

```
Network Error:
┌─────────────────────────────┐
│                             │
│           ⚠️               │
│                             │
│    Connection Error         │
│                             │
│  Unable to connect to       │
│  the server. Please check   │
│  your internet connection.  │
│                             │
│  ┌─────────────────────┐    │
│  │    RETRY            │    │
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘

Empty State (No members):
┌─────────────────────────────┐
│                             │
│         👤                │
│                             │
│      No members yet         │
│                             │
│  Start by adding your       │
│  first member.              │
│                             │
│  ┌─────────────────────┐    │
│  │  + ADD MEMBER       │    │
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘

Empty State (Search results):
┌─────────────────────────────┐
│                             │
│         🔍                │
│                             │
│   No members found          │
│                             │
│  Try a different search     │
│  term or filter.            │
│                             │
│  [Clear filters]            │
│                             │
└─────────────────────────────┘
```

---

## 8. Notifications and Feedback

### 8.1 Toast Messages (react-native-toast-message)

```
Success:
┌─────────────────────────────────────┐
│  ✅  Member created successfully    │
└─────────────────────────────────────┘

Error:
┌─────────────────────────────────────┐
│  ❌  Failed to save member          │
│      Please try again               │
└─────────────────────────────────────┘

Warning:
┌─────────────────────────────────────┐
│  ⚠️  PDF quality may affect OCR     │
│      Please verify extracted data   │
└─────────────────────────────────────┘

Info:
┌─────────────────────────────────────┐
│  ℹ️  New version available          │
│      Update now for latest features │
└─────────────────────────────────────┘

Position: Bottom of screen
Duration: 3 seconds (5 seconds for errors)
Dismiss: Swipe up or tap
```

### 8.2 Push Notifications (Expo Notifications)

```
Foreground notification (in-app banner):
┌─────────────────────────────┐
│ 📬 New Member Registered    │
│ Marco Bianchi - FCO         │
│ [View]        [Dismiss]     │
└─────────────────────────────┘

Background notification (system):
  UnionConnect
  "New member registered: Marco Bianchi"

Notification types:
  • Welcome message sent
  • Base transfer completed
  • Urgent assembly notice
  • New document available
  • Password reset requested
```

### 8.3 Confirmation Dialogs

```
Destructive Action (Delete):
┌─────────────────────────────┐
│ Delete Member?              │
│                             │
│ This action cannot be       │
│ undone. Marco Bianchi will  │
│ be permanently deleted.     │
│                             │
│ [Cancel]     [Delete]       │
│              (red)          │
└─────────────────────────────┘

Confirmation (Logout):
┌─────────────────────────────┐
│ Logout                      │
│                             │
│ Are you sure you want to    │
│ logout?                     │
│                             │
│ [Cancel]     [Logout]       │
└─────────────────────────────┘

Native Alert.alert() API
```

---

## 9. Accessibility

### 9.1 React Native Accessibility Props

```typescript
// Button with accessibility
<TouchableOpacity
  onPress={handlePress}
  accessible={true}
  accessibilityLabel="Create new member"
  accessibilityHint="Opens the member creation form"
  accessibilityRole="button"
>
  <Text>Add Member</Text>
</TouchableOpacity>

// Form input with accessibility
<TextInput
  value={value}
  onChangeText={onChange}
  accessibilityLabel="Crewcode input"
  accessibilityHint="Enter your company crewcode"
  accessibilityErrorMessage={error}
/>

// Screen reader announcements
import { AccessibilityInfo } from 'react-native';

AccessibilityInfo.announceForAccessibility(
  'Member created successfully'
);
```

### 9.2 Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Screen reader support | All interactive elements labeled |
| Minimum touch target | 44x44 dp (React Native default) |
| Color contrast | WCAG AA compliant (4.5:1 minimum) |
| Focus indicators | Visible focus on all interactive elements |
| Reduce motion | Respect system accessibility settings |
| Dynamic type | Support system font size changes |

### 9.3 Testing with Screen Readers

```bash
# iOS VoiceOver testing
Settings → Accessibility → VoiceOver → ON

# Android TalkBack testing
Settings → Accessibility → TalkBack → ON

Test checklist:
□ All buttons have descriptive labels
□ Form inputs announce their purpose
□ Error messages are announced
□ Navigation between screens is clear
□ Status changes are announced
```

---

## 10. Mobile-First Considerations

### 10.1 Native App Advantages (Expo)

| Feature | Implementation | UX Benefit |
|---------|----------------|------------|
| Native performance | React Native native modules | 60fps smooth scrolling |
| Offline support | TanStack Query + AsyncStorage | View cached data without connection |
| Push notifications | Expo Notifications | Instant member notifications |
| Biometric auth | expo-local-authentication | Quick secure login with Face ID |
| Camera integration | expo-camera | Direct document scanning |
| File system | expo-file-system | PDF caching and management |
| OTA updates | Expo Updates | Bug fixes without app store review |

### 10.2 Responsive Patterns

```
Phone (Portrait) - Primary target:
┌─────────────────┐
│                 │
│   Single column │
│   Full width    │
│   Stacked       │
│                 │
│   Tab bar at    │
│   bottom        │
│                 │
└─────────────────┘

Tablet (Landscape):
┌─────────────────────────────┐
│         │                   │
│  List   │   Detail          │
│  40%    │   60%             │
│         │                   │
│         │                   │
├─────────┴───────────────────┤
│         Tab bar             │
└─────────────────────────────┘

iPad Pro:
┌─────────────────────────────────────┐
│ ≡ Menu │        Content             │
│        │                            │
│ Home   │                            │
│ Members│     Master-Detail          │
│ Profile│                            │
│        │                            │
└─────────────────────────────────────┘
```

### 10.3 Safe Areas and Notches

```typescript
// Safe area handling
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const Screen = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Content respects notch/status bar */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
```

### 10.4 Keyboard Handling

```typescript
// Keyboard avoiding view for forms
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={100}
  style={styles.container}
>
  <ScrollView>
    {/* Form fields */}
  </ScrollView>
</KeyboardAvoidingView>
```

### 10.5 Dark Mode Support

```typescript
// Dynamic colors based on theme
import { useColorScheme } from 'react-native';

const App = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const colors = isDark ? darkColors : lightColors;
  
  return (
    <ThemeProvider theme={colors}>
      <NavigationContainer>
        {/* App content */}
      </NavigationContainer>
    </ThemeProvider>
  );
};
```

Dark mode colors:
```
Light mode:
  background: #F8F9FA
  surface: #FFFFFF
  text: #212529
  
Dark mode:
  background: #121212
  surface: #1E1E1E
  text: #E8E8E8
```

---

## 11. Navigation Gestures

### 11.1 Standard React Navigation Gestures

| Gesture | Action |
|---------|--------|
| Swipe from left edge | Go back (iOS) |
| Hardware back button | Go back (Android) |
| Pull down | Refresh list |
| Long press | Show context menu |
| Swipe left on item | Reveal actions (edit/delete) |
| Pinch | Zoom on PDF |
| Double tap | Zoom reset on PDF |

### 11.2 Custom Gestures

```typescript
// Swipe to delete with react-native-gesture-handler
<Swipeable
  renderRightActions={(progress, dragX) => (
    <DeleteAction dragX={dragX} onDelete={handleDelete} />
  )}
>
  <MemberCard member={member} />
</Swipeable>

// Pull to refresh
<FlatList
  data={members}
  renderItem={renderMember}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
/>
```

---

*This document describes the UX/UI design for UnionConnect mobile app built with Expo and React Native. For technical implementation details, see `03-frontend-architecture.md`.*
