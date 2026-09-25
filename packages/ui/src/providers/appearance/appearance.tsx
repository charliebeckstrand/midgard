'use client'

import { type ReactNode, useEffect, useMemo } from 'react'
import { matchesMediaQuery, subscribeMediaQuery } from '../../utilities/media-query'
import { type DensityLevel, densityLevels } from '../density/context'
import { DensityProvider } from '../density/density'
import {
	DARK_SCHEME,
	DENSITY_KEY,
	readChoice,
	subscribeChoices,
	THEME_KEY,
} from './appearance-storage'
import { AppearanceContext, type ThemeMode, themeModes } from './context'
import { useAppearanceChoice } from './use-appearance-choice'

const THEME_VALUES = themeModes.map((option) => option.value)

const DENSITY_VALUES = densityLevels.map((level) => level.value)

/** Props for {@link AppearanceProvider}: the `children` that take the appearance. */
export type AppearanceProviderProps = {
	children: ReactNode
}

/**
 * App-root owner of the theme and density preferences. It keeps both in
 * `localStorage` and broadcasts the density through `<DensityProvider>`. It
 * toggles the `.dark` class on the root element, and while the theme is
 * `'system'` it follows the OS preference live. {@link useAppearance} reads the
 * state, and {@link AppearanceSettings} edits it.
 *
 * The app's stylesheet must key its `dark` variant on the class, for example
 * `@custom-variant dark (&:where(.dark, .dark *))`. On a server-rendered page,
 * render {@link AppearanceScript} in the document head, so the stored theme
 * applies before the first paint.
 *
 * @remarks The server render and the hydration render use the defaults
 * (`'system'` and `'snug'`). A stored density therefore applies one render after
 * hydration.
 */
export function AppearanceProvider({ children }: AppearanceProviderProps) {
	const [theme, setTheme] = useAppearanceChoice<ThemeMode>(THEME_KEY, THEME_VALUES, 'system')

	const [density, setDensity] = useAppearanceChoice<DensityLevel>(
		DENSITY_KEY,
		DENSITY_VALUES,
		'snug',
	)

	useEffect(() => {
		// The class is a side effect, not rendered state, so the store drives it
		// directly. The effect does not read `theme`: during hydration `theme` holds
		// the default, and a class from that default would undo the class that
		// `AppearanceScript` set.
		let unsubscribeScheme: (() => void) | undefined

		const apply = (dark: boolean) => document.documentElement.classList.toggle('dark', dark)

		const sync = () => {
			const stored = readChoice<ThemeMode>(THEME_KEY, THEME_VALUES, 'system')

			unsubscribeScheme?.()

			unsubscribeScheme = undefined

			if (stored === 'system') {
				apply(matchesMediaQuery(DARK_SCHEME))

				unsubscribeScheme = subscribeMediaQuery(DARK_SCHEME, () =>
					apply(matchesMediaQuery(DARK_SCHEME)),
				)
			} else {
				apply(stored === 'dark')
			}
		}

		sync()

		const unsubscribe = subscribeChoices(sync)

		return () => {
			unsubscribe()

			unsubscribeScheme?.()
		}
	}, [])

	const value = useMemo(
		() => ({ theme, density, setTheme, setDensity }),
		[theme, density, setTheme, setDensity],
	)

	return (
		<AppearanceContext value={value}>
			<DensityProvider density={density}>{children}</DensityProvider>
		</AppearanceContext>
	)
}
