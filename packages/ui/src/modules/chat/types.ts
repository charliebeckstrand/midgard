// `ChatContent` is the engine's vocabulary — the shape every transcript
// transform reads. This file re-exports it, so the module keeps one path to the
// type.
export type { ChatContent } from './engine/types'

/** A chat conversation record, as returned by the gateway. */
export type Chat = {
	id: string
	user_id: string
	created_at: string
	updated_at: string
}
