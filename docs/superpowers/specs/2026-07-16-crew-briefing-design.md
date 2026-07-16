# Crew Briefing — Design

## Overview

New "Crew Briefing" section for crew to plan a multi-day trip (one or more duty days, each with one or more flight legs) and get, per leg, a focused weather + NOTAM briefing for departure, destination, and every alternate airport, covering the window from one hour before to one hour after the airport's scheduled use time.

## Goals

- Let a crew member enter a trip: days → legs (dep, arr, dynamic list of alternates, scheduled times).
- Optionally prefill a day's legs from a roster screenshot, reusing the existing AI duty-parser.
- Generate, per airport on a leg (dep/arr/alternates), a short AI-written briefing that surfaces critical weather first (thunderstorms, low ceiling/visibility, wind shear, icing, etc.) and lists only operationally relevant NOTAMs.
- Persist generated briefings so they're available for later reference, including offline.

## Non-goals

- Choosing/integrating a real NOTAM data provider (stubbed in this iteration — see "Open Items For Later").
- Automatic re-generation / scheduled refresh of briefings — generation is always user-triggered.
- Flight planning, fuel, or dispatch functionality — this is informational briefing only, not a dispatch release.

## Data Model

New tables under a new `crew-briefings` NestJS module (`api/src/crew-briefings/`), following existing module conventions (controller/service/entities/dto, TypeORM).

**`crew_briefing_trips`**
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | owner |
| label | varchar, nullable | optional user label; auto-derived from date range if omitted |
| created_at | timestamp | |

**`crew_briefing_legs`**
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| trip_id | uuid FK → crew_briefing_trips | |
| day_date | date | groups legs by day within a trip |
| order | int | sequence of the leg within the day |
| flight_number | varchar, nullable | carried over when imported from roster |
| dep_icao | varchar(4) | |
| dep_scheduled | timestamp | scheduled departure (airport local converted to UTC on save, same convention as existing date fields) |
| arr_icao | varchar(4) | |
| arr_scheduled | timestamp | scheduled arrival |

**`crew_briefing_alternates`**
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| leg_id | uuid FK → crew_briefing_legs | |
| icao | varchar(4) | |
| role | enum: `destination`, `enroute`, `takeoff` | free-form list per leg, no fixed count |

**`crew_briefing_results`**
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| leg_id | uuid FK → crew_briefing_legs | |
| icao | varchar(4) | which airport this result covers (dep, arr, or one of the alternates) |
| airport_role | enum: `departure`, `arrival`, `alternate` | |
| generated_at | timestamp | |
| metar_raw | text, nullable | |
| taf_raw | text, nullable | |
| notam_raw | jsonb | array of NOTAM items used (empty while NOTAM source is stubbed) |
| narrative_text | text | AI-generated briefing |
| flight_category | enum (VFR/MVFR/IFR/LIFR) | reuses existing `FlightCategory` |
| has_critical_weather | boolean | drives red-flag UI |

Regenerating a leg's briefing for an airport inserts a new `crew_briefing_results` row rather than overwriting — cheap (a handful of rows per leg) and preserves history of what was known at generation time.

## Backend Architecture

- **`CrewBriefingsModule`** — new module, imports existing `MetarModule` (reuses `MetarService.getWeather(icao)` — no duplicate weather-fetch code) and a new `NotamModule`.
- **`NotamService`** (new, `api/src/notam/`) — interface `getNotams(icao: string, windowStart: Date, windowEnd: Date): Promise<NotamItem[]>`. Stub implementation returns `[]` for this iteration. Kept behind a single injectable class so swapping in a real provider (e.g. Aviation Edge) later touches one file.
- **AI narrative** — reuses `AiService.generate(prompt, systemPrompt, userId)` (existing `api/src/ai/ai.service.ts`, Anthropic-backed). New prompt file `api/src/ai/prompts/crew-briefing.prompt.ts`. One AI call per airport-role (not batched per leg) — smaller prompts, and one airport's failure doesn't block the others.
- **Roster import** — new endpoint delegates to existing `AiService.parseDuty()` (already extracts flight number, dep/arr airport + local time from a roster screenshot or pasted text). Returns parsed draft legs to the client for review/edit; does not persist. Alternates are never present in roster data and must always be added manually.

### Endpoints

