'use client'

import { createContext } from '../../core'

/**
 * Ambient flag — true inside `<Skeleton>`. Sized leaf controls short-circuit
 * to render a `<Placeholder>` shaped from `kokkaku` instead of their real
 * markup. Read at the leaf; does not compose into size resolution.
 */
export const [SkeletonProvider, useSkeleton] = createContext<boolean>('Skeleton', {
	default: false,
})
