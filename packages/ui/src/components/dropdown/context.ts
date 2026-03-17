import { createContext as reactCreateContext, useContext } from 'react'

export interface DropdownContextValue {
	open: boolean
	toggle: () => void
	close: () => void
	fullWidth?: boolean
}

const DropdownContext = reactCreateContext<DropdownContextValue | null>(null)

export const DropdownProvider = DropdownContext.Provider

export function useDropdown(): DropdownContextValue {
	const value = useContext(DropdownContext)
	if (value === null) {
		throw new Error('useDropdown must be used within <Dropdown>')
	}
	return value
}

/** Returns the dropdown context or `null` when not inside a `<Dropdown>`. */
export function useDropdownContext(): DropdownContextValue | null {
	return useContext(DropdownContext)
}
