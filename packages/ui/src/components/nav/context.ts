'use client'

import { type CurrentContextValue, CurrentProvider, useCurrentContext } from '../../primitives'

export type NavContextValue = CurrentContextValue

export const NavProvider = CurrentProvider

export function useNavContext() {
	return useCurrentContext()
}
