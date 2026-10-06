'use client'

import { type ReactNode, useEffect, useMemo } from 'react'
import { writeRootDensity } from '../../core/density'
import { rootReducedMotionClass } from '../../core/motion/root'
import { ReducedMotionContext } from '../../primitives/reduced-motion/context'
import { matchesMediaQuery, subscribeMediaQuery } from '../../utilities/media-query'
import { type DensityLevel, densityLevels, levelToStep } from '../density/context'
import {
	DARK_SCHEME,
	DENSITY_DEFAULT,
	DENSITY_KEY,
	MOTION_DEFAULT,
	MOTION_KEY,
	readChoice,
	subscribeChoices,
	THEME_DEFAULT,
	THEME_KEY,
} from './appearance-storage'
import {
	AppearanceContext,
	type MotionMode,
	motionModes,
	type ThemeMode,
	themeModes,
} from './context'
import { FontScript } from './font-script'
import { useAppearanceChoice } from './use-appearance-choice'

const THEME_VALUES = themeModes.map((option) => option.value)

const DENSITY_VALUES = densityLevels.map((level) => level.value)

const MOTION_VALUES = motionModes.map((option) => option.value)

/** Props for {@link AppearanceProvider}: the `children` that take the appearance. */
export type AppearanceProviderProps = {
	children: ReactNode
}

/**
 * App-root owner of the theme, density, and motion preferences. It keeps them
 * in `localStorage`. It toggles the `.dark` class on the root element, and while
 * the theme is `'system'` it follows the OS preference live. It writes the step
 * of the density as a class on the root element (`writeRootDensity`), which
 * makes the root the density scope of the app. At `md` the root has no class.
 * {@link useAppearance} reads the state, and {@link AppearanceSettings} edits it.
 *
 * While the motion is `'reduced'`, the root element has the `reduced-motion`
 * class, which the `motion-reduce` and `motion-safe` variants of
 * `ui/tailwind.css` read. The provider also gives the choice to the JS readers
 * of reduced motion: `usePrefersReducedMotion` and the `ReducedMotion` roots.
 * While the motion is `'system'`, the platform `prefers-reduced-motion` setting
 * decides.
 *
 * Render one instance for each app. All instances share the storage keys and
 * the root element, so a region cannot hold an appearance of its own.
 *
 * The app's stylesheet must key its `dark` variant on the class, for example
 * `@custom-variant dark (&:where(.dark, .dark *))`. On a server-rendered page,
 * render {@link AppearanceScript} in the document head, so the stored theme,
 * density, and motion apply before the first paint. `UIDocument` renders the
 * script and this provider together.
 *
 * It renders the script of the latin face of the font before its children
 * ({@link FontScript}), so latin text paints in the font from the first paint.
 * Render it above all text of the page, as the root layout of an app does.
 *
 * @remarks The server render and the hydration render use the defaults
 * (`'system'`, `'snug'`, and `'system'`) for the values of the context. The root element
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

	const [motion, setMotion] = useAppearanceChoice<MotionMode>(
		MOTION_KEY,
		MOTION_VALUES,
		MOTION_DEFAULT,
	)

	useEffect(() => {
		// The classes on the root are side effects, not rendered state, so the
		// store drives them directly. The effect does not read `theme`,
		// `density`, or `motion`: during hydration they hold the defaults, and a
		// value from a default would undo what `AppearanceScript` set.
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

			writeRootDensity(root, levelToStep[level])

			const motionChoice = readChoice<MotionMode>(MOTION_KEY, MOTION_VALUES, MOTION_DEFAULT)

			root.classList.toggle(rootReducedMotionClass, motionChoice === 'reduced')
		}

		sync()

		const unsubscribe = subscribeChoices(sync)

		return () => {
			unsubscribe()

			unsubscribeScheme?.()
		}
	}, [])

	const value = useMemo(
		() => ({ theme, density, motion, setTheme, setDensity, setMotion }),
		[theme, density, motion, setTheme, setDensity, setMotion],
	)

	return (
		<AppearanceContext value={value}>
			<ReducedMotionContext value={motion === 'reduced'}>
				<FontScript />
				{children}
			</ReducedMotionContext>
		</AppearanceContext>
	)
}
