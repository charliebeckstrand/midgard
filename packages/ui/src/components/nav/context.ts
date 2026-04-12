'use client'

import { createContext, useContext } from 'react'

export type NavContextValue = {
	value: string | undefined
	onChange: ((value: string) => void) | undefined
}

const NavContext = createContext<NavContextValue | undefined>(undefined)

export const NavProvider = NavContext.Provider

export function useNavContext() {
	return useContext(NavContext)
}
