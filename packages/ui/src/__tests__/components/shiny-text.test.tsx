import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShinyText } from '../../components/shiny-text'
import { bySlot, renderUI, stubMatchMedia } from '../helpers'

describe('ShinyText', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('renders its children inside the masked span', () => {
		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Shine')
	})

	it('masks the text with the gradient highlight', () => {
		const { container } = renderUI(<ShinyText shineColor="red">Shine</ShinyText>)

		const el = bySlot(container, 'shiny-text')

		expect(el).toHaveClass('bg-clip-text', 'text-transparent')
		expect(el?.style.backgroundImage).toContain('red')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<ShinyText id="hero">Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveAttribute('id', 'hero')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<ShinyText>Shine</ShinyText>, { skeleton: true })

		expect(bySlot(container, 'shiny-text')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('still renders the text under reduced motion', () => {
		stubMatchMedia((query) => query.includes('prefers-reduced-motion'))

		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Shine')
	})
})
