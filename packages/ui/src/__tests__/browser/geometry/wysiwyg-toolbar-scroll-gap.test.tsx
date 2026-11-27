import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { densitySteps } from '../../../core/density'
import { Wysiwyg, WysiwygToolbar } from '../../../modules/wysiwyg'
import { frames, getSlot, present, renderUI } from '../../helpers'
import { LAYOUT_UNIT } from '../../helpers/geometry/tolerance'
import { editable } from '../helpers/wysiwyg'

/** Ten paragraphs, more than the cap of the field holds. */
const LONG = Array.from({ length: 10 }, (_, index) => `Line ${index + 1}`).join('\n\n')

/**
 * In a framed Wysiwyg, the space between the toolbar and the text is out of
 * the scroll of the field, at each size, with and without a row of actions.
 * The scroll box of the field starts one field inset below the toolbar, so
 * text that scrolls up stops below that space and not at the buttons.
 *
 * Before, the space was the top padding of the field, which scrolls with the
 * text. The scroll box started at the bottom of the toolbar, and the text was
 * cut at the buttons.
 *
 * Rides the real browser because jsdom lays nothing out.
 */
describe('Wysiwyg toolbar scroll gap (real browser)', () => {
	it.for([false, true].flatMap((actions) => densitySteps.map((size) => [actions, size] as const)))(
		'actions %s at %s',
		async ([actions, size]) => {
			const { container } = renderUI(
				<>
					<Wysiwyg
						aria-label="Notes"
						size={size}
						className="max-h-24"
						defaultValue={LONG}
						actions={actions && <Button>Send</Button>}
					>
						<WysiwygToolbar />
					</Wysiwyg>
					<Wysiwyg aria-label="Plain" size={size} />
				</>,
			)

			await editable('Notes')

			await frames()

			// The toolbar row is one grid cell with the heading rail, and the cell
			// centers the shorter row. So the cell, and not the row, is above the gap.
			const toolbar = getSlot(container, 'wysiwyg-toolbar')

			const [field, plain] = container.querySelectorAll<HTMLElement>('[role="textbox"]')

			const inset = Number.parseFloat(
				getComputedStyle(present(plain, 'the plain field')).paddingTop,
			)

			const scroller = present(field, 'the field')

			// The field scrolls, so the gap is the one that scrolled text meets.
			expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)

			scroller.scrollTop = scroller.scrollHeight

			await frames()

			const gap = scroller.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom

			expect(inset).toBeGreaterThan(0)

			expect(gap).toBeNear(inset, LAYOUT_UNIT)
		},
	)
})
