'use client'

import { type CurrentContextValue, CurrentProvider, useCurrent } from '../../primitives'

export type NavContextValue = CurrentContextValue

export const NavProvider = CurrentProvider

export function useNavContext() {
	return useCurrent()
}
