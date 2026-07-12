import { useEffect, useState } from 'react'
import { type DensityLevel, densityLevels } from 'ui/providers/density'

export type ThemeMode = 'light' | 'dark' | 'system'

/** Theme options surfaced by the settings dialog. */
export const themeModes: { label: string; value: ThemeMode }[] = [
	{ label: 'Light', value: 'light' },
	{ label: 'Dark', value: 'dark' },
	{ label: 'System', value: 'system' },
]

const THEME_KEY = 'theme'

function readStoredMode(): ThemeMode {
	const stored = localStorage.getItem(THEME_KEY)

	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored

	return 'system'
}

function prefersDark(): boolean {
	return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Resolves the site theme from a `light | dark | system` preference, toggling
 * the root `.dark` class and persisting the choice. While `system`, it tracks
 * the OS preference live via `matchMedia`. Mirrors the pre-hydration script in
 * `index.html`, which paints the stored preference before React mounts.
 */
export function useTheme() {
	const [mode, setMode] = useState<ThemeMode>(readStoredMode)

	useEffect(() => {
		localStorage.setItem(THEME_KEY, mode)

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

const DENSITY_KEY = 'density'

function readStoredDensity(): DensityLevel {
	const stored = localStorage.getItem(DENSITY_KEY)

	if (densityLevels.some((level) => level.value === stored)) return stored as DensityLevel

	return 'snug'
}

/**
 * Persisted density preference (`loose | snug | compact`), defaulting to
 * `snug`, the ambient `<Density>` default.
 */
export function useDensity() {
	const [density, setDensity] = useState<DensityLevel>(readStoredDensity)

	useEffect(() => {
		localStorage.setItem(DENSITY_KEY, density)
	}, [density])

	return [density, setDensity] as const
}
