import { levelToStep } from '../density/context'
import { DARK_SCHEME, DENSITY_KEY, THEME_KEY } from './appearance-storage'

// Resolves the stored choices as `AppearanceProvider` does. Theme: 'dark' is
// dark, 'light' is light, and any other value follows the OS. Density: a stored
// level gives its step, and any other value gives the step of 'snug'. Storage
// access can throw, and then the script uses the defaults. The own-property
// check keeps a stored `__proto__` or `toString` from reading the prototype.
const SCRIPT = `(function(){var r=document.documentElement,t=null,d=null;try{t=localStorage.getItem(${JSON.stringify(THEME_KEY)});d=localStorage.getItem(${JSON.stringify(DENSITY_KEY)})}catch(e){}if(t==='dark'||(t!=='light'&&matchMedia(${JSON.stringify(DARK_SCHEME)}).matches))r.classList.add('dark');var s=${JSON.stringify(levelToStep)};r.setAttribute('data-density',Object.prototype.hasOwnProperty.call(s,d)?s[d]:s.snug)})()`

/**
 * Inline script that applies the stored theme and density to the root element
 * before the first paint: the `.dark` class, and the step of the density as
 * `data-density`. Render it in the document `<head>` of a server-rendered app
 * that mounts {@link AppearanceProvider}. Without it, a page in dark mode shows
 * light until hydration, and a stored density applies after hydration. Put
 * `suppressHydrationWarning` on `<html>`, because the script changes its
 * attributes before React hydrates.
 *
 * It has no `'use client'` and reads no context, so a server layout can render
 * it.
 */
export function AppearanceScript() {
	// biome-ignore lint/security/noDangerouslySetInnerHtml: a constant script with no user input.
	return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}
