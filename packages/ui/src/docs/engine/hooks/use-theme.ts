import { type ThemeMode, useTheme as useThemeContext } from '../../../providers/theme'

export type { ThemeMode }

/** Theme options surfaced by the docs settings dialog. */
export const themeModes: { label: string; value: ThemeMode }[] = [
	{ label: 'Light', value: 'light' },
	{ label: 'Dark', value: 'dark' },
	{ label: 'System', value: 'system' },
]

/**
 * Tuple adapter over the public `ThemeProvider` context (mounted by the
 * engine host), preserving the docs engine's `[mode, setMode]` shape. The
 * provider owns resolution, persistence, and the root `.dark` class.
 */
export function useTheme() {
	const { mode, setMode } = useThemeContext()

	return [mode, setMode] as const
}
