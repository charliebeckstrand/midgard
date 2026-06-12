'use client'

import { createContext } from '../../core'

// `query`/`deferredQuery` live in the shared query context
// (`useCommandPaletteQuery`), kept out of this one so items — which read only
// `close` — don't re-render on every keystroke.
type CommandPaletteContextValue = {
	close: () => void
}

export const [CommandPaletteContext, useCommandPaletteContext] =
	createContext<CommandPaletteContextValue>('CommandPalette')
