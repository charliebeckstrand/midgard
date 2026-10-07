import { describe, expect, it } from 'vitest'
import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../components/accordion'
import { List, ListItem, ListLabel } from '../../components/list'
import { Tree, TreeItem } from '../../components/tree'
import { present, renderUI, screen } from '../helpers'

/**
 * A button that holds a label aligns its text to the inline start. The UA
 * centers button text, so each recipe sets the alignment. In a right-to-left
 * layout, the start is the right edge. Only a real browser computes the
 * alignment.
 */
describe('button text alignment in a right-to-left layout (real browser)', () => {
	it('aligns an accordion trigger to the inline start', () => {
		renderUI(
			<div dir="rtl">
				<Accordion>
					<AccordionItem value="shipping">
						<AccordionTrigger>Shipping</AccordionTrigger>
						<AccordionPanel>Orders ship within one business day.</AccordionPanel>
					</AccordionItem>
				</Accordion>
			</div>,
		)

		const trigger = screen.getByRole('button', { name: /Shipping/ })

		expect(getComputedStyle(trigger).textAlign).toBe('start')
	})

	it('aligns a tree item label to the inline start', () => {
		renderUI(
			<div dir="rtl">
				<Tree aria-label="Files">
					<TreeItem label="report.pdf" />
				</Tree>
			</div>,
		)

		const label = present(screen.getByText('report.pdf').closest('span'), 'the tree label')

		expect(getComputedStyle(label).textAlign).toBe('start')
	})

	it('aligns a list row that acts on a press to the inline start', () => {
		renderUI(
			<div dir="rtl">
				<List
					items={[{ id: 'invoice', label: 'Invoice' }]}
					sortable={false}
					getKey={(item) => item.id}
					onReorder={() => {}}
				>
					{(item) => (
						<ListItem as="button" onClick={() => {}}>
							<ListLabel>{item.label}</ListLabel>
						</ListItem>
					)}
				</List>
			</div>,
		)

		const row = present(screen.getByText('Invoice').closest('button'), 'the list row')

		expect(getComputedStyle(row).textAlign).toBe('start')
	})
})
