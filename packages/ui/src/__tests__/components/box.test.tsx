import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Box } from '../../components/box'
import { DensityProvider } from '../../providers/density'
import { bySlot, expectSlot, itForwardsRef, renderUI } from '../helpers'

describe('Box', () => {
	itForwardsRef<HTMLDivElement>((ref) => <Box ref={ref}>content</Box>, 'box')

	it('renders as a link when href is provided', () => {
		const { container } = renderUI(<Box href="/path">Link</Box>)

		const el = expectSlot(container, 'box', 'a')

		expect(el).toHaveAttribute('href', '/path')
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

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Box id="test">content</Box>)

		const el = bySlot(container, 'box')

		expect(el).toHaveAttribute('id', 'test')
	})

	it('applies the outline=true variant', () => {
		const { container } = renderUI(<Box outline>content</Box>)

		expect(bySlot(container, 'box')).toBeInTheDocument()
	})

	it('applies an explicit outline weight', () => {
		const { container } = renderUI(<Box outline="strong">content</Box>)

		expect(bySlot(container, 'box')).toBeInTheDocument()
	})

	it('applies radius, bg, padding, and margin tokens', () => {
		const { container } = renderUI(
			<Box radius="md" bg="surface" p="md" m="sm">
				content
			</Box>,
		)

		expect(bySlot(container, 'box')).toBeInTheDocument()
	})

	it('respects px / py / mx / my overrides', () => {
		const { container } = renderUI(
			<Box px="lg" py="sm" mx="xs" my="md">
				content
			</Box>,
		)

		expect(bySlot(container, 'box')).toBeInTheDocument()
	})

	it('renders with a custom data-slot', () => {
		const { container } = renderUI(<Box data-slot="card">content</Box>)

		expect(bySlot(container, 'card')).toBeInTheDocument()

		expect(bySlot(container, 'box')).toBeNull()
	})

	it('inherits padding from an ambient Density when p is omitted', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Box>content</Box>
			</DensityProvider>,
		)

		// compact → sm step → p-2 via paddingMap.
		expect(bySlot(container, 'box')?.className).toContain('p-2')
	})

	it('explicit p prop wins over the ambient Density', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Box p="lg">content</Box>
			</DensityProvider>,
		)

		const el = bySlot(container, 'box') as HTMLElement

		expect(el.className).toContain('p-4')

		expect(el.className).not.toContain('p-2')
	})

	it('does not apply any padding class when no p and no ambient Density are present', () => {
		const { container } = renderUI(<Box>content</Box>)

		const el = bySlot(container, 'box') as HTMLElement

		expect(el.className).not.toMatch(/(^|\s)p-(xs|sm|md|lg|xl)(\s|$)/)
	})
})
