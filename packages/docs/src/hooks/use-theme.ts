import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

/** Theme options surfaced by the docs settings dialog. */
export const themeModes: { label: string; value: ThemeMode }[] = [
	{ label: 'Light', value: 'light' },
	{ label: 'Dark', value: 'dark' },
	{ label: 'System', value: 'system' },
]

const STORAGE_KEY = 'theme'

function readStoredMode(): ThemeMode {
	const stored = localStorage.getItem(STORAGE_KEY)

	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored

	return 'system'
}

function prefersDark(): boolean {
	return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Resolves the docs theme from a `light | dark | system` preference, toggling
 * the root `.dark` class and persisting the choice. While `system`, it tracks
 * the OS preference live via `matchMedia`.
 */
export function useTheme() {
	const [mode, setMode] = useState<ThemeMode>(readStoredMode)

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, mode)

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
