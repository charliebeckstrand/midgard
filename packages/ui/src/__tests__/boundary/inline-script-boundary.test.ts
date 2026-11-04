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
// Three rules keep the one place:
//
//   1. No file but the home renders a `<script>` element with inline source.
//      A `<script>` with a `src` attribute, such as the one of `FontScript`,
//      holds no inline source, so the rule lets it through.
//
//   2. No file builds a script with `createElement('script')`. A script that
//      the DOM API adds runs, and it goes around the primitive.
//
//   3. Only the pre-paint scripts of the stored settings of the reader render
//      the primitive (CONVENTIONS §3.13). A component that the server cannot
//      measure draws a placeholder, and does not get a script. The docs site
//      writes the settings on the root element from the server, so it renders
//      no pre-paint script. Its one script is the recovery of a stale build,
//      which is not for the paint: it must listen before a module file can
//      fail, and a script file loads too late for that.
//
// The first two scans read the shipped tree. The docs site is not shipped, so
// it is not in them. The third scan reads the docs site too.

/** The one file that writes a script with inline source. */
const HOME = 'primitives/inline-script/inline-script.tsx'

/** The files that render the primitive: the pre-paint scripts of the stored settings of the reader. */
const CALLERS = new Set([
	'providers/appearance/appearance-script.tsx',
	'modules/events/events-script.tsx',
])

/** The one file of the docs site that renders the primitive: the recovery of a stale build. */
const DOCS_RECOVERY = 'docs/app/stale-build.tsx'

/** The pre-paint components, which the docs site does not render. */
const PRE_PAINT = /\b(?:InlineScript|AppearanceScript|EventsScript|UIDocument)\b/

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

/** Each source file of the docs site, keyed relative to `src/`, with its code and no comments. */
function docsFiles(): Map<string, string> {
	const files = new Map<string, string>()

	walkSource(`${srcDir}/docs`, (path, source) => {
		if (isSourceFile(path)) files.set(srcRelative(path), stripSourceComments(source))
	})

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

	it('renders InlineScript only in the pre-paint scripts of the stored settings', () => {
		const violations = [...files]
			.filter(([key, code]) => key !== HOME && !CALLERS.has(key) && /\bInlineScript\b/.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that render InlineScript (draw a placeholder, CONVENTIONS §3.13):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('keeps the docs site free of pre-paint scripts', () => {
		const violations = [...docsFiles()]
			.filter(([key, code]) => key !== DOCS_RECOVERY && PRE_PAINT.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`docs files that render a pre-paint script (the docs server writes the settings, CONVENTIONS §3.13):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
