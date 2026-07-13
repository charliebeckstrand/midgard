/** Options accepted by {@link useThing}. */
export type ThingOptions = {
	/** Whether the thing starts enabled. */
	enabled?: boolean

	/** Number of steps the thing advances. */
	count: number
}

/**
 * Track a thing's running count behind a reset.
 *
 * @returns The resolved count paired with a reset callback.
 */
export function useThing({ enabled, count }: ThingOptions): [number, () => number] {
	return [enabled ? count : 0, () => count]
}
