import { describe, expect, it } from 'vitest'
import { Split } from '../../components/split'
import { DensityProvider } from '../../providers/density'
import { bySlot, renderUI } from '../helpers'

describe('Split', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Split id="test">content</Split>)

		const el = bySlot(container, 'split')

		expect(el).toHaveAttribute('id', 'test')
	})

	it('uses grid-template-columns for horizontal orientation', () => {
		const { container } = renderUI(<Split orientation="horizontal">a</Split>)

		const el = bySlot(container, 'split') as HTMLElement

		expect(el.style.gridTemplateColumns).toBe('1fr 1fr')
	})

	it('uses grid-template-rows for vertical orientation', () => {
		const { container } = renderUI(<Split orientation="vertical">a</Split>)

		const el = bySlot(container, 'split') as HTMLElement

		expect(el.style.gridTemplateRows).toBe('1fr 1fr')
	})

	it('applies the align class when provided', () => {
		const { container } = renderUI(<Split align="center">a</Split>)

		const el = bySlot(container, 'split')

		expect(el?.className).toContain('items-center')
	})

	it('honours an explicit ratio', () => {
		const { container } = renderUI(<Split ratio="1/3">a</Split>)

		const el = bySlot(container, 'split') as HTMLElement

		expect(el.style.gridTemplateColumns).toContain('1fr')
	})

	it('merges caller style with the ratio style', () => {
		const { container } = renderUI(<Split style={{ background: 'red' }}>a</Split>)

		const el = bySlot(container, 'split') as HTMLElement

		expect(el.style.background).toBe('red')
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

		const el = bySlot(container, 'split') as HTMLElement

		expect(el.className).toContain('gap-6')

		expect(el.className).not.toContain('gap-2')
	})

	it('falls back to the lg gap with no explicit prop and no ambient Density', () => {
		const { container } = renderUI(<Split>content</Split>)

		expect(bySlot(container, 'split')?.className).toContain('gap-4')
	})
})
