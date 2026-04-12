'use client'

import { createContext, use } from 'react'

const GlassContext = createContext(false)

export const GlassProvider = GlassContext.Provider

/**
 * Returns `true` when the current subtree is rendering inside a `<Glass>`.
 * Components call this to swap their opaque surface for a translucent,
 * frosted-glass appearance.
 */
export function useGlass() {
	return use(GlassContext)
}
