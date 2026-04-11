'use client'

import { createContext } from '../../core'

type CommandPaletteContextValue = {
	close: () => void
	query: string
}

export const [CommandPaletteProvider, useCommandPaletteContext] =
	createContext<CommandPaletteContextValue>('CommandPalette')
