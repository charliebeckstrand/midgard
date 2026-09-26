'use client'

import { useEffectEvent, useState } from 'react'

/**
 * Gives an event handler that keeps one identity for the life of the component,
 * and that calls the newest `handler` when it runs.
 *
 * The hook wraps `useEffectEvent`. That built-in gives a new wrapper on each
 * render, but each wrapper reads the same cell. React writes the newest handler
 * to that cell before the effects of a commit run. The hook keeps the wrapper
 * from the first render, so the identity does not change.
 *
 * Use it where a `useCallback` or a `useMemo` calls an effect event. The React
 * Compiler reads the effect event as a dependency. Because the list of
 * dependencies does not name it, the compiler cannot keep the memoization, and
 * it skips the whole component. A stable event is one identity, so the list can
 * name it, and the memo stays stable.
 *
 * Do not call the handler during render. It throws, as an effect event does.
 *
 * @param handler The function to call. It can change on each render.
 * @returns A function with one identity for the mount.
 * @internal
 */
export function useStableEvent<Args extends unknown[], Result>(
	handler: (...args: Args) => Result,
): (...args: Args) => Result {
	const event = useEffectEvent(handler)

	const [stable] = useState(() => event)

	return stable
}
