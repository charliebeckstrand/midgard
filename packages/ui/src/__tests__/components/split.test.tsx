import { describe, expect, it } from 'vitest'
import { Split } from '../../components/split'
import { DensityProvider } from '../../providers/density'
import { bySlot, getSlot, renderUI } from '../helpers'

describe('Split', () => {
	it('uses a column template for horizontal orientation', () => {
		const { container } = renderUI(<Split orientation="horizontal">a</Split>)

		expect(bySlot(container, 'split')?.className).toContain('grid-cols-[1fr_1fr]')
	})

	it('uses a row template for vertical orientation', () => {
		const { container } = renderUI(<Split orientation="vertical">a</Split>)

		expect(bySlot(container, 'split')?.className).toContain('grid-rows-[1fr_1fr]')
	})

	it('applies the align class when provided', () => {
		const { container } = renderUI(<Split align="center">a</Split>)

		const el = bySlot(container, 'split')

		expect(el?.className).toContain('items-center')
	})

	it('honors an explicit ratio', () => {
		const { container } = renderUI(<Split ratio="1/3">a</Split>)

		expect(bySlot(container, 'split')?.className).toContain('grid-cols-[1fr_2fr]')
	})

	it('passes a caller style through to the root', () => {
		const { container } = renderUI(<Split style={{ background: 'red' }}>a</Split>)

		const el = getSlot(container, 'split')

		expect(el.style.background).toBe('red')
	})
})

describe('Split responsive axes', () => {
	// `Responsive<T>` was Flex- and Stack-only once, and Split's `orientation`
	// was the sharpest gap: a two-column split could not stack on a phone without
	// a wrapper.
	it('stacks at the base and splits from a breakpoint up', () => {
		const { container } = renderUI(
			<Split orientation={{ initial: 'vertical', md: 'horizontal' }}>a</Split>,
		)

		const className = bySlot(container, 'split')?.className ?? ''

		expect(className).toContain('grid-rows-[1fr_1fr]')

		expect(className).toContain('md:grid-cols-[1fr_1fr]')
	})

	it('carries the axis forward to a breakpoint only the ratio names', () => {
		const { container } = renderUI(
			<Split orientation="vertical" ratio={{ initial: '1/2', lg: '1/3' }}>
				a
			</Split>,
		)

		const className = bySlot(container, 'split')?.className ?? ''

		// The ratio names `lg`; the axis does not, so `lg` takes the vertical it
		// carried forward rather than falling back to the horizontal default.
		expect(className).toContain('lg:grid-rows-[1fr_2fr]')
	})

	it('resolves a responsive gap and align', () => {
		const { container } = renderUI(
			<Split gap={{ initial: 'xs', md: 'xl' }} align={{ initial: 'start', md: 'center' }}>
				a
			</Split>,
		)

		const className = bySlot(container, 'split')?.className ?? ''

		expect(className).toContain('gap-1')

		expect(className).toContain('md:gap-6')

		expect(className).toContain('items-start')

		expect(className).toContain('md:items-center')
	})
})

describe('Split gap resolution', () => {
	it('ignores an ambient Density provider when gap is omitted', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Split>content</Split>
			</DensityProvider>,
		)

		// Static leaf: gap is explicit (default lg); ambient density reaches
		// client components only.
		expect(bySlot(container, 'split')?.className).toContain('gap-4')
	})

	it('explicit gap applies inside a Density provider', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Split gap="xl">content</Split>
			</DensityProvider>,
		)

		const el = getSlot(container, 'split')

		expect(el.className).toContain('gap-6')

		expect(el.className).not.toContain('gap-2')
	})

	it('falls back to the lg gap with no explicit prop and no ambient Density', () => {
		const { container } = renderUI(<Split>content</Split>)

		expect(bySlot(container, 'split')?.className).toContain('gap-4')
	})
})
