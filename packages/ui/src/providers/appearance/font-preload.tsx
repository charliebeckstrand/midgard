'use client'

import { preload } from 'react-dom'

// The bundler of the app resolves the URL. It gives the same URL as the
// `url()` of the latin face in `fonts/fonts.css`.
const FONT_URL = new URL('../../fonts/google-sans-flex-latin.woff2', import.meta.url).href

/**
 * Starts the download of the latin subset of the font of ui with the document,
 * and not after the first layout finds text in it. Render it in the document
 * `<head>` of a server-rendered app. It renders nothing: React puts a
 * `<link rel="preload">` in the head.
 *
 * @remarks
 * The font faces come from `ui/tailwind.css`. The font has a subset for each
 * script, and the browser downloads another subset only when a page has text
 * in it. Text does not paint until its subset loads, for a maximum of 3
 * seconds. Then it shows in a fallback face with the metrics of the font, so
 * the swap moves almost no layout. The preload makes the wait short.
 *
 * It is a client component, because Next.js puts a preload in the head only
 * from the server render of a client component. It reads no context, so a
 * server layout can render it.
 */
export function FontPreload() {
	preload(FONT_URL, { as: 'font', type: 'font/woff2', crossOrigin: '' })

	return null
}
