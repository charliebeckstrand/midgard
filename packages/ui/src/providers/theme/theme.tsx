'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import {
	type ResolvedThemeMode,
	ThemeContext,
	type ThemeContextValue,
	type ThemeMode,
} from './context'

/** Props for {@link ThemeProvider}. */
export type ThemeProviderProps = {
	/**
	 * The preference applied when storage holds none.
	 * @defaultValue 'system'
	 */
	defaultMode?: ThemeMode
	/**
	 * The `localStorage` key the preference persists under. Match the
	 * `ThemeScript` key when both are mounted.
	 * @defaultValue 'theme'
	 */
	storageKey?: string
	/**
	 * Brand theme name, stamped as `data-theme` on the root element so a
	 * consumer stylesheet can override the token ramps of `ui/theme.css`
	 * under `[data-theme='…']`. Omit to leave the default brand active.
	 */
	theme?: string
	children: ReactNode
}

function isMode(value: unknown): value is ThemeMode {
	return value === 'light' || value === 'dark' || value === 'system'
}

/** The stored preference, falling back on the default when absent / unreadable. */
function readStoredMode(storageKey: string, defaultMode: ThemeMode): ThemeMode {
	if (typeof window === 'undefined') return defaultMode

	try {
		const stored = localStorage.getItem(storageKey)

		return isMode(stored) ? stored : defaultMode
	} catch {
		return defaultMode
	}
}

/** Resolve a preference to the mode the document should carry right now. */
function resolveMode(mode: ThemeMode): ResolvedThemeMode {
	if (mode !== 'system') return mode

	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'

	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Owns the colour-scheme seam: resolves a `light | dark | system` preference,
 * toggles the root `.dark` class (the `dark` variant of `ui/theme.css`),
 * mirrors the result into `color-scheme` for native chrome, persists the
 * choice, and stamps an optional brand theme as `data-theme`. While
 * `system`, the OS preference is tracked live via `matchMedia`.
 *
 * @remarks
 * The class lands in an effect, after first paint. Server-rendered apps
 * mount {@link ThemeScript} before the page body paints to apply the stored
 * preference pre-hydration (and add `suppressHydrationWarning` to `<html>`,
 * whose class the script may change before React attaches).
 *
 * @see {@link useTheme} for reading the mode at a leaf.
 */
export function ThemeProvider({
	defaultMode = 'system',
	storageKey = 'theme',
	theme,
	children,
}: ThemeProviderProps) {
	const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode(storageKey, defaultMode))

	const [resolvedMode, setResolvedMode] = useState<ResolvedThemeMode>(() => resolveMode(mode))

	useEffect(() => {
		try {
			localStorage.setItem(storageKey, mode)
		} catch {
			// Storage can be unavailable (private browsing); the mode still applies.
		}

		const apply = () => {
			const resolved = resolveMode(mode)

			document.documentElement.classList.toggle('dark', resolved === 'dark')

			document.documentElement.style.colorScheme = resolved

			setResolvedMode(resolved)
		}

		apply()

		if (mode !== 'system' || typeof window.matchMedia !== 'function') return

		const media = window.matchMedia('(prefers-color-scheme: dark)')

		media.addEventListener('change', apply)

		return () => media.removeEventListener('change', apply)
	}, [mode, storageKey])

	useEffect(() => {
		if (theme === undefined) return

		document.documentElement.dataset.theme = theme

		return () => {
			delete document.documentElement.dataset.theme
		}
	}, [theme])

	const setMode = useCallback((next: ThemeMode) => setModeState(next), [])

	const value = useMemo<ThemeContextValue>(
		() => ({ mode, resolvedMode, setMode, theme }),
		[mode, resolvedMode, setMode, theme],
	)

	return <ThemeContext value={value}>{children}</ThemeContext>
}
