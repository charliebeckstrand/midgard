'use client'

import { type ReactNode, useEffect, useMemo } from 'react'
import { writeRootDensity } from '../../core/density/steps'
import { ROOT_REDUCED_MOTION_CLASS } from '../../core/motion/root'
import { ROOT_OFFCANVAS_SIDEBAR_CLASS } from '../../core/sidebar/root'
import { ROOT_GLASS_SURFACES_CLASS } from '../../core/surfaces/root'
import { ReducedMotionContext } from '../../primitives/reduced-motion/context'
import { matchesMediaQuery, subscribeMediaQuery } from '../../utilities/media-query'
import { levelToStep } from '../density/context'
import { GlassSurfacesContext } from '../glass/context'
import {
	DARK_SCHEME,
	DENSITY,
	MOTION,
	readChoice,
	SIDEBAR,
	SURFACES,
	subscribeChoices,
	THEME,
} from './appearance-storage'
import { AppearanceContext } from './context'
import { FontScript } from './font-script'
import { useAppearanceChoice } from './use-appearance-choice'

/** Props for {@link AppearanceProvider}: the `children` that take the appearance, and the font switch. */
export type AppearanceProviderProps = {
	children: ReactNode
	/**
	 * Whether the provider loads the latin face of the ui font
	 * ({@link FontScript}). Give `false` when the app paints its text in a
	 * font of its own: the provider then renders no script and no `preload`
	 * link.
	 *
	 * @defaultValue true
	 */
	font?: boolean
}

/**
 * App-root owner of the theme, density, motion, sidebar, and surfaces preferences. It keeps them
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
 * While the surfaces are `'glass'`, the root element has the `surfaces-glass`
 * class, which the `surfaces-glass` variant of `ui/tailwind.css` reads. A modal
 * panel that the server paints flat then paints as glass before hydration. The
 * provider also gives the choice to each Dialog, Drawer, and Sheet panel, so the
 * panel renders the glass surface. The choice does not change a Popover, a
 * Menu, a Tooltip, or a field: their `glass` prop and `<GlassProvider>` decide.
 *
 * Render one instance for each app. All instances share the storage keys and
 * the root element, so a region cannot hold an appearance of its own.
 *
 * The app's stylesheet must key its `dark` variant on the class, for example
 * `@custom-variant dark (&:where(.dark, .dark *))`. Each choice has a copy in
 * a cookie, so the server writes the classes of the stored theme, density,
 * motion, sidebar, and surfaces on the root before the first paint (`rootMarks` in
 * `ui/server`). With no cookie, the choices apply at hydration. A light
 * theme adds the `light` class, so a `dark` variant can follow the OS while
 * the root has no theme class.
 *
 * It renders the script of the latin face of the font before its children
 * ({@link FontScript}), so latin text paints in the font from the first paint.
 * In the server render, it also puts a `preload` link for that script in the
 * head. With `font={false}`, it renders no script and no link.
 * Render it above all text of the page, as the root layout of an app does.
 *
 * @remarks The server render and the hydration render use the defaults
 * (`'system'`, `'snug'`, `'system'`, and `'locked'`) for the values of the
 * context. The root element carries the stored choices from the first paint,
 * so each stepped `density-*` class is correct at once. A component that reads
 * the step as a JS value takes it one render after hydration.
 *
 * These defaults apply only to a component that hydrates together with the
 * provider. A component in a `Suspense` boundary that hydrates after the
 * provider reads the stored values in its hydration render, but the server
 * rendered the defaults. If such a component renders markup from a value of
 * {@link useAppearance}, gate that markup on `useHydrated`, so that its
 * hydration render also uses the defaults.
 */
export function AppearanceProvider({ children, font = true }: AppearanceProviderProps) {
	const [theme, setTheme] = useAppearanceChoice(THEME)

	const [density, setDensity] = useAppearanceChoice(DENSITY)

	const [motion, setMotion] = useAppearanceChoice(MOTION)

	const [sidebar, setSidebar] = useAppearanceChoice(SIDEBAR)

	const [surfaces, setSurfaces] = useAppearanceChoice(SURFACES)

	useEffect(() => {
		// The classes on the root are side effects, not rendered state, so the
		// store drives them directly. The effect does not read `theme`,
		// `density`, `motion`, `sidebar`, or `surfaces`: during hydration they hold the defaults, and a
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

			root.classList.toggle(ROOT_GLASS_SURFACES_CLASS, readChoice(SURFACES) === 'glass')
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
			surfaces,
			setTheme,
			setDensity,
			setMotion,
			setSidebar,
			setSurfaces,
		}),
		[
			theme,
			density,
			motion,
			sidebar,
			surfaces,
			setTheme,
			setDensity,
			setMotion,
			setSidebar,
			setSurfaces,
		],
	)

	return (
		<AppearanceContext value={value}>
			<ReducedMotionContext value={motion === 'reduced'}>
				<GlassSurfacesContext value={surfaces === 'glass'}>
					{font ? <FontScript /> : null}
					{children}
				</GlassSurfacesContext>
			</ReducedMotionContext>
		</AppearanceContext>
	)
}
