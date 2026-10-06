/** No-op function. */
export const noop: () => void = () => {}

/**
 * A `useSyncExternalStore` subscription that never fires. It serves a read with
 * no store, and a snapshot that changes only at hydration.
 */
export const noopSubscribe = (): (() => void) => noop
