import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import {
	type ResolvedMagnifier,
	usePdfViewerMagnifier,
} from '../../../components/pdf-viewer/use-pdf-viewer-magnifier'
import { renderUI, screen, waitFor } from '../../helpers'
import { settledRect } from '../helpers/sample'

/**
 * The page frame is the reference of the lens. A toggle of the loupe can detach the frame from
 * floating-ui and attach it again. After the toggle, a dwell at the same point must place the
 * lens where it was before.
 */

const SETTINGS: ResolvedMagnifier = { zoom: 2.5, size: 'md', delay: 0 }

function Loupe() {
	const [on, setOn] = useState(true)

	const magnifier = usePdfViewerMagnifier(on ? SETTINGS : null)

	return (
		<>
			<div
				data-testid="page"
				ref={magnifier.setReference}
				{...magnifier.referenceProps}
				style={{ position: 'fixed', left: 40, top: 40, width: 400, height: 400 }}
			/>
			<button
				type="button"
				onClick={() => setOn((value) => !value)}
				style={{ position: 'fixed', left: 600, top: 40 }}
			>
				Loupe
			</button>
			{magnifier.open && (
				<div
					data-testid="lens"
					ref={magnifier.setFloating}
					{...magnifier.floatingProps}
					style={{ ...magnifier.floatingStyles, width: 80, height: 80 }}
				/>
			)}
		</>
	)
}

/** Rests the mouse on the page at one point, and gives the placed lens. */
async function dwell() {
	await userEvent.hover(screen.getByTestId('page'), { position: { x: 120, y: 160 } })

	const lens = await waitFor(() => screen.getByTestId('lens'))

	return (await settledRect(lens)).getBoundingClientRect()
}

describe('PdfViewer magnifier over a toggle of the loupe (real browser)', () => {
	it('places the lens at the same point after the loupe turns off and on', async () => {
		renderUI(<Loupe />)

		const before = await dwell()

		// Beside the cursor at x 160, not past the right edge of the page at x 440.
		expect(before.left).toBeLessThan(440)

		const loupe = screen.getByRole('button', { name: 'Loupe' })

		await userEvent.click(loupe)

		await waitFor(() => expect(screen.queryByTestId('lens')).toBeNull())

		await userEvent.click(loupe)

		const after = await dwell()

		expect({ left: after.left, top: after.top }).toEqual({ left: before.left, top: before.top })
	})
})
