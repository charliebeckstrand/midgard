'use client'

import { useEffect, useLayoutEffect } from 'react'

/**
 * `useLayoutEffect` in the browser, `useEffect` during SSR. React warns on a
 * bare `useLayoutEffect` when it renders on the server, since the effect can
 * never fire there; resolving to `useEffect` in that environment silences the
 * warning without changing browser behavior.
 *
 * @internal
 */
export const useIsomorphicLayoutEffect: typeof useLayoutEffect =
	typeof window !== 'undefined' ? useLayoutEffect : useEffect
