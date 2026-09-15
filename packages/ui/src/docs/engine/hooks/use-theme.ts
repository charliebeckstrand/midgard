import { useEffect } from 'react'
import { matchesMediaQuery, subscribeMediaQuery } from '../../../utilities/media-query'
import { usePersistedChoice } from './use-persisted-choice'

export type ThemeMode = 'light' | 'dark' | 'system'

/** Theme options surfaced by the docs settings dialog. */
export const themeModes: { label: string; value: ThemeMode }[] = [
	{ label: 'Light', value: 'light' },
	{ label: 'Dark', value: 'dark' },
	{ label: 'System', value: 'system' },
]

const STORAGE_KEY = 'theme'

const DARK_SCHEME = '(prefers-color-scheme: dark)'

const THEME_VALUES = themeModes.map((option) => option.value)

/**
 * Resolves the docs theme from a `light | dark | system` preference, toggling
 * the root `.dark` class and persisting the choice. While `system`, it tracks
 * the OS preference live through the package's pooled media-query subscription.
 *
 * The class is a side effect, not rendered state. The subscription therefore
 * drives it straight from the listener, as `useOffcanvas` does, rather than
 * through a render the whole docs tree would pay for.
 */
export function useTheme() {
	const [mode, setMode] = usePersistedChoice<ThemeMode>(STORAGE_KEY, THEME_VALUES, 'system')

	useEffect(() => {
		const apply = () => {
			document.documentElement.classList.toggle(
				'dark',
				mode === 'system' ? matchesMediaQuery(DARK_SCHEME) : mode === 'dark',
			)
		}

		apply()

		return mode === 'system' ? subscribeMediaQuery(DARK_SCHEME, apply) : undefined
	}, [mode])

	return [mode, setMode] as const
}
