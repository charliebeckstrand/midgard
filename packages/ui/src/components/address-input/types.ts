/**
 * A geocoded match's address in parts, as the provider resolved them. Every
 * field is optional, because a geocoder answers with what it knows: a named
 * park has no house number, and a whole city has no street.
 *
 * Parted rather than left in the display `label` alone, because a consumer that
 * stores a match needs the pieces — a place filtered by state, an order shipped
 * to a street — and the only other way to them is to parse the label back apart.
 */
export type AddressParts = {
	street?: string
	city?: string
	/** The first-level division: a US state, a Canadian province, a German Land. */
	state?: string
	postcode?: string
	country?: string
}

/** A single geocoded match: a stable `id`, display `label`, optional `description`, the business or place `name` where the match is one, the parted `address`, coordinates, and the provider's `raw` payload. */
export type AddressSuggestion = {
	/**
	 * The match's identity, for a consumer that stores or de-duplicates matches.
	 *
	 * A provider states it and `AddressInput` never relies on it: the field is
	 * only as unique as the provider that minted it, and geocoders do return one
	 * underlying object as several matches. The component keys its options by
	 * occurrence and compares selections by the suggestion itself, so a colliding
	 * id costs a consumer their own storage and nothing here.
	 */
	id: string
	label: string
	description?: string
	/**
	 * The business or place name, where the match names one — "Clearwater
	 * Restaurant" against the street line that locates it. Absent on a plain
	 * address, which names nothing but where it is.
	 *
	 * It is what a business search is for: the label leads with it, so a reader
	 * searching by name reads the name back, and a consumer storing the match
	 * keeps the name and the address apart.
	 */
	name?: string
	/** The match's address in parts; see {@link AddressParts}. */
	address?: AddressParts
	latitude?: number
	longitude?: number
	raw?: unknown
}

/** Geocoding strategy: resolves a query string to address suggestions, honoring the supplied `AbortSignal` for cancellation. */
export type AddressProvider = (
	query: string,
	options: { signal: AbortSignal },
) => Promise<AddressSuggestion[]>
