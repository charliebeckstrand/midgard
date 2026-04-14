'use client'

import { createContext, use } from 'react'

const GlassContext = createContext(false)

export const GlassProvider = GlassContext.Provider

/** Returns true inside a Glass subtree. */
export function useGlass() {
	return use(GlassContext)
}
