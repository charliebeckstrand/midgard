import { DARK_SCHEME, THEME_KEY } from './appearance-storage'

// Resolves the stored theme as `AppearanceProvider` does: 'dark' is dark,
// 'light' is light, and any other value follows the OS. Storage access can
// throw, and then the script follows the OS.
const SCRIPT = `(function(){var t=null;try{t=localStorage.getItem(${JSON.stringify(THEME_KEY)})}catch(e){}if(t==='dark'||(t!=='light'&&matchMedia(${JSON.stringify(DARK_SCHEME)}).matches))document.documentElement.classList.add('dark')})()`

/**
 * Inline script that applies the stored theme to the root element before the
 * first paint. Render it in the document `<head>` of a server-rendered app that
 * mounts {@link AppearanceProvider}. Without it, a page in dark mode shows
 * light until hydration. Put `suppressHydrationWarning` on `<html>`, because
 * the script changes its class before React hydrates.
 *
 * It has no `'use client'` and reads no context, so a server layout can render
 * it.
 */
export function AppearanceScript() {
	// biome-ignore lint/security/noDangerouslySetInnerHtml: a constant script with no user input.
	return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}
