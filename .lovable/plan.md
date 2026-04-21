

## Plan: Insert 4 approved registrations (with per-user capstone flag)

Insert 4 rows into `cohort_registrations` with `status = 'approved'`. Capstone office hours flag varies per user:

| Name | Email | Capstone Office Hours |
|---|---|---|
| chiranjeevi pothuganti | chiru.p149@gmail.com | **true** |
| Aziz | m.a.aziz@gmail.com | **true** |
| Amit Kumar | 11amitvishwas@gmail.com | false |
| Rohit Mahadev | rama153052@gmail.com | false |

### Execution

1. Insert into the **test (preview) database** via the database insert tool.
2. Provide the exact SQL `INSERT` statement in chat so you can run it manually on the live database.

### Field mapping (from CSV)

- `name`, `email`, `whatsapp_number`, `company`, `role` → from CSV
- `cohort` → `"Cohort 5 - April 23rd, 7:30PM IST/10 AM US Eastern"` (canonical string)
- `interests` → array of standard options matched from "What do you want to learn?"; free-text extras (e.g., "Building agents to streamline workflows") go to `other_interest`
- `reason` → "Why do you want to join a study group?"
- `additional_info` → "Anything else we should know?" (null when blank)
- `status` → `'approved'`
- `capstone_office_hours` → `true` for Aziz & Chiranjeevi, `false` for Amit & Rohit
- `created_at`, `updated_at` → `now()` (defaults)

### Result

After insert, all 4 will appear in Admin → **Registrations** (status: approved) and **Unenrolled** (no enrollment record yet). You'll receive the SQL to replay against your live DB.

### Files touched

None — pure data insert.

