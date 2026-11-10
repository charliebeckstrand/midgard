'use client'

import { type ReactNode, useEffect, useMemo } from 'react'
import { writeRootDensity } from '../../core/density/steps'
import { ROOT_GLASS_OFF_CLASS } from '../../core/glass/root'
import { ROOT_REDUCED_MOTION_CLASS } from '../../core/motion/root'
import { ROOT_OFFCANVAS_SIDEBAR_CLASS } from '../../core/sidebar/root'
import { ReducedMotionContext } from '../../primitives/reduced-motion/context'
import { matchesMediaQuery, subscribeMediaQuery } from '../../utilities/media-query'
import { levelToStep } from '../density/context'
import { GlassOffContext } from '../glass/context'
import {
	DARK_SCHEME,
	DENSITY,
	GLASS,
	MOTION,
	readChoice,
	SIDEBAR,
	subscribeChoices,
	THEME,
} from './appearance-storage'
import { AppearanceContext } from './context'
import { FontScript } from './font-script'
import { useAppearanceChoice } from './use-appearance-choice'

/** Props for {@link AppearanceProvider}: the `children` that take the appearance. */
export type AppearanceProviderProps = {
	children: ReactNode
}

/**
 * App-root owner of the theme, density, motion, sidebar, and glass preferences. It keeps them
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
 * While the sidebar is `'offcanvas'`, the root element has the
 * `sidebar-offcanvas` class, which the `sidebar-offcanvas` variant of
 * `ui/tailwind.css` reads. `SidebarLayout` then shows its sidebar as a floating
 * sheet while its layout is inline.
 *
 * While the glass is `'off'`, the root element has the `glass-off` class, which
 * the `glass-off` variant of `ui/tailwind.css` reads. A glass overlay panel
 * then paints flat before hydration. The provider also gives the choice to
 * `useGlass` and `useResolvedSurface`, so each glass-aware component renders
 * its flat surface. The settings dialog has no picker for the glass: an app
 * that has glass surfaces adds its own field.
 *
 * Render one instance for each app. All instances share the storage keys and
 * the root element, so a region cannot hold an appearance of its own.
 *
 * The app's stylesheet must key its `dark` variant on the class, for example
 * `@custom-variant dark (&:where(.dark, .dark *))`. Each choice has a copy in
 * a cookie, so the server writes the classes of the stored theme, density,
 * motion, sidebar, and glass on the root before the first paint (`rootMarks` in
 * `ui/providers/ui`). With no cookie, the choices apply at hydration. A light
 * theme adds the `light` class, so a `dark` variant can follow the OS while
 * the root has no theme class.
 *
 * It renders the script of the latin face of the font before its children
 * ({@link FontScript}), so latin text paints in the font from the first paint.
 * In the server render, it also puts a `preload` link for that script in the
 * head.
 * Render it above all text of the page, as the root layout of an app does.
 *
 * @remarks The server render and the hydration render use the defaults
 * (`'system'`, `'snug'`, `'system'`, and `'locked'`) for the values of the
 * context. The root element carries the stored choices from the first paint,
 * so each stepped `density-*` class is correct at once. A component that reads
 * the step as a JS value takes it one render after hydration.
 */
export function AppearanceProvider({ children }: AppearanceProviderProps) {
	const [theme, setTheme] = useAppearanceChoice(THEME)

	const [density, setDensity] = useAppearanceChoice(DENSITY)

	const [motion, setMotion] = useAppearanceChoice(MOTION)

	const [sidebar, setSidebar] = useAppearanceChoice(SIDEBAR)

	const [glass, setGlass] = useAppearanceChoice(GLASS)

	useEffect(() => {
		// The classes on the root are side effects, not rendered state, so the
		// store drives them directly. The effect does not read `theme`,
		// `density`, `motion`, `sidebar`, or `glass`: during hydration they hold the defaults, and a
		// value from a default would undo what the server set.
		let unsubscribeScheme: (() => void) | undefined

		const root = document.documentElement

		const apply = (dark: boolean) => root.classList.toggle('dark', dark)

		// A `dark` variant that follows the OS with no class (as in the docs)
		// reads `.light` as a light theme that the reader chose.
		const applyLight = (light: boolean) => root.classList.toggle('light', light)

		const sync = () => {
			const stored = readChoice(THEME)

			applyLight(stored === 'light')

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

			const level = readChoice(DENSITY)

			writeRootDensity(root, levelToStep[level])

			const motionChoice = readChoice(MOTION)

			root.classList.toggle(ROOT_REDUCED_MOTION_CLASS, motionChoice === 'reduced')

			root.classList.toggle(ROOT_OFFCANVAS_SIDEBAR_CLASS, readChoice(SIDEBAR) === 'offcanvas')

			root.classList.toggle(ROOT_GLASS_OFF_CLASS, readChoice(GLASS) === 'off')
		}

		sync()

		const unsubscribe = subscribeChoices(sync)

		return () => {
			unsubscribe()

			unsubscribeScheme?.()
		}
	}, [])

	const value = useMemo(
		() => ({
			theme,
			density,
			motion,
			sidebar,
			glass,
			setTheme,
			setDensity,
			setMotion,
			setSidebar,
			setGlass,
		}),
		[theme, density, motion, sidebar, glass, setTheme, setDensity, setMotion, setSidebar, setGlass],
	)

	return (
		<AppearanceContext value={value}>
			<ReducedMotionContext value={motion === 'reduced'}>
				<GlassOffContext value={glass === 'off'}>
					<FontScript />
					{children}
				</GlassOffContext>
			</ReducedMotionContext>
		</AppearanceContext>
	)
}
