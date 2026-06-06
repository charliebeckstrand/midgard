import { describe, expect, it } from 'vitest'
import { Heading, HeadingSkeleton } from '../../components/heading'
import { bySlot, renderUI, screen } from '../helpers'

describe('Heading', () => {
	it('renders an h1 by default with data-slot="heading"', () => {
		const { container } = renderUI(<Heading>Title</Heading>)

		const heading = bySlot(container, 'heading')

		expect(heading).toBeInTheDocument()

		expect(heading?.tagName).toBe('H1')
	})

	it.each([1, 2, 3, 4, 5, 6] as const)('renders an h%i when level=%i', (level) => {
		const { container } = renderUI(<Heading level={level}>Title</Heading>)

		const heading = bySlot(container, 'heading')

		expect(heading?.tagName).toBe(`H${level}`)
	})

	it('renders children', () => {
		renderUI(<Heading>My Title</Heading>)

		expect(screen.getByText('My Title')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Heading className="hero">Big</Heading>)

		const heading = bySlot(container, 'heading')

		expect(heading?.className).toContain('hero')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Heading id="main-title">Main</Heading>)

		const heading = bySlot(container, 'heading')

		expect(heading).toHaveAttribute('id', 'main-title')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Heading>Title</Heading>, { skeleton: true })

		expect(bySlot(container, 'heading')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})

describe('HeadingSkeleton', () => {
	it('renders a placeholder', () => {
		const { container } = renderUI(<HeadingSkeleton />)

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('defaults to the level-1 height', () => {
		const { container } = renderUI(<HeadingSkeleton />)

		expect(bySlot(container, 'placeholder')?.className).toContain('h-8')
	})

	it('tracks height to the level prop', () => {
		const { container } = renderUI(<HeadingSkeleton level={3} />)

		expect(bySlot(container, 'placeholder')?.className).toContain('h-6')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<HeadingSkeleton className="custom" />)

		expect(bySlot(container, 'placeholder')?.className).toContain('custom')
	})
})
