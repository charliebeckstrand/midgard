import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { VirtualList, type VirtualListHandle } from '../../components/virtual-list'
import { ChatScroll } from '../../components/virtual-list/chat-scroll'
import { act, allBySlot, bySlot, renderUI } from '../helpers'

const items = Array.from({ length: 50 }, (_, i) => `Item ${i}`)

/**
 * jsdom doesn't support element layout, so TanStack Virtual's observeElementRect
 * sees a zero-sized scroll container and renders nothing. This helper forces a
 * non-zero scrollRect on the virtualizer and triggers a recalculation, simulating
 * a real browser layout pass.
 */
async function simulateLayout(
	ref: React.RefObject<VirtualListHandle | null>,
	width = 300,
	height = 400,
) {
	const handle = ref.current
	if (!handle) throw new Error('VirtualList ref not attached')

	await act(async () => {
		handle.virtualizer.scrollRect = { width, height }
		handle.virtualizer.measure()
	})
}

describe('VirtualList', () => {
	it('renders with data-slot="virtual-list"', () => {
		const { container } = renderUI(
			<VirtualList items={items} estimateSize={40}>
				{(item) => <div>{item}</div>}
			</VirtualList>,
		)

		expect(bySlot(container, 'virtual-list')).toBeInTheDocument()
	})

	it('renders viewport with data-slot="virtual-list-viewport"', () => {
		const { container } = renderUI(
			<VirtualList items={items} estimateSize={40}>
				{(item) => <div>{item}</div>}
			</VirtualList>,
		)

		expect(bySlot(container, 'virtual-list-viewport')).toBeInTheDocument()
	})

	it('renders items with data-slot="virtual-list-item"', async () => {
		const ref = createRef<VirtualListHandle>()

		const { container } = renderUI(
			<VirtualList ref={ref} items={items} estimateSize={40}>
				{(item) => <div>{item}</div>}
			</VirtualList>,
		)

		await simulateLayout(ref)

		const rendered = allBySlot(container, 'virtual-list-item')

		expect(rendered.length).toBeGreaterThan(0)
		expect(rendered.length).toBeLessThan(items.length)
	})

	it('renders item content via children render function', async () => {
		const ref = createRef<VirtualListHandle>()

		const { container } = renderUI(
			<VirtualList ref={ref} items={['Alpha', 'Beta', 'Gamma']} estimateSize={40}>
				{(item) => <span>{item}</span>}
			</VirtualList>,
		)

		await simulateLayout(ref)

		expect(container.textContent).toContain('Alpha')
	})

	it('applies custom className to root', () => {
		const { container } = renderUI(
			<VirtualList items={items} estimateSize={40} className="custom-class">
				{(item) => <div>{item}</div>}
			</VirtualList>,
		)

		expect(bySlot(container, 'virtual-list')?.className).toContain('custom-class')
	})

	it('sets data-index on each item', async () => {
		const ref = createRef<VirtualListHandle>()

		const { container } = renderUI(
			<VirtualList ref={ref} items={items} estimateSize={40}>
				{(item) => <div>{item}</div>}
			</VirtualList>,
		)

		await simulateLayout(ref)

		const renderedItems = allBySlot(container, 'virtual-list-item')

		expect(renderedItems.length).toBeGreaterThan(0)
		expect(renderedItems[0]).toHaveAttribute('data-index')
	})

	it('exposes imperative handle via ref', () => {
		const ref = createRef<VirtualListHandle>()

		renderUI(
			<VirtualList ref={ref} items={items} estimateSize={40}>
				{(item) => <div>{item}</div>}
			</VirtualList>,
		)

		expect(ref.current).not.toBeNull()
		expect(typeof ref.current?.scrollToIndex).toBe('function')
		expect(typeof ref.current?.scrollToOffset).toBe('function')
		expect(typeof ref.current?.scrollToEnd).toBe('function')
		expect(typeof ref.current?.scrollToStart).toBe('function')
		expect(ref.current?.virtualizer).toBeDefined()
	})

	it('calls onScroll when scroll event fires', () => {
		const onScroll = vi.fn()

		const { container } = renderUI(
			<VirtualList items={items} estimateSize={40} onScroll={onScroll}>
				{(item) => <div>{item}</div>}
			</VirtualList>,
		)

		const root = bySlot(container, 'virtual-list')

		root?.dispatchEvent(new Event('scroll'))

		expect(onScroll).toHaveBeenCalledWith(
			expect.objectContaining({
				offset: expect.any(Number),
				size: expect.any(Number),
				totalSize: expect.any(Number),
			}),
		)
	})

	it('accepts estimateSize as a function', () => {
		const estimateFn = vi.fn().mockReturnValue(40)

		renderUI(
			<VirtualList items={items} estimateSize={estimateFn}>
				{(item) => <div>{item}</div>}
			</VirtualList>,
		)

		expect(estimateFn).toHaveBeenCalled()
	})

	it('renders empty list without errors', () => {
		const { container } = renderUI(
			<VirtualList items={[]} estimateSize={40}>
				{(item: string) => <div>{item}</div>}
			</VirtualList>,
		)

		expect(bySlot(container, 'virtual-list')).toBeInTheDocument()
		expect(allBySlot(container, 'virtual-list-item')).toHaveLength(0)
	})

	it('uses semantic list elements for accessibility', async () => {
		const ref = createRef<VirtualListHandle>()

		const { container } = renderUI(
			<VirtualList ref={ref} items={items} estimateSize={40}>
				{(item) => <div>{item}</div>}
			</VirtualList>,
		)

		await simulateLayout(ref)

		const viewport = bySlot(container, 'virtual-list-viewport')

		expect(viewport?.tagName).toBe('UL')

		const renderedItems = allBySlot(container, 'virtual-list-item')

		expect(renderedItems.length).toBeGreaterThan(0)

		for (const item of renderedItems) {
			expect(item.tagName).toBe('LI')
		}
	})
})

describe('ChatScroll', () => {
	it('renders children', () => {
		const { container } = renderUI(
			<ChatScroll>
				<VirtualList items={items} estimateSize={40}>
					{(item) => <div>{item}</div>}
				</VirtualList>
			</ChatScroll>,
		)

		expect(bySlot(container, 'virtual-list')).toBeInTheDocument()
	})

	it('provides imperative handle through ChatScroll', () => {
		const ref = createRef<VirtualListHandle>()

		renderUI(
			<ChatScroll>
				<VirtualList ref={ref} items={items} estimateSize={40}>
					{(item) => <div>{item}</div>}
				</VirtualList>
			</ChatScroll>,
		)

		expect(ref.current).not.toBeNull()
		expect(typeof ref.current?.scrollToEnd).toBe('function')
	})
})
