/** A promise that `use()` reads with no suspend: React reads `status` and `value`. */
export type Settled<T> = Promise<T> & { status: 'fulfilled'; value: T }

/** A fulfilled promise that `use()` reads with no suspend. */
export function settled<T>(value: T): Settled<T> {
	return Object.assign(Promise.resolve(value), { status: 'fulfilled' as const, value })
}
