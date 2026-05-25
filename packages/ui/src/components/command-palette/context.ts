'use client'

import { createContext } from '../../core'

type CommandPaletteContextValue = {
	close: () => void
	query: string
	deferredQuery: string
}

export const [CommandPaletteContext, useCommandPaletteContext] =
	createContext<CommandPaletteContextValue>('CommandPalette')
