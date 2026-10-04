import { afterAll, beforeAll } from 'vitest'

const DOCS_FONT_URL = new URL('../../../fonts/google-sans-flex-latin.woff2', import.meta.url).href

/**
 * Loads the docs font, Google Sans Flex, for the cases of the calling
 * `describe` block, and removes it after them.
 *
 * @remarks
 * A case that checks a width from the rendered text needs the font that the
 * docs site ships, and not a fallback font of the runner. The browser project
 * shares one page across files, so the font is a `FontFace` that the block
 * removes again. Only an element that names the family uses it. The cases
 * render Latin text, so the face is the latin subset, with the weights that
 * `src/fonts/fonts.css` gives.
 */
export function installDocsFont(): void {
	const font = new FontFace('Google Sans Flex', `url("${DOCS_FONT_URL}")`, {
		weight: '300 900',
	})

	beforeAll(async () => {
		document.fonts.add(await font.load())
	})

	afterAll(() => {
		document.fonts.delete(font)
	})
}
