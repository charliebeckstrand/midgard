'use client'

import { createContext, use } from 'react'

const SkeletonContext = createContext(false)

export const SkeletonProvider = SkeletonContext.Provider

/**
 * Returns `true` when the current subtree is rendering inside a `<Skeleton>`.
 * Components call this to replace themselves with a matching placeholder.
 */
export function useSkeleton() {
	return use(SkeletonContext)
}
