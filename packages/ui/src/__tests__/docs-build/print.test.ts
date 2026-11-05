import { describe, inject, it } from 'vitest'
import { STYLED } from '../../../scripts/docs-server'
import { launchChromium } from './helpers/chromium'

// A page of the docs scrolls in a box that has the height of the viewport
// (`SCROLLER` in `root.tsx`). In print, the box has the height of its content,
// so the whole page prints, and not only the part that is in view.

/** A page that is much taller than the viewport, on screen and on paper. */
const PAGES = ['/menu', '/accordion']

/** The size of an A4 sheet in CSS pixels, with no margin. */
const SHEET = { width: 794, height: 1123 }

/** A page object of a PDF. `/Type /Pages` is the tree that holds them. */
const PDF_PAGE = /\/Type\s*\/Page(?![a-z])/gi

const origin = inject('docsOrigin')

const launch = launchChromium()

describe.concurrent('the print of the docs build', () => {
	it.for(PAGES)('%s prints whole', async (path, context) => {
		const { expect } = context

		const tab = await launch({ viewport: { width: 1280, height: 800 } }, context)

		await tab.goto(`${origin}${path}`)

		await tab.waitForFunction(STYLED)

		// The height of the document in print, at the width of the sheet.
		await tab.setViewportSize(SHEET)

		await tab.emulateMedia({ media: 'print' })

		const height = await tab.evaluate(() => document.documentElement.scrollHeight)

		await tab.emulateMedia({ media: null })

		const pdf = await tab.pdf({ width: `${SHEET.width}px`, height: `${SHEET.height}px` })

		const sheets = pdf.toString('latin1').match(PDF_PAGE)?.length ?? 0

		// The document is taller than one sheet, and each part of it gets a
		// sheet. A break that keeps a block whole can add a sheet.
		expect(height).toBeGreaterThan(SHEET.height)

		expect(sheets).toBeGreaterThanOrEqual(Math.ceil(height / SHEET.height))
	})
})
