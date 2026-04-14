'use client'

import { createContext, use } from 'react'

const SkeletonContext = createContext(false)

export const SkeletonProvider = SkeletonContext.Provider

/** Returns true inside a Skeleton subtree. */
export function useSkeleton() {
	return use(SkeletonContext)
}
