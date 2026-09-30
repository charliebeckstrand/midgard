'use client'

import { type ReactNode, useEffect, useMemo } from 'react'
import { rootDensityAttribute } from '../../core/density'
import { matchesMediaQuery, subscribeMediaQuery } from '../../utilities/media-query'
import { type DensityLevel, densityLevels, levelToStep } from '../density/context'
import {
	DARK_SCHEME,
	DENSITY_DEFAULT,
	DENSITY_KEY,
	readChoice,
	subscribeChoices,
	THEME_DEFAULT,
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
 * `localStorage`. It toggles the `.dark` class on the root element, and while
 * the theme is `'system'` it follows the OS preference live. It writes the step
 * of the density to `data-density-root` on the root element, which makes the
 * root the density scope of the app. {@link useAppearance} reads the state, and
 * {@link AppearanceSettings} edits it.
 *
 * The app's stylesheet must key its `dark` variant on the class, for example
 * `@custom-variant dark (&:where(.dark, .dark *))`. On a server-rendered page,
 * render {@link AppearanceScript} in the document head, so the stored theme and
 * density apply before the first paint.
 *
 * @remarks The server render and the hydration render use the defaults
 * (`'system'` and `'snug'`) for the values of the context. The root element
 * carries the stored choices from the first paint, so each class that selects
 * its step through the `density-*` variants is correct at once. A component
 * that reads the step as a JS value takes it one render after hydration.
 */
export function AppearanceProvider({ children }: AppearanceProviderProps) {
	const [theme, setTheme] = useAppearanceChoice<ThemeMode>(THEME_KEY, THEME_VALUES, THEME_DEFAULT)

	const [density, setDensity] = useAppearanceChoice<DensityLevel>(
		DENSITY_KEY,
		DENSITY_VALUES,
		DENSITY_DEFAULT,
	)

	useEffect(() => {
		// The class and the attribute are side effects, not rendered state, so the
		// store drives them directly. The effect does not read `theme` or
		// `density`: during hydration they hold the defaults, and a value from a
		// default would undo what `AppearanceScript` set.
		let unsubscribeScheme: (() => void) | undefined

		const root = document.documentElement

		const apply = (dark: boolean) => root.classList.toggle('dark', dark)

		const sync = () => {
			const stored = readChoice<ThemeMode>(THEME_KEY, THEME_VALUES, THEME_DEFAULT)

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

			const level = readChoice<DensityLevel>(DENSITY_KEY, DENSITY_VALUES, DENSITY_DEFAULT)

			root.setAttribute(rootDensityAttribute, levelToStep[level])
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

	return <AppearanceContext value={value}>{children}</AppearanceContext>
}
