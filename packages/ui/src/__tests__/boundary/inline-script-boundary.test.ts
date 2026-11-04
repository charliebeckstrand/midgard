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
// A script with inline source runs with the full rights of the page, and a
// script before the paint hides a first paint that is not final. The package
// writes no such script (CONVENTIONS §3.13). A component that the server
// cannot measure draws a placeholder. The server writes the stored settings
// of the reader on the root element (`rootMarks`).
//
// Two rules keep the package free of them:
//
//   1. No shipped file renders a `<script>` element with inline source. A
//      `<script>` with a `src` attribute, such as the one of `FontScript`,
//      holds no inline source, so the rule lets it through.
//
//   2. No shipped file builds a script with `createElement('script')`. A
//      script that the DOM API adds runs too.
//
// The docs site is not shipped, so the first two scans do not read it. A
// third scan reads it: its one inline script is the recovery of a stale
// build, which is not for the paint. It must listen before a module file can
// fail, and a script file loads too late for that.

/** The one file of the docs site that renders an inline script: the recovery of a stale build. */
const DOCS_RECOVERY = 'docs/app/stale-build.tsx'

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

	it('reads the shipped tree', () => {
		expect(files.size, 'the walk found no shipped files').toBeGreaterThan(0)
	})

	it('renders no script with inline source', () => {
		const violations = [...files]
			.filter(([, code]) => INLINE_SCRIPT_ELEMENT.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that render a <script> with inline source (draw a placeholder, CONVENTIONS §3.13):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('builds no script with createElement', () => {
		const violations = [...files]
			.filter(([, code]) => CREATED_SCRIPT.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that build a script with createElement (draw a placeholder, CONVENTIONS §3.13):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('renders an inline script in the docs site only for the recovery of a stale build', () => {
		const docs = docsFiles()

		expect(docs.has(DOCS_RECOVERY), `${DOCS_RECOVERY} is missing; update DOCS_RECOVERY`).toBe(true)

		const violations = [...docs]
			.filter(
				([key, code]) =>
					key !== DOCS_RECOVERY && (INLINE_SCRIPT_ELEMENT.test(code) || CREATED_SCRIPT.test(code)),
			)
			.map(([key]) => key)

		expect(
			violations,
			`docs files that render an inline script (the docs server writes the settings, CONVENTIONS §3.13):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
