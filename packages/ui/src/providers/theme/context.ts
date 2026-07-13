'use client'

import { createContext } from '../../core'

/** The theme preference: an explicit mode or `system` (follow the OS). */
export type ThemeMode = 'light' | 'dark' | 'system'

/** The mode a `system` preference resolves to at runtime. */
export type ResolvedThemeMode = 'light' | 'dark'

/** The value {@link useTheme} reads inside a `<ThemeProvider>`. */
export type ThemeContextValue = {
	/** The stored preference (`light` / `dark` / `system`). */
	mode: ThemeMode
	/** The mode currently applied to the document; `system` resolved via `matchMedia`. */
	resolvedMode: ResolvedThemeMode
	/** Stores and applies a new preference. */
	setMode: (mode: ThemeMode) => void
	/** The active brand theme (the root's `data-theme` value), when one is set. */
	theme?: string
}

/**
 * Theme context: the mode preference, its resolution, and the setter.
 * Required — {@link useTheme} throws outside a `<ThemeProvider>`.
 */
export const [ThemeContext, useTheme] = createContext<ThemeContextValue>('Theme')
