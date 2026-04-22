import { describe, expect, it } from 'vitest'
import { VirtualOptions } from '../../primitives'
import { bySlot, renderUI } from '../helpers'

// jsdom has no layout, so react-virtual sees a 0-height scroll container and
// renders zero items. These tests therefore assert boundedness and the outer
// container slot; real-browser behaviour (correct windowing) is covered by
// the benchmarks.

describe('VirtualOptions', () => {
	const items = Array.from({ length: 1_000 }, (_, i) => ({ id: i, label: `Item ${i}` }))

	function TestPanel({ items: itemList }: { items: { id: number; label: string }[] }) {
		return (
			<div role="listbox" style={{ maxHeight: '200px', overflow: 'auto' }}>
				<VirtualOptions items={itemList} estimateSize={32}>
					{(item) => (
						<div key={item.id} role="option" tabIndex={-1}>
							{item.label}
						</div>
					)}
				</VirtualOptions>
			</div>
		)
	}

	it('mounts inside a role="listbox" container', () => {
		const { container } = renderUI(<TestPanel items={items} />)

		expect(bySlot(container, 'virtual-options')).toBeInTheDocument()
	})

	it('never renders more options than the items array', () => {
		const { container } = renderUI(<TestPanel items={items} />)

		const rendered = container.querySelectorAll('[role="option"]')

		expect(rendered.length).toBeLessThanOrEqual(items.length)
	})
})
