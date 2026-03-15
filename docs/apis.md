# API Routes & Contracts

## POST /api/chat/agent

- **Request:** `{ messages: ChatMessage[] }` — full conversation history
- **Response:** `{ message: string }` — the agent's reply text
- **Auth:** required (protected by heimdall proxy)
- **Notes:** Currently returns a simulated response. The endpoint is a Next.js API route (not proxied to Bifrost). The client sends the full message history so the agent has conversational context.

## POST /api/chat/{chatId}

- **Request:** `{ message: string, role: 'user' | 'agent' }` — a single message to persist
- **Response:** `{ message: string }`
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
