import { useState } from 'react'

/**
 * The target a form drawer last opened on, or the current one while it is
 * open. A close clears the caller's target, and the panel stays mounted while
 * it slides out. Read directly, an edit would empty its own fields halfway
 * through its exit. Only an open writes the held target, so the next open still
 * seeds from what it was handed. The write happens during render, so no commit
 * passes with a stale target.
 */
export function useHeldTarget<T>(target: T | null): T | null {
	const [held, setHeld] = useState(target)

	if (target !== null && target !== held) setHeld(target)

	return target ?? held
}
