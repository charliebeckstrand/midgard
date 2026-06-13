/** A single geocoded address match: a stable `id`, display `label`, optional `description`, coordinates, and the provider's `raw` payload. */
export type AddressSuggestion = {
	id: string
	label: string
	description?: string
	latitude?: number
	longitude?: number
	raw?: unknown
}

/** Geocoding strategy: resolves a query string to address suggestions, honoring the supplied `AbortSignal` for cancellation. */
export type AddressProvider = (
	query: string,
	options: { signal: AbortSignal },
) => Promise<AddressSuggestion[]>
