import { describe, expect, it } from 'vitest'
import {
	docsSites,
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// Inline-script boundary.
//
// A script with inline source runs with the full rights of the page. The
// package writes such a script in one place, the `InlineScript` primitive. Its
// `source` states the contract, and never holds a value from a user. Thus a
// review of that one file and its callers finds each script that the package
// writes.
//
// Two rules keep the one place:
//
//   1. No file but the home renders a `<script>` element with inline source.
//      A `<script>` with a `src` attribute, such as the one of `FontScript`,
//      holds no inline source, so the rule lets it through.
//
//   2. No file builds a script with `createElement('script')`. A script that
//      the DOM API adds runs, and it goes around the primitive.
//
// The scan reads the shipped tree. The docs site is not shipped, so it is not
// in the scan.

/** The one file that writes a script with inline source. */
const HOME = 'primitives/inline-script/inline-script.tsx'

/** A `<script>` element with no `src` attribute. */
const INLINE_SCRIPT_ELEMENT = /<script\b(?![^>]*\bsrc=)[^>]*>/

/** A script that `document.createElement` or `React.createElement` builds. */
const CREATED_SCRIPT = /\bcreateElement\(\s*['"`]script['"`]/

/** Each shipped source file, keyed relative to `src/`, with its code and no comments. */
function shippedFiles(): Map<string, string> {
	const files = new Map<string, string>()

	walkSource(
		srcDir,
		(path, source) => {
			if (!isSourceFile(path)) return

			// Prose that names an element is not a use of it.
			files.set(srcRelative(path), stripSourceComments(source))
		},
		docsSites,
	)

	return files
}

describe('inline-script boundary', () => {
	const files = shippedFiles()

	it('reads the home', () => {
		expect(files.has(HOME), `${HOME} is missing; update HOME`).toBe(true)
	})

	it('renders a script with inline source only through InlineScript', () => {
		const violations = [...files]
			.filter(([key, code]) => key !== HOME && INLINE_SCRIPT_ELEMENT.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that render a <script> with inline source (render \`InlineScript\` from \`primitives/inline-script\`):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('builds no script with createElement', () => {
		const violations = [...files]
			.filter(([, code]) => CREATED_SCRIPT.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that build a script with createElement (render \`InlineScript\` instead):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
