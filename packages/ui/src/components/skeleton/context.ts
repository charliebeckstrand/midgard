'use client'

import { createContext } from '../../core'

/**
 * Ambient flag — true inside `<Skeleton>`. Sized leaf controls short-circuit
 * to render a `<Placeholder>` shaped from `kokkaku` instead of their real
 * markup. See `src/docs/CASCADES.md`.
 */
export const [SkeletonProvider, useSkeleton] = createContext<boolean>('Skeleton', {
	default: false,
})
