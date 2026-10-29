import { useCallback, useState } from 'react'
import { useLazyModule } from '../../hooks/use-lazy-module.ts'
import type { LazyModule } from '../../utilities/lazy-module.ts'
import { noop } from '../../utilities/noop.ts'
import { useFail } from './fail.ts'
import { useIdle } from './idle.ts'

/**
 * Holds the open state of a panel whose content is in a chunk of its own, such
 * as "Show code" or an entry of the API reference, and gives the chunk when it
 * is loaded.
 *
 * The chunk loads in idle time after the mount, or when the reader points at
 * the panel (`warm`). A load in the background that fails does nothing. The
 * idle load is the one of the kit ({@link useIdle}), so a browser with no
 * `requestIdleCallback`, such as Safari, starts it at once.
 *
 * A change applies when the chunk is loaded, so the panel opens at its full
 * height with its content in it. A panel that suspends opens empty, and React
 * then holds the content back for at least 300 ms. When the load fails, the
 * error boundary shows the failure.
 *
 * A change is a function of the current state. Two changes before the load
 * each apply to the state that the one before them made.
 */
export function useLoadThenOpen<T, M>({
	initial,
	lazy,
	prime,
}: {
	initial: T
	/** The chunk. Each mount of the same chunk shares one load. It must keep its identity. */
	lazy: LazyModule<M>
	/** More work in idle time after the load. It must keep its identity. */
	prime?: (module: M, signal: AbortSignal) => unknown
}): {
	/** The chunk, or `null` until it is loaded. */
	module: M | null
	open: T
	change: (update: (prev: T) => T) => void
	warm: () => void
} {
	const [open, setOpen] = useState(initial)

	const module = useLazyModule(lazy, false)

	const prepare = useCallback(
		(signal: AbortSignal) =>
			lazy
				.load()
				.then((loaded) => prime?.(loaded, signal))
				.catch(noop),
		[lazy, prime],
	)

	useIdle(prepare)

	const fail = useFail()

	const change = (update: (prev: T) => T) => {
		if (module !== null) setOpen(update)
		else lazy.load().then(() => setOpen(update), fail)
	}

	const warm = () => {
		lazy.load().catch(noop)
	}

	return { module, open, change, warm }
}
