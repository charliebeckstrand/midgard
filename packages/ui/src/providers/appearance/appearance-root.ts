import { rootDensityClasses } from '../../core/density/steps'
import { ROOT_REDUCED_MOTION_CLASS } from '../../core/motion/root'
import { ROOT_OFFCANVAS_SIDEBAR_CLASS } from '../../core/sidebar/root'
import { ROOT_SOLID_SURFACES_CLASS } from '../../core/surfaces/root'
import { readCookie } from '../../utilities/cookie'
import { levelToStep } from '../density/context'
import {
	type AppearanceChoice,
	DENSITY,
	MOTION,
	parseChoice,
	SIDEBAR,
	SURFACES,
	THEME,
} from './appearance-storage'

/**
 * The classes of the root element for the stored choices in `cookies`, the
 * `Cookie` header of a request. A server that renders per request writes them
 * on `<html>`, so the first paint has the choices of the reader with no script.
 * `AppearanceProvider` keeps the same classes after hydration.
 *
 * Theme: `'dark'` gives `dark`, and `'light'` gives `light`. The theme
 * `'system'` gives no class, so the `dark` variant of the stylesheet must
 * follow `prefers-color-scheme` while the root has neither class. Density: a
 * step other than `md` gives its class. Motion: `'reduced'` gives
 * `reduced-motion`. Sidebar: `'offcanvas'` gives `sidebar-offcanvas`.
 * Surfaces: `'solid'` gives `surfaces-solid`.
 *
 * @internal
 */
export function appearanceRootClasses(cookies: string): string[] {
	const read = <T extends string>(choice: AppearanceChoice<T>) =>
		parseChoice(
			choice,
			choice.cookie === undefined ? undefined : readCookie(choice.cookie, cookies),
		)

	const classes: string[] = []

	const theme = read(THEME)

	if (theme !== 'system') classes.push(theme)

	const step = levelToStep[read(DENSITY)]

	if (step !== 'md') classes.push(rootDensityClasses[step])

	if (read(MOTION) === 'reduced') classes.push(ROOT_REDUCED_MOTION_CLASS)

	if (read(SIDEBAR) === 'offcanvas') classes.push(ROOT_OFFCANVAS_SIDEBAR_CLASS)

	if (read(SURFACES) === 'solid') classes.push(ROOT_SOLID_SURFACES_CLASS)

	return classes
}
