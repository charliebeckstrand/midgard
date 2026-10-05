import { globSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { builtStylesheet, FONT_FACE } from './stylesheet.ts'

// A declaration of a minified `@font-face` rule. A value holds no semicolon.
const DECLARATION = /([\w-]+):([^;}]*)/g

// The URL in the `src` of a font face.
const SOURCE = /url\(["']?([^"')]+)["']?\)/

/**
 * The `FontFace` descriptor of a CSS descriptor: `font-weight` gives `weight`,
 * and `unicode-range` gives `unicodeRange`.
 */
function descriptorName(property: string): string {
	return property
		.replace(/^font-/, '')
		.replace(/-(\w)/g, (_match, letter: string) => letter.toUpperCase())
}

/**
 * Writes a script into the head of each prerendered page. The script adds the
 * face of `font` to `document.fonts` from the bytes of the font.
 *
 * The faces use `font-display: block`, so text does not paint until its face
 * loads. The first paint can come before the font file loads, and the text of
 * that paint is then invisible. A `FontFace` that a script makes from bytes
 * loads before the script ends, so the face is ready before the first layout.
 * The browser uses a face that a script adds before a face of a stylesheet
 * with the same descriptors, so it does not download the font file.
 *
 * The face comes from the built stylesheet: the `@font-face` rule whose file
 * has the bytes of `font`. The script gives the face the same descriptors.
 */
export function inlineFont(clientDir: string, stylesheet: string, font: string): void {
	const bytes = readFileSync(font)

	const faces = (builtStylesheet(clientDir, stylesheet).match(FONT_FACE) ?? []).filter((face) => {
		const url = SOURCE.exec(face)?.[1]

		return url !== undefined && readFileSync(path.join(clientDir, url)).equals(bytes)
	})

	const [face, ...others] = faces

	if (!face || others.length > 0) {
		throw new Error(`docs: no single font face in ${stylesheet} for ${path.basename(font)}`)
	}

	const declarations = new Map(
		Array.from(face.matchAll(DECLARATION), ([, property = '', value = '']) => [
			property,
			value.trim(),
		]),
	)

	const family = declarations.get('font-family')?.replace(/^["']|["']$/g, '')

	if (!family) throw new Error(`docs: the font face of ${path.basename(font)} has no family`)

	const descriptors = Object.fromEntries(
		Array.from(declarations)
			.filter(([property]) => property !== 'font-family' && property !== 'src')
			.map(([property, value]) => [descriptorName(property), value]),
	)

	const code = `(function(){var s=atob(${JSON.stringify(bytes.toString('base64'))}),b=new Uint8Array(s.length);for(var i=0;i<s.length;i++)b[i]=s.charCodeAt(i);document.fonts.add(new FontFace(${JSON.stringify(family)},b,${JSON.stringify(descriptors)}))})()`

	if (code.includes('</')) throw new Error(`docs: the font script can close its <script>`)

	for (const page of globSync('**/*.html', { cwd: clientDir })) {
		const file = path.join(clientDir, page)

		writeFileSync(
			file,
			readFileSync(file, 'utf8').replace('</head>', `<script>${code}</script></head>`),
		)
	}
}
