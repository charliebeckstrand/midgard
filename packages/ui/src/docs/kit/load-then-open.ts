import { useCallback, useState } from 'react'
import { noop } from '../../utilities/noop.ts'
import { useFail } from './fail.ts'
import { useIdle } from './idle.ts'

/**
 * Holds the open state of a panel whose content is in a chunk of its own, such
 * as "Show code" or an entry of the API reference.
 *
 * The chunk loads in idle time after the mount, or when the reader points at
 * the panel (`warm`). A load in the background that fails does nothing.
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
	load,
	loaded,
	prime,
}: {
	initial: T
	/** Loads the chunk. It must keep its identity. */
	load: () => Promise<M>
	/** Tells if the chunk is loaded. */
	loaded: () => boolean
	/** More work in idle time after the load. It must keep its identity. */
	prime?: (module: M, signal: AbortSignal) => unknown
}): { open: T; change: (update: (current: T) => T) => void; warm: () => void } {
	const [open, setOpen] = useState(initial)

	const prepare = useCallback(
		(signal: AbortSignal) =>
			load()
				.then((module) => prime?.(module, signal))
				.catch(noop),
		[load, prime],
	)

	useIdle(prepare)

	const fail = useFail()

	const change = (update: (current: T) => T) => {
		if (loaded()) setOpen(update)
		else load().then(() => setOpen(update), fail)
	}

	const warm = () => {
		load().catch(noop)
	}

	return { open, change, warm }
}
