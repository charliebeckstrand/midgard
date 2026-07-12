import type { RefObject } from 'react'
import { describe, expect, it } from 'vitest'
import type { VirtualItemSource } from '../../hooks/a11y/use-a11y-roving'
import { VirtualOptions } from '../../primitives/virtual-options'
import { VirtualItemSourceContext } from '../../primitives/virtual-options/virtual-item-source-context'
import { bySlot, renderUI } from '../helpers'

// jsdom has no layout; react-virtual sees a 0-height scroll container and
// renders zero items. These tests assert boundedness and the outer container
// slot. Correct windowing behaviour is covered by the benchmarks.

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

// Registration doesn't depend on any row actually rendering — `VirtualOptions`
// builds and publishes the source from `items`/`getOptionId` regardless of the
// (jsdom-zero-height) windowed subset — so these run under plain jsdom; real
// windowing + keyboard-reachability across the window edge is covered by the
// browser suite (`test:browser`) and `__tests__/hooks/use-a11y-roving.test.ts`.
describe('VirtualOptions: indexed item source registration', () => {
	const items = Array.from({ length: 50 }, (_, i) => ({
		id: i,
		label: `Item ${i}`,
		disabled: i === 3,
	}))

	function Panel({
		registryRef,
		withGetOptionId = true,
	}: {
		registryRef: RefObject<VirtualItemSource | null>
		withGetOptionId?: boolean
	}) {
		return (
			<VirtualItemSourceContext value={registryRef}>
				<div role="listbox" style={{ maxHeight: '200px', overflow: 'auto' }}>
					<VirtualOptions
						items={items}
						estimateSize={32}
						getOptionId={withGetOptionId ? (item) => `opt-${item.id}` : undefined}
						isDisabled={(item) => item.disabled}
						getTextValue={(item) => item.label}
					>
						{(item, _index, meta) => (
							<div key={item.id} role="option" id={`opt-${item.id}`} tabIndex={-1} {...meta}>
								{item.label}
							</div>
						)}
					</VirtualOptions>
				</div>
			</VirtualItemSourceContext>
		)
	}

	it('publishes an index-based source when getOptionId is provided', () => {
		const registryRef: RefObject<VirtualItemSource | null> = { current: null }

		renderUI(<Panel registryRef={registryRef} />)

		expect(registryRef.current).not.toBeNull()

		expect(registryRef.current?.count).toBe(50)

		expect(registryRef.current?.getKey(3)).toBe('opt-3')

		expect(registryRef.current?.isDisabled?.(3)).toBe(true)

		expect(registryRef.current?.isDisabled?.(4)).toBe(false)

		expect(registryRef.current?.getTextValue?.(4)).toBe('Item 4')
	})

	it('does not publish a source when getOptionId is omitted', () => {
		const registryRef: RefObject<VirtualItemSource | null> = { current: null }

		renderUI(<Panel registryRef={registryRef} withGetOptionId={false} />)

		expect(registryRef.current).toBeNull()
	})

	it('clears the registered source on unmount', () => {
		const registryRef: RefObject<VirtualItemSource | null> = { current: null }

		const { unmount } = renderUI(<Panel registryRef={registryRef} />)

		expect(registryRef.current).not.toBeNull()

		unmount()

		expect(registryRef.current).toBeNull()
	})

	it('renders without a registering ancestor (no context, DOM-only roving unchanged)', () => {
		function StandalonePanel() {
			return (
				<div role="listbox" style={{ maxHeight: '200px', overflow: 'auto' }}>
					<VirtualOptions items={items} getOptionId={(item) => `opt-${item.id}`}>
						{(item, _index, meta) => (
							<div key={item.id} role="option" id={`opt-${item.id}`} tabIndex={-1} {...meta}>
								{item.label}
							</div>
						)}
					</VirtualOptions>
				</div>
			)
		}

		expect(() => renderUI(<StandalonePanel />)).not.toThrow()
	})
})
