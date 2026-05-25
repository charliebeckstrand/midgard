'use client'

import { createContext } from '../../core'

type CommandPaletteContextValue = {
	close: () => void
	query: string
}

export const [CommandPaletteContext, useCommandPaletteContext] =
	createContext<CommandPaletteContextValue>('CommandPalette')
