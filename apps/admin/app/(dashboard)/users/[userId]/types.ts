/**
 * A chat conversation record, as the gateway returns it from
 * `/api/users/:id/chats`.
 *
 * @remarks
 * The field names are the wire's own, so `page.tsx` casts the parsed JSON to
 * this type and maps nothing.
 */
export type Chat = {
	id: string
	user_id: string
	created_at: string
	updated_at: string
}
