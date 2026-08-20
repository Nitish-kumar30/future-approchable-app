# Recreate two Claude 101 quizzes (SQL script)

Idempotent upsert script exported from the Test database for:

- Claude 101 - Sub Agents, Hooks and Claude.MD (4 questions)
- Claude 101 - Skills, Connectors and More (6 questions)

Both quizzes have `session_id`/`course_id` NULL and are attached to a session through `session_quizzes`. The session links are included but commented, since the target environment will likely have different session IDs.

## Script

```sql
-- Quiz 1: Claude 101 - Sub Agents, Hooks and Claude.MD
INSERT INTO public.quizzes (id, title, session_id, course_id, questions)
VALUES (
  '8ed1987f-5df2-404a-be9b-9f1069feef3a',
  'Claude 101 - Sub Agents, Hooks and Claude.MD',
  NULL, NULL,
  '[
    {"id":"c41ecb0e-177c-4ed2-89b9-a9844edf1dd6","type":"mcq","question":"How is a hook different from a chat instruction?","options":["Hooks only work on weekends","Hooks always run; instructions can be skipped ","Hooks need manual approval","No real difference "],"correctAnswer":1},
    {"id":"3761361e-07f2-4467-8b92-dabc71492487","type":"mcq","question":"What is Claude.md?","options":["A settings toggle","A chat log you paste in","A plugin from a marketplace ","A markdown file Claude auto-loads each session "],"correctAnswer":3},
    {"id":"cb23baf1-5963-47c1-a62b-eb34eb457a8b","type":"mcq","question":"Simplest way to build a custom subagent?","options":["Describe it in English, Claude builds it","Write it in code yourself","Copy a fixed template only ","Only Anthropic can create one"],"correctAnswer":0},
    {"id":"e7903903-3a13-4991-b07e-81707ff20469","type":"subjective","question":"Any feedback you have on the course?","options":[],"correctAnswer":0}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    questions = EXCLUDED.questions,
    updated_at = now();

-- Quiz 2: Claude 101 - Skills, Connectors and More
INSERT INTO public.quizzes (id, title, session_id, course_id, questions)
VALUES (
  'e594f76b-f5ab-4d0b-a9b9-1f34848beb6a',
  'Claude 101 - Skills, Connectors and More',
  NULL, NULL,
  '[
    {"id":"a5bb9c5a-95ac-43a3-b0b7-89a28b377382","type":"mcq","question":"What are the other two parts every skill has apart from name?","options":["A title and a price","A short description and the full instructions","A connector and a plugin","A chat log and a summary"],"correctAnswer":1},
    {"id":"351dc5a0-5be2-482d-b35c-f3120a69ace7","type":"mcq","question":"What tool helps you build a custom skill without coding? ","options":["Claude Code ","Artifacts tab ","Skill Creator ","Plugin Marketplace"],"correctAnswer":2},
    {"id":"4d1f5330-3d94-43df-8aac-26d965d5a255","type":"mcq","question":"What does a plugin bundle together in one install?","options":["Only chat history","Only third-party apps ","Just custom instructions","Skills, connectors, and sometimes helper agents"],"correctAnswer":3},
    {"id":"68067721-9137-45ae-bd64-34a4ea365a03","type":"mcq","question":"What three things does a project have that a regular chat doesn''t? ","options":["A logo, a theme, and a name ","A knowledge base, custom instructions, and its own chat history","A calendar, a task list, and a chat log"," A connector, a plugin, and a skill"],"correctAnswer":1},
    {"id":"b4caee56-84c5-477c-9e5e-a32d398ea75f","type":"mcq","question":"What can you do if the app you want isn''t listed in the connectors directory?","options":["Nothing, it''s not possible"," Wait for Anthropic to add it","Use a custom connector pointing to that service''s own MCP server ","Use the Skill Creator instead"],"correctAnswer":2},
    {"id":"41157ddf-3f50-4c61-8691-bf657c52cd84","type":"subjective","question":"Any feedback you have on the course?","options":[],"correctAnswer":0}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    questions = EXCLUDED.questions,
    updated_at = now();

-- Optional: attach to sessions (replace session IDs for the target environment)
-- INSERT INTO public.session_quizzes (session_id, quiz_id, display_order)
-- VALUES ('6e4a0b5d-e923-4a10-aadd-56297c822e5e', '8ed1987f-5df2-404a-be9b-9f1069feef3a', 0),
--        ('271ac320-ebbe-4f21-b625-602126a30834', 'e594f76b-f5ab-4d0b-a9b9-1f34848beb6a', 0);
```

## Correct answers (quick reference)

Sub Agents, Hooks and Claude.MD
- Hook vs chat instruction -> "Hooks always run; instructions can be skipped"
- What is Claude.md -> "A markdown file Claude auto-loads each session"
- Simplest way to build a subagent -> "Describe it in English, Claude builds it"

Skills, Connectors and More
- Two other parts of a skill -> "A short description and the full instructions"
- Build a skill without coding -> "Skill Creator"
- Plugin bundles -> "Skills, connectors, and sometimes helper agents"
- Project vs chat -> "A knowledge base, custom instructions, and its own chat history"
- App not in connectors directory -> "Use a custom connector pointing to that service's own MCP server"

## Notes

- Apostrophes in option/question text are escaped as `''` for SQL literals.
- The script is data-only (no schema changes) and safe to re-run.
- If the target environment already has quizzes with these UUIDs, they are updated in place rather than duplicated.
