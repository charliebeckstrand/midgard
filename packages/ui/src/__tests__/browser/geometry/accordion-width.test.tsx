import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../../components/accordion'
import { present, renderUI, screen } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * An accordion keeps its width while a section opens, in a host that fits its
 * content. The frame of a docs example is such a host. Before, the text of an
 * open panel, on one line, set the width of the accordion, so the accordion grew
 * on each open and shrank on each close.
 */
describe('accordion width (real browser)', () => {
	it('keeps one width in a host that fits its content while a section opens', async () => {
		renderUI(
			<div style={{ width: 'max-content', maxWidth: '100%' }}>
				<Accordion>
					<AccordionItem value="shipping">
						<AccordionTrigger>Shipping</AccordionTrigger>
						<AccordionPanel>
							Orders ship within one business day. Tracking links go out as soon as the package
							leaves the warehouse.
						</AccordionPanel>
					</AccordionItem>
				</Accordion>
			</div>,
		)

		const root = present(document.querySelector<HTMLElement>('[data-slot="accordion"]'), 'root')

		const header = screen.getByRole('button', { name: 'Shipping' })

		const closed = root.getBoundingClientRect().width

		await userEvent.click(header)

		expect(header).toHaveAttribute('aria-expanded', 'true')

		expect(root.getBoundingClientRect().width).toBeNear(closed, HALF_PIXEL)
	})
})
