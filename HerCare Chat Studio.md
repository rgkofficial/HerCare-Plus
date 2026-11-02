# HerCare Chat Studio

The `/checker` route is a mobile-first conversational health guidance studio. It provides local multi-session history, search, new/clear conversation controls, responsive drawer navigation, dark mode, quick prompts, lightweight markdown rendering, citation badges, offline recovery, and a persistent medical disclaimer.

## Streaming contract

`POST /api/chat/stream` accepts `{ "message": string }` and returns `text/event-stream` events:

- `meta`: `{ triage, reason, citations }`
- `token`: `{ text }` for incremental assistant rendering
- `done`: `{ triage }`

The endpoint limits a client key to 12 messages per minute, strips angle brackets, caps input at 2,000 characters, and emits no permanent signed links or health-document content. The current implementation uses a deterministic safety-first response generator so the UI works without an AI key; an AI provider can be inserted behind the same SSE contract.

## Clinical safeguards

Triage detects emergency signals such as severe bleeding, breathing difficulty, loss of consciousness, suicidal language, and severe pregnancy-related pain. Emergency responses tell the user to stop chatting and call 112 in India or their local emergency service. Advisory signals display a less severe care prompt. Triage is a safety signal, not a diagnosis and requires clinical review before production claims.

Chat history is stored in browser local storage under `hercare_chat_sessions`; users can clear it from the drawer. This is not a substitute for account-backed encrypted sync. The footer permanently states that guidance is educational and not a medical diagnosis.
