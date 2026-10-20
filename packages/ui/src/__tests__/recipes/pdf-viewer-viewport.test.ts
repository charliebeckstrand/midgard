// @vitest-environment node

import { compile } from '@tailwindcss/node'
import { describe, expect, it } from 'vitest'
import { k } from '../../recipes/kata/pdf-viewer'
import { noop } from '../../utilities/noop'
import { uiRoot } from '../helpers/walk-source'

// The viewport centers a page that is smaller than it, and keeps the start
// edge of a larger page in reach. A class name that Tailwind does not know
// writes no CSS, and the page then sits at the start corner.

describe('the PdfViewer viewport', () => {
	it('gives each centering class CSS', async () => {
		const compiler = await compile(`@import 'tailwindcss';\n@import './tailwind.css';`, {
			base: uiRoot,
			onDependency: noop,
		})

		const centering = [k.viewport.base]
			.flat(Number.POSITIVE_INFINITY)
			.flatMap((value) => String(value).split(' '))
			.filter((name) => /^(items|justify)-/.test(name))

		expect(centering).toHaveLength(2)

		// The compiler keeps each candidate that it gets, so compare each build
		// with the build before it. A class that writes CSS changes the build.
		let css = compiler.build([])

		const missing: string[] = []

		for (const name of centering) {
			const next = compiler.build([name])

			if (next === css) missing.push(name)

			css = next
		}

		expect(missing).toEqual([])
	})
})
