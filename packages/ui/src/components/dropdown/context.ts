import { createContext } from '../../core'

export interface DropdownContextValue {
	open: boolean
	toggle: () => void
	close: () => void
	fullWidth?: boolean
}

export const [DropdownProvider, useDropdown] = createContext<DropdownContextValue>('Dropdown')
