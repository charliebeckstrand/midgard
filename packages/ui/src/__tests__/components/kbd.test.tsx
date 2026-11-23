import { describe, expect, it } from 'vitest'
import { Icon } from '../../components/icon'
import { Kbd } from '../../components/kbd'
import { ArrowUp } from '../../primitives/icons/icons'
import { bySlot, renderUI, screen } from '../helpers'

describe('Kbd', () => {
	it('renders with data-slot="kbd"', () => {
		const { container } = renderUI(<Kbd>K</Kbd>)

		const el = bySlot(container, 'kbd')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('KBD')
	})

	it('holds its glyph width instead of stretching in a flex parent', () => {
		const { container } = renderUI(<Kbd>K</Kbd>)

		expect(bySlot(container, 'kbd')).toHaveClass('w-fit')
	})

	it('renders a modifier glyph written into the children, in platform order', () => {
		renderUI(<Kbd>⌃⌘K</Kbd>)

		expect(screen.getByText('⌃⌘K')).toBeInTheDocument()
	})

	it('marks a key with text, and leaves a key with only an icon unmarked', () => {
		const { container } = renderUI(
			<>
				<Kbd>K</Kbd>
				<Kbd>
					<Icon icon={<ArrowUp />} />
				</Kbd>
				<Kbd>
					<Icon icon={<ArrowUp />} />
					<span className="sr-only">Up</span>
				</Kbd>
			</>,
		)

		const [text, icon, named] = container.querySelectorAll('kbd')

		expect(text).toHaveAttribute('data-has-label')

		expect(icon).not.toHaveAttribute('data-has-label')

		expect(named).not.toHaveAttribute('data-has-label')
	})
})
