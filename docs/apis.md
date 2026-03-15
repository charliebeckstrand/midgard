# API Routes & Contracts

## POST /api/chat/agent

- **Request:** `{ messages: ChatMessage[] }` — full conversation history
- **Response:** AG-UI SSE event stream (`text/event-stream`)
- **Auth:** required (protected by heimdall proxy)
- **Notes:** Returns an AG-UI protocol event stream. Events follow the lifecycle: `RUN_STARTED` → `TEXT_MESSAGE_START` → `TEXT_MESSAGE_CONTENT` (streamed word-by-word) → `TEXT_MESSAGE_END` → `RUN_FINISHED`. Currently simulated. Uses `@ag-ui/core` for event types and `@ag-ui/encoder` for SSE encoding.

## POST /api/chat/{chatId}

- **Request:** `{ content: string, role: 'user' | 'agent' }` — a single message to persist
- **Response:** `{ content: string }`
- **Auth:** required
- **Notes:** Proxied to Bifrost. Called twice per user turn — once to save the user message, once to save the agent response.

## GET /api/chat/{chatId}

- **Request:** path param `chatId`
- **Response:** `{ messages: ChatMessage[] }`
- **Auth:** required
- **Notes:** Proxied to Bifrost. Returns the full message history for a chat.

## GET /api/chat

- **Request:** none
- **Response:** `Chat[]` — list of all chats for the authenticated user
- **Auth:** required
- **Notes:** Proxied to Bifrost. Used by the sidebar to list chats.

## DELETE /api/chat/{chatId}

- **Request:** path param `chatId`
- **Response:** `204 No Content`
- **Auth:** required
- **Notes:** Proxied to Bifrost. Deletes a chat and its messages.
