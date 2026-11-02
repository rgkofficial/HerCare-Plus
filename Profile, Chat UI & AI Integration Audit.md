# Profile, Chat UI & AI Integration Audit

## Initial findings

The repository had a basic local-storage profile page and a single `/checker` symptom conversation. There was no conversation database, conversation-list API, message history service, attachment endpoint, upload storage, realtime channel, or backend profile model. The Gemini API was server-side, but unexpected request errors returned a successful-looking fallback response, which prevented the UI from showing a true retry state.

## Completed

- Profile page now supports nickname, optional age, 240-character bio, local avatar upload, save/cancel behavior, validation, loading state, success state, and error state.
- Profile values persist across refresh using the existing browser storage model. Existing unrelated keys are preserved.
- Avatar files are restricted to images under 2 MiB and remain local because no profile-storage backend exists.
- Chat layout was redesigned for desktop and mobile with a responsive message column, safe-area-aware composer, accessible labels, visible focus rings, long-message wrapping, language selection, suggestion chips, status announcements, and an empty/loading/error experience.
- Duplicate requests are prevented while the current request is pending.
- User messages have sent/failed states and a retry action.
- Local chat history is retained for the last 50 messages and can be cleared from chat options.
- Auto-scroll only follows new messages while the user is near the bottom; reading older messages is not interrupted. A “Jump to latest” control appears after the user scrolls away.
- AI response errors now return HTTP 500 at the outer API boundary, allowing the chat to show a retry state. Gemini keys remain server-only.

## Remaining blockers and priorities

### High — persistent conversations

**Status:** blocked by missing backend support. There is no conversation/message schema, ownership model, or API. The UI uses browser-local history only.

**Reproduction:** open `/checker`, send a message, then inspect network requests: only `/api/gemini` exists; there is no conversation persistence request. Clear site storage or use another device and the history is unavailable.

**Plan:** add authenticated `conversations` and `messages` tables with owner-scoped queries, message status/idempotency keys, retention/deletion controls, and API tests for cross-account isolation.

### High — attachments

**Status:** not implemented because there is no upload backend, malware scanning, private storage, or attachment authorization contract.

**Reproduction:** the chat composer has no upload control because adding one without storage validation would create an unsafe dead button.

**Plan:** reuse the secure medical-document storage patterns only after defining allowed chat attachment types, scanning, size limits, signed access, and retention.

### Medium — realtime updates and recovery

**Status:** unsupported by the current architecture. Gemini responses are request/response only.

**Plan:** add a provider-backed realtime channel or polling contract, connection state, idempotent message delivery, and recovery tests.

### Medium — distributed rate limiting

**Status:** current Gemini route uses an in-memory edge-runtime map. It is useful for a single instance but is not a distributed production limit.

**Plan:** move rate limiting to a shared provider or platform middleware and key it by an authenticated subject where available, with a privacy-preserving fallback for anonymous users.

### Low — screenshots

**Status:** not captured in this sandbox because browser automation is unavailable in the current execution environment. The build and automated checks were run instead.

## AI safety notes

The endpoint keeps API keys server-side, sanitizes bounded text input, detects urgent symptom patterns before model calls, retries transient Gemini failures, and falls back to deterministic informational responses when the configured model is unavailable. The application must continue to present responses as support/information rather than diagnosis or treatment. Fallback text and model output should be reviewed clinically before any production medical claim is made.
