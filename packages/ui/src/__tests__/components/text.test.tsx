import { describe, expect, it } from 'vitest'
import { Text, TextSkeleton } from '../../components/text'
import { bySlot, renderUI, screen } from '../helpers'

describe('Text', () => {
	it('renders a p element with data-slot="text"', () => {
		const { container } = renderUI(<Text>Hello</Text>)

		const text = bySlot(container, 'text')

		expect(text).toBeInTheDocument()

		expect(text?.tagName).toBe('P')
	})

	it('renders children', () => {
		renderUI(<Text>Some paragraph text</Text>)

		expect(screen.getByText('Some paragraph text')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Text className="prose">Content</Text>)

		const text = bySlot(container, 'text')

		expect(text?.className).toContain('prose')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Text id="intro">Intro</Text>)

		const text = bySlot(container, 'text')

		expect(text).toHaveAttribute('id', 'intro')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Text>Hello</Text>, { skeleton: true })

		expect(bySlot(container, 'text')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})

describe('TextSkeleton', () => {
	it('renders a placeholder', () => {
		const { container } = renderUI(<TextSkeleton />)

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('carries the text skeleton silhouette', () => {
		const { container } = renderUI(<TextSkeleton />)

		expect(bySlot(container, 'placeholder')?.className).toContain('h-6')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<TextSkeleton className="custom" />)

		expect(bySlot(container, 'placeholder')?.className).toContain('custom')
	})
})
