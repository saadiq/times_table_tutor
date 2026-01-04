# Progress View Enhancement Design

## Overview

Transform the Learn view's "Overview" mode into a rich progress dashboard that shows parents both engagement patterns and mastery progression. Features a 12×12 times table grid for current mastery state and a GitHub-style activity calendar for tracking practice consistency.

## Data Model

### Attempt Record Structure

Each practice attempt stores:

```typescript
interface AttemptRecord {
  id: string              // UUID for sync deduplication
  factKey: string         // "7x8"
  timestamp: string       // ISO date
  correct: boolean
  responseTimeMs: number
  inputMethod: 'multiple_choice' | 'number_pad'
  hintShown: boolean
  profileId?: string      // For cloud sync association
}
```

### D1 Schema Addition

```sql
CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  fact_key TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  correct INTEGER NOT NULL,
  response_time_ms INTEGER,
  input_method TEXT,
  hint_shown INTEGER,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
CREATE INDEX idx_attempts_profile_timestamp ON attempts(profile_id, timestamp);
```

## Storage & Sync Strategy

### Recording Attempts

When a fact is answered (in PracticeView):
1. Create `AttemptRecord` with all fields
2. Push to `localStorage` pending queue immediately
3. Trigger background sync if online

### Sync Process

```
On attempt recorded:
  → Add to pending queue (localStorage)
  → If online + has profile:
      → POST /api/attempts/sync with pending batch
      → On success: clear synced items from pending queue
      → On failure: keep in queue, retry later

On app load:
  → If online + has profile:
      → GET /api/attempts?since={lastSyncTimestamp}
      → Merge cloud data into local cache
      → Update lastSyncTimestamp
```

### Conflict Resolution

- Cloud is source of truth once synced
- Pending local attempts always sync up (append-only, no conflicts)
- UUID per attempt prevents duplicates

### Storage Limits

- Local cache: Keep last 30 days for offline display
- Cloud: Unlimited history

## UI Components

### 12×12 Mastery Grid

Interactive grid showing all 144 facts at a glance.

**Cell States** (color-coded):
- **New** (gray): Never attempted
- **Learning** (warm yellow): Attempted but not yet confident
- **Confident** (light green): Consistent recent success
- **Mastered** (solid green): Fully learned

**Cell Details** (on tap):
- The fact and answer (7 × 8 = 56)
- Accuracy percentage (85% correct)
- Total attempts (12 times)
- Last practiced (2 days ago)
- Input method trend ("Now using number pad")

**Grid Header**:
- Row/column labels (1-12)
- Summary stats: "89 mastered · 23 learning · 32 new"

**Mobile Considerations**:
- Grid fits on mobile with small cells (~28px)
- Tap to expand fact details in bottom sheet
- Optional: Focus table highlighting

### Activity Calendar

GitHub-style contribution heat map.

**Layout**:
- 7 rows (days of week) × ~15 columns (weeks)
- Shows approximately 3 months of history
- Most recent week on the right

**Cell Intensity** (based on facts practiced):
- Empty/light gray: No practice
- Light green: 1-10 attempts
- Medium green: 11-25 attempts
- Dark green: 26+ attempts

**Summary Stats**:
- "Practiced 5 of the last 7 days"
- "Current streak: 3 days"
- "Longest streak: 12 days"
- "This week: 47 facts practiced"

**Tap Interaction** (day detail):
- Facts practiced: 23
- Accuracy: 87%
- New facts mastered: 2
- Time range: "4:15 PM - 4:28 PM"

**Position**: Below mastery grid, collapsible section

## Learn View Integration

### Tab Structure

**Tab 1: "Learn" (unchanged)**
- Pick a table, see fact cards, learn visually
- Child-focused learning experience

**Tab 2: "Progress" (replaces Overview)**
- Summary stats bar: "52% mastered · 3-day streak"
- 12×12 mastery grid (primary visual)
- Activity calendar (collapsible)

### Sync Status Indicator

Small icon in Progress tab header:
- ✓ green: Synced
- ↻ spinning: Syncing
- ○ gray: Offline (using local data)

## API Endpoints

New Pages Functions:

- `POST /api/attempts/sync` - Upload batch of attempts
- `GET /api/attempts` - Fetch attempts (with optional `since` param)
- `GET /api/attempts/summary` - Aggregated stats for efficient loading

## File Structure

### New Files

```
src/
├── stores/
│   └── attemptsStore.ts       # Attempt history + sync logic
├── components/
│   └── progress/
│       ├── MasteryGrid.tsx    # 12×12 interactive grid
│       ├── ActivityCalendar.tsx # Heat map component
│       ├── FactDetailSheet.tsx  # Bottom sheet for fact details
│       └── SyncStatusBadge.tsx  # Sync state indicator
├── lib/
│   └── attemptSync.ts         # Sync queue management
functions/
├── api/
│   └── attempts/
│       ├── sync.ts            # POST batch upload
│       └── index.ts           # GET history/summary
migrations/
└── 0002_attempts_table.sql    # D1 schema addition
```

### Files to Modify

- `src/views/LearnView.tsx` - Replace Overview with Progress tab
- `src/views/PracticeView.tsx` - Record attempts with new data
- `src/stores/progressStore.ts` - Hook into attempt recording

## Design Principles

- **Encouraging, not anxiety-inducing**: No "you're behind!" messaging
- **Mobile-first**: Touch-friendly grid, bottom sheets for details
- **Offline-first**: Works without connection, syncs when available
- **ADHD-friendly**: Visual progress, clear streaks, dopamine-positive feedback
