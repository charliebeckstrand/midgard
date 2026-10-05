/**
 * A random version 4 UUID, also on an origin that is not a secure context.
 *
 * `crypto.randomUUID` is only in a secure context. A plain-HTTP origin, such as
 * a LAN address, is not one, and there the call throws. `crypto.getRandomValues`
 * is in all contexts, so this function makes the UUID from its bytes when
 * `crypto.randomUUID` is not there.
 *
 * Use it for an id that must not repeat across sessions, such as the id of a
 * chat message that a store keeps.
 *
 * @returns A UUID such as `'3b241101-e2bb-4255-8caf-4136c566a962'`.
 * @internal
 */
export function randomId(): string {
	if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

	const bytes = crypto.getRandomValues(new Uint8Array(16))

	// The version (4) and the variant (RFC 9562) bits.
	bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40

	bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
