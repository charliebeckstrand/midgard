'use client'

import { CurrentContext, type CurrentContextValue, useCurrent } from '../../primitives/current'

export type NavContextValue = CurrentContextValue

export const NavContext = CurrentContext

export function useNavContext() {
	return useCurrent()
}
