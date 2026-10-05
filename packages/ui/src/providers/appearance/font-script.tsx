// The bundler of the app resolves the URL. It copies the script of
// `pnpm fonts` to a file with a hash in its name, so the browser keeps the
// file in its cache.
const FONT_SCRIPT_URL = new URL('../../fonts/google-sans-flex-latin.js', import.meta.url).href

/**
 * Adds the latin subset of the font of ui before the first paint. Render it in
 * the document `<head>` of a server-rendered app.
 *
 * @remarks
 * The font faces come from `ui/tailwind.css`, and they use
 * `font-display: block`. Text does not paint until its subset loads. A page
 * that paints before the font file loads thus shows its layout with no text.
 *
 * The script holds the bytes of the latin subset, and it adds the face from
 * them. The script is not `async`, so the browser does not paint the page
 * until the script runs. Thus each paint of latin text uses the font. On a
 * slow first load, the page stays empty until the script loads. The browser
 * keeps the script in its cache, so a later load does not download it again.
 * The browser uses the face of the script before the latin face of the
 * stylesheet, so it does not download the latin font file. It downloads
 * another subset only when a page has text in it.
 *
 * It reads no context, so a server layout can render it.
 */
export function FontScript() {
	return <script src={FONT_SCRIPT_URL} />
}
