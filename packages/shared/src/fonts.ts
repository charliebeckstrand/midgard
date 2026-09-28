import localFont from 'next/font/local'

/**
 * The sans font of the apps, Google Sans Flex, loaded through `next/font`.
 *
 * @remarks
 * Put `fontSans.variable` on `<html>` in the root layout. The class sets
 * `--font-google-sans-flex`, and `fonts.css` gives that value to the Tailwind
 * `--font-sans`.
 *
 * `next/font` preloads the file with the document, so the browser gets it
 * together with the stylesheet and not after the first layout. It also adds a
 * fallback face with the metrics of the font. Text in the fallback thus takes
 * the same space, and the swap moves no layout.
 */
export const fontSans = localFont({
	src: './fonts/GoogleSansFlex-VariableFont.woff2',
	weight: '100 1000',
	display: 'swap',
	variable: '--font-google-sans-flex',
})
