'use client'

import { useHydrated } from '../../hooks/use-hydrated'

// The bundler of the app resolves the URL. It copies the script of
// `pnpm fonts` to a file with a hash in its name, so the browser keeps the
// file in its cache. The element takes the path of the URL and not the full
// URL. The server render does not know the origin of the page, so only the
// path is the same in the server render and in the hydration.
const FONT_SCRIPT_PATH = new URL('../../fonts/google-sans-flex-latin.js', import.meta.url).pathname

/**
 * Adds the latin subset of the font of ui before the first paint.
 * {@link AppearanceProvider} renders it before its children, so an app does
 * not render it.
 *
 * @remarks
 * The other font faces come from `ui/tailwind.css`, which has no latin face.
 * Without this script, latin text paints in a fallback face. The faces use
 * `font-display: block`. Text does not paint until its subset loads. A page
 * that paints before the font file loads thus shows its layout with no text.
 *
 * The script holds the bytes of the latin subset, and it adds the face from
 * them. The script is not `async`, so the browser does not parse the page
 * after the script, and does not paint it, until the script runs. Thus each
 * paint of latin text uses the font. On a slow first load, the page stays
 * empty until the script loads. The browser keeps the script in its cache, so
 * a later load does not download it again. The browser downloads another
 * subset only when a page has text in it.
 *
 * Only the parse of the server HTML runs the script: React does not run a
 * script that it adds in the browser. The element is thus in the server
 * render and in the hydration render only ({@link useHydrated}). After
 * hydration, the face is in place and the element goes. A render with no
 * server HTML adds no element, and its page has no latin face.
 */
export function FontScript() {
	const hydrated = useHydrated()

	return hydrated ? null : <script src={FONT_SCRIPT_PATH} />
}
