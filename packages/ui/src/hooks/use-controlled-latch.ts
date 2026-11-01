'use client'

import { useState } from 'react'

/**
 * Whether a controllable binding is controlled. The first `value` that is not
 * `undefined` takes control for the mount, and a later `undefined` does not
 * give it back. {@link useControllable} reads its binding through this hook, so
 * a caller that must know whether that binding is controlled can read the same
 * answer. Adjusted during render.
 *
 * @internal
 */
export function useControlledLatch(value: unknown): boolean {
	const [latched, setLatched] = useState(value !== undefined)

	if (value !== undefined && !latched) setLatched(true)

	return latched || value !== undefined
}
