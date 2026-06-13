'use client'

import { createContext } from '../../core'

// `query`/`deferredQuery` live in the shared query context
// (`useCommandPaletteQuery`), kept out of this one so items, which read only
// `close`, don't re-render on every keystroke.
type CommandPaletteContextValue = {
	close: () => void
}

/**
 * Provides the enclosing {@link CommandPalette}'s `close` callback. Items read
 * only `close` here; the query lives in a separate context so keystrokes don't
 * re-render every item.
 *
 * @returns The palette context with its `close` function.
 */
export const [CommandPaletteContext, useCommandPaletteContext] =
	createContext<CommandPaletteContextValue>('CommandPalette')
