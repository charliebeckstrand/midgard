import { useEffect, useState } from 'react'
import { useMediaQuery } from 'ui/hooks'
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

/**
 * Resolves the site theme from a `light | dark | system` preference, toggling
 * the root `.dark` class and persisting the choice. While `system`, it tracks
 * the OS preference live through ui's pooled {@link useMediaQuery}. Mirrors the
 * pre-hydration script in `index.html`, which paints the stored preference
 * before React mounts.
 */
export function useTheme() {
	const [mode, setMode] = useState<ThemeMode>(readStoredMode)

	const systemDark = useMediaQuery('(prefers-color-scheme: dark)')

	useEffect(() => {
		localStorage.setItem(THEME_KEY, mode)

		const dark = mode === 'system' ? systemDark : mode === 'dark'

		document.documentElement.classList.toggle('dark', dark)
	}, [mode, systemDark])

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