| method | path                                   | purpose                                                                                                               |
| ------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| POST   | `/crew-briefings/trips`                | create a trip with its days/legs/alternates in one payload                                                            |
| GET    | `/crew-briefings/trips`                | list current user's trips                                                                                             |
| GET    | `/crew-briefings/trips/:id`            | trip detail: legs, alternates, latest result per airport                                                              |
| POST   | `/crew-briefings/legs/:legId/generate` | fetch weather + NOTAMs for every airport on the leg (dep, arr, all alternates), call AI, persist results, return them |
| POST   | `/crew-briefings/parse-roster`         | wraps `AiService.parseDuty()`, returns draft leg data for prefill                                                     |

All endpoints scoped to the authenticated user (own trips only — no admin cross-user visibility needed for v1).

## Weather & NOTAM Logic

- **Time window:** per airport-role, window = scheduled use time ± 1 hour. Dep airport uses `dep_scheduled`; arrival and alternates use `arr_scheduled` (an alternate only matters around the arrival/diversion time).
- **Weather:** `MetarService.getWeather(icao)` returns METAR + decoded TAF with per-period forecast times; the briefing generator selects the TAF forecast period(s) overlapping the window.
- **Critical-weather flags** reuse existing utils, no new thresholds invented:
  - `calculateFlightCategory()` → VFR/MVFR/IFR/LIFR
  - `isBadWeather()` scanned across in-window METAR/TAF phenomena (TS, CB, TCU, WS, GR, FZRA, FZDZ, SS, DS)
  - `has_critical_weather = category is IFR/LIFR OR isBadWeather match`
- **NOTAMs:** `NotamService.getNotams()` filters by validity window server-side (once a real provider is wired in). The AI prompt is additionally instructed to select only operationally relevant NOTAMs (runway/ILS/nav-aid closures, obstacles, airspace restrictions) and skip administrative noise (parking, office hours) — this instruction holds regardless of which provider is plugged in later.
- **AI narrative** receives: ICAO, airport role, raw METAR, in-window TAF excerpt, filtered NOTAM list, and the computed flags. Output: critical weather called out first when flagged, then routine conditions, then relevant NOTAMs — short and scannable, not a full met report dump.

## Frontend

New `apps/mobile/src/screens/crewBriefing/` + `apps/mobile/src/api/crewBriefingApi.ts`. Added to the Tools section of `DrawerNavigator` (new icon, e.g. `ClipboardList` from lucide-react-native).

**Screens:**

- **`CrewBriefingListScreen`** — list of trips (date range + leg count), "+ New Trip". Drawer entry point; uses `navigation.openDrawer()` per project convention.
- **`CrewBriefingCreateScreen`** — build a trip: add day → add leg(s) per day (dep, arr, dynamic alternate list with role picker, sched dep/arr time pickers). "Import from roster screenshot" button at the top opens the image picker, calls `parse-roster`, prefills day/legs for review before the user adds alternates manually and saves via `POST /crew-briefings/trips`.
- **`CrewBriefingTripDetailScreen`** — trip grouped by day; each leg is a card (dep → arr, sched times, alternate chips). Tapping a leg opens leg detail.
- **`CrewBriefingLegDetailScreen`** — one section per airport (dep, arr, each alternate). Each section shows "Generate briefing" if no result yet, or the latest result (flight-category badge, red critical-weather banner when flagged, AI narrative, collapsible raw METAR/TAF, NOTAM list) plus a "Refresh" button to regenerate.

**Offline support** (follows existing `offlineStore` pattern — Zustand + AsyncStorage, same as categories/urgencies):

- On successful generate, the returned results are written into `offlineStore` under a `crewBriefingResults` map keyed by `legId`; trip/leg/alternate structure is cached on trip fetch too, so a trip already opened once online stays browsable offline.
- Trip/leg detail screens read from TanStack Query when online, fall back to the `offlineStore` cache when `offlineStore.isOnline === false`.
- "Generate"/"Refresh" buttons are disabled while offline (weather/NOTAM/AI calls need network); previously generated results always render from cache regardless of connectivity.
- The Crew Briefing drawer entry stays visible offline (list + viewing works), unlike network-only screens like Members/Statistics.

**Conventions followed:** `CrewBriefingCreateScreen`'s ScrollView (multiple TextInputs: times, ICAO codes) wrapped in `KeyboardAvoidingView`; any ICAO-autocomplete `FlatList` gets `keyboardShouldPersistTaps="handled"`.

## Open Items For Later

- Real NOTAM provider selection and integration (Aviation Edge / Notamify / other) — `NotamService` is the single seam to change.
- Whether admins should see other users' trips (not needed for v1 — personal tool).
