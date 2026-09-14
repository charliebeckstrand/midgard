import { useEffect } from 'react'
import { useMediaQuery } from '../../../hooks'
import { usePersistedChoice } from './use-persisted-choice'

export type ThemeMode = 'light' | 'dark' | 'system'

/** Theme options surfaced by the docs settings dialog. */
export const themeModes: { label: string; value: ThemeMode }[] = [
	{ label: 'Light', value: 'light' },
	{ label: 'Dark', value: 'dark' },
	{ label: 'System', value: 'system' },
]

const STORAGE_KEY = 'theme'

const THEME_VALUES = themeModes.map((option) => option.value)

/**
 * Resolves the docs theme from a `light | dark | system` preference, toggling
 * the root `.dark` class and persisting the choice. While `system`, it tracks
 * the OS preference live through the package's pooled media-query subscription.
 */
export function useTheme() {
	const [mode, setMode] = usePersistedChoice<ThemeMode>(STORAGE_KEY, THEME_VALUES, 'system')

	const systemDark = useMediaQuery('(prefers-color-scheme: dark)')

	useEffect(() => {
		document.documentElement.classList.toggle(
			'dark',
			mode === 'system' ? systemDark : mode === 'dark',
		)
	}, [mode, systemDark])

	return [mode, setMode] as const
}
