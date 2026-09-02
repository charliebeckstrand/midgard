import { useEffect } from 'react'
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

function prefersDark(): boolean {
	return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Resolves the docs theme from a `light | dark | system` preference, toggling
 * the root `.dark` class and persisting the choice. While `system`, it tracks
 * the OS preference live via `matchMedia`.
 */
export function useTheme() {
	const [mode, setMode] = usePersistedChoice<ThemeMode>(STORAGE_KEY, THEME_VALUES, 'system')

	useEffect(() => {
		const apply = () => {
			const dark = mode === 'system' ? prefersDark() : mode === 'dark'

			document.documentElement.classList.toggle('dark', dark)
		}

		apply()

		if (mode !== 'system') return

		const media = window.matchMedia('(prefers-color-scheme: dark)')

		media.addEventListener('change', apply)

		return () => media.removeEventListener('change', apply)
	}, [mode])

	return [mode, setMode] as const
}
