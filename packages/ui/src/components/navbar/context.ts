'use client'

import { createContext, useContext } from 'react'

const NavbarContext = createContext(false)

export const NavbarProvider = NavbarContext.Provider

export function useNavbar() {
	return useContext(NavbarContext)
}
