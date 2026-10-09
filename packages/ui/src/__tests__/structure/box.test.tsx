import { createRef } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { DensityProvider } from '../../providers/density'
import { Box, type BoxOutline } from '../../structure/box'
import { bySlot, getSlot, renderUI } from '../helpers'

describe('Box', () => {
	it('forwards ref', () => {
		const ref = createRef<HTMLDivElement>()

		const { container } = renderUI(<Box ref={ref}>content</Box>)

		expect(ref.current).toBeInstanceOf(HTMLDivElement)

		expect(ref.current).toBe(bySlot(container, 'box'))
	})

	it('forwards ref when rendered as a link', () => {
		const ref = createRef<HTMLAnchorElement>()

		const { container } = renderUI(
			<Box ref={ref as never} href="/path">
				Link
			</Box>,
		)

		expect(ref.current).toBeInstanceOf(HTMLAnchorElement)

		expect(ref.current).toBe(bySlot(container, 'box'))
	})

	it('applies the outline=true variant', () => {
		const { container } = renderUI(<Box outline>content</Box>)

		expect(bySlot(container, 'box')).toHaveClass('outline-zinc-950/10')
	})

	it('takes `true` for the default outline, with no second name for it', () => {
		expectTypeOf<BoxOutline>().toEqualTypeOf<boolean | 'subtle' | 'strong'>()
	})

	it('applies an explicit outline weight', () => {
		const { container } = renderUI(<Box outline="strong">content</Box>)

		expect(bySlot(container, 'box')).toHaveClass('outline-zinc-950/15')
	})

	it('applies radius, bg, and padding tokens', () => {
		const { container } = renderUI(
			<Box radius="md" bg="surface" p="md">
				content
			</Box>,
		)

		expect(bySlot(container, 'box')).toHaveClass('rounded-md', 'bg-white', 'density-p-[1,2,3,4,5]')
	})

	it('respects px / py overrides', () => {
		const { container } = renderUI(
			<Box px="lg" py="sm">
				content
			</Box>,
		)

		expect(bySlot(container, 'box')).toHaveClass(
			'density-px-[2,3,4,5,6]',
			'density-py-[0.5,1,2,3,4.5]',
		)
	})

	it('renders with a custom data-slot', () => {
		const { container } = renderUI(<Box data-slot="card">content</Box>)

		expect(bySlot(container, 'card')).toBeInTheDocument()

		expect(bySlot(container, 'box')).toBeNull()
	})

	it('ignores an ambient Density provider when p is omitted', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Box>content</Box>
			</DensityProvider>,
		)

		// The padding is explicit. A density scope sets the step of a padding, but
		// it does not add a padding.
		expect(bySlot(container, 'box')?.className).not.toMatch(/(^|\s)p-\d/)
	})

	it('explicit p prop applies inside a Density provider', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Box p="lg">content</Box>
			</DensityProvider>,
		)

		const el = getSlot(container, 'box')

		expect(el.className).toContain('density-p-[2,3,4,5,6]')

		expect(el.className).not.toContain('density-p-[0.5,1,2,3,4.5]')
	})

	it('does not apply any padding class when no p and no ambient Density are present', () => {
		const { container } = renderUI(<Box>content</Box>)

		const el = getSlot(container, 'box')

		expect(el.className).not.toMatch(/(^|\s)p-\d/)
	})
})

describe('Box responsive padding', () => {
	// `Responsive<T>` reached Flex and Stack alone once, so a Box's padding could
	// not change with the viewport.
	it('emits one padding class per named breakpoint', () => {
		const { container } = renderUI(<Box p={{ initial: 'sm', md: 'lg' }}>content</Box>)

		const className = bySlot(container, 'box')?.className ?? ''

		expect(className).toContain('density-p-[0.5,1,2,3,4.5]')

		expect(className).toContain('md:density-p-[2,3,4,5,6]')
	})

	it('resolves the axis padding the same way', () => {
		const { container } = renderUI(
			<Box px={{ initial: 0, lg: 'xl' }} py={{ initial: 'xs' }}>
				content
			</Box>,
		)

		const className = bySlot(container, 'box')?.className ?? ''

		expect(className).toContain('px-0')

		expect(className).toContain('lg:density-px-[4,5,6,7,8]')

		expect(className).toContain('density-py-[0.25,0.5,1,1.5,2.5]')
	})
})
