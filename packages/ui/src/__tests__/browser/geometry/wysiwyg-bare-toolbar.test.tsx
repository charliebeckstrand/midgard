import { describe, expect, it } from 'vitest'
import { densitySteps } from '../../../core/density'
import { Wysiwyg, WysiwygToolbar } from '../../../modules/wysiwyg'
import { frames, present, renderUI } from '../../helpers'
import { LAYOUT_UNIT } from '../../helpers/geometry/tolerance'

/**
 * The first glyph of the toolbar of a bare Wysiwyg starts at the edge of the
 * text, at each size, with and without `separated`. A bare field has no inset,
 * so the toolbar cancels the padding of its bare buttons with a negative
 * inline margin (`dan.space.control.toolbar.bare`).
 *
 * Before, the toolbar had no margin, and the padding of the first button put
 * its glyph 4 px in from the text at `md`.
 *
 * Rides the real browser because jsdom lays nothing out.
 */
describe('bare Wysiwyg toolbar alignment (real browser)', () => {
	it.for(
		[false, true].flatMap((separated) => densitySteps.map((size) => [separated, size] as const)),
	)('separated %s at %s', async ([separated, size]) => {
		const { container } = renderUI(
			<Wysiwyg
				aria-label="Notes"
				variant="bare"
				size={size}
				separated={separated}
				defaultValue="Notes"
			>
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		await frames()

		const glyph = present(container.querySelector('[role="toolbar"] svg'), 'the first glyph')

		const field = present(container.querySelector('[role="textbox"]'), 'the field')

		const text = present(field.querySelector('p'), 'the paragraph of the field')

		const range = document.createRange()

		range.selectNodeContents(text)

		expect(glyph.getBoundingClientRect().left).toBeNear(
			range.getBoundingClientRect().left,
			LAYOUT_UNIT,
		)
	})
})
