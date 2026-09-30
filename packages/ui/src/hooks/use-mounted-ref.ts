'use client'

import { type RefObject, useEffect, useRef } from 'react'

/**
 * Gives a ref that reads `true` while the component is mounted, and `false`
 * before the first effect and after the unmount. A callback that runs later,
 * such as the settle of a promise, reads it to change nothing once the
 * component is gone. Read it only in an effect, an event, or a callback.
 *
 * @returns The ref of the mount.
 * @internal
 */
export function useMountedRef(): RefObject<boolean> {
	const mountedRef = useRef(false)

	useEffect(() => {
		mountedRef.current = true

		return () => {
			mountedRef.current = false
		}
	}, [])

	return mountedRef
}
