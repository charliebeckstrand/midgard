import { rootDensityClasses } from '../../core/density'
import { rootReducedMotionClass } from '../../core/motion/root'
import { levelToStep } from '../density/context'
import { DARK_SCHEME, DENSITY, MOTION, THEME } from './appearance-storage'

// Resolves the stored choices as `AppearanceProvider` does. Theme: 'dark' is
// dark, 'light' is light, and any other value follows the OS. Density: a stored
// level gives its step, and any other value gives the step of the default. A
// step other than `md` adds its class to the root, and `md` adds no mark.
// Motion: 'reduced' adds the reduced-motion class, and any other value adds no
// mark, so the platform setting decides.
// Storage access can throw, and then the script uses the defaults. The
// own-property check keeps a stored `__proto__` or `toString` from reading the
// prototype. The docs site renders this component too.
const SCRIPT = `(function(){var r=document.documentElement,t=null,d=null,m=null;try{t=localStorage.getItem(${JSON.stringify(THEME.key)});d=localStorage.getItem(${JSON.stringify(DENSITY.key)});m=localStorage.getItem(${JSON.stringify(MOTION.key)})}catch(e){}if(t==='dark'||(t!=='light'&&matchMedia(${JSON.stringify(DARK_SCHEME)}).matches))r.classList.add('dark');var s=${JSON.stringify(levelToStep)},c=${JSON.stringify(rootDensityClasses)},h=Object.prototype.hasOwnProperty,v=h.call(s,d)?s[d]:s[${JSON.stringify(DENSITY.fallback)}];if(h.call(c,v))r.classList.add(c[v]);if(m==='reduced')r.classList.add(${JSON.stringify(rootReducedMotionClass)})})()`

/**
 * Inline script that applies the stored theme, density, and motion to the root
 * element before the first paint: the `.dark` class, the class of the density
 * step ({@link rootDensityClasses}), and the `reduced-motion` class when the
 * motion is `'reduced'`. At `md`, the default, the root has no class for
 * density. Render it in the document `<head>` of a server-rendered app
 * that mounts {@link AppearanceProvider}. Without it, a page in dark mode shows
 * light until hydration, and a stored density or motion applies after hydration. Put
 * `suppressHydrationWarning` on `<html>`, because the script changes its
 * attributes before React hydrates.
 *
 * It has no `'use client'` and reads no context, so a server layout can render
 * it. `UIDocument` renders it with `AppearanceProvider` and the attribute, so
 * an app that renders `UIDocument` does not render it.
 */
export function AppearanceScript() {
	// biome-ignore lint/security/noDangerouslySetInnerHtml: a constant script with no user input.
	return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}
