export type AddressSuggestion = {
	id: string
	label: string
	description?: string
	latitude?: number
	longitude?: number
	raw?: unknown
}

export type AddressProvider = (
	query: string,
	options: { signal: AbortSignal },
) => Promise<AddressSuggestion[]>
