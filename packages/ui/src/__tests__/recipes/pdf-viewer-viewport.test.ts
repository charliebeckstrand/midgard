// @vitest-environment node

import { join } from 'node:path'
import { compile } from '@tailwindcss/node'
import { describe, expect, it } from 'vitest'
import { k } from '../../recipes/kata/pdf-viewer'
import { noop } from '../../utilities/noop'

// The viewport centers a page that fits, and puts a page that overflows at
// its start edge, so the scroll reaches all of a wide page. Tailwind writes
// no CSS for a class name that it does not know, so the test builds the
// classes of the recipe and reads the CSS.

const UI = join(import.meta.dirname, '../../..')

describe('the PdfViewer viewport', () => {
	it('centers the page with the safe alignment that Tailwind writes', async () => {
		const compiler = await compile(`@import 'tailwindcss';`, { base: UI, onDependency: noop })

		const classes = [k.viewport.base].flat(Number.POSITIVE_INFINITY).join(' ').split(/\s+/)

		const css = compiler.build(classes)

		expect(css).toContain('align-items: safe center')

		expect(css).toContain('justify-content: safe center')
	})
})
