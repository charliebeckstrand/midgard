'use client'

import { createContext } from '../../core'

/** Returns true inside a Skeleton subtree. */
export const [SkeletonProvider, useSkeleton] = createContext<boolean>('Skeleton', {
	default: false,
})
