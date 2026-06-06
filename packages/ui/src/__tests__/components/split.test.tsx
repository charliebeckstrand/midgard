import { describe, expect, it } from 'vitest'
import { Split } from '../../components/split'
import { DensityProvider } from '../../providers/density'
import { bySlot, renderUI, screen } from '../helpers'

describe('Split', () => {
	it('renders with data-slot="split"', () => {
		const { container } = renderUI(<Split>content</Split>)

		const el = bySlot(container, 'split')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<Split>Hello</Split>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Split className="custom">content</Split>)

		const el = bySlot(container, 'split')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Split id="test">content</Split>)

		const el = bySlot(container, 'split')

		expect(el).toHaveAttribute('id', 'test')
	})

	it('uses grid-template-columns for horizontal direction', () => {
		const { container } = renderUI(<Split direction="horizontal">a</Split>)

		const el = bySlot(container, 'split') as HTMLElement

		expect(el.style.gridTemplateColumns).toBeTruthy()
	})

	it('uses grid-template-rows for vertical direction', () => {
		const { container } = renderUI(<Split direction="vertical">a</Split>)

		const el = bySlot(container, 'split') as HTMLElement

		expect(el.style.gridTemplateRows).toBeTruthy()
	})

	it('applies the align class when provided', () => {
		const { container } = renderUI(<Split align="center">a</Split>)

		const el = bySlot(container, 'split')

		expect(el?.className.length).toBeGreaterThan(0)
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

describe('Split density inheritance', () => {
	it('inherits gap from an ambient Density when gap is omitted', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Split>content</Split>
			</DensityProvider>,
		)

		// compact → sm step → gap-2 via ma.gap.
		expect(bySlot(container, 'split')?.className).toContain('gap-2')
	})

	it('explicit gap wins over the ambient Density', () => {
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
