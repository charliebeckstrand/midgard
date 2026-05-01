import { describe, expect, it, vi } from 'vitest'
import { Attached } from '../../components/attached'
import { Button } from '../../components/button'
import { Concentric } from '../../components/concentric'
import { bySlot, renderUI, screen } from '../helpers'

describe('Button', () => {
	it('renders a button element with data-slot', () => {
		const { container } = renderUI(<Button>Click me</Button>)

		const button = bySlot(container, 'button')

		expect(button).toBeInTheDocument()

		expect(button?.tagName).toBe('BUTTON')
	})

	it('defaults to type="button"', () => {
		const { container } = renderUI(<Button>Submit</Button>)

		const button = bySlot(container, 'button')

		expect(button).toHaveAttribute('type', 'button')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Button className="custom">Ok</Button>)

		const button = bySlot(container, 'button')

		expect(button?.className).toContain('custom')
	})

	it('forwards click handler', async () => {
		const onClick = vi.fn()

		const { container } = renderUI(<Button onClick={onClick}>Click</Button>)

		const button = bySlot(container, 'button')

		button?.click()

		expect(onClick).toHaveBeenCalledOnce()
	})

	it('renders as a link when href is provided', () => {
		const { container } = renderUI(<Button href="/about">About</Button>)

		const link = bySlot(container, 'button')

		expect(link).toBeInTheDocument()

		expect(link?.tagName).toBe('A')

		expect(link).toHaveAttribute('href', '/about')
	})

	it('disables the button when disabled prop is set', () => {
		const { container } = renderUI(<Button disabled>No</Button>)

		const button = bySlot(container, 'button')

		expect(button).toBeDisabled()
	})

	it('disables the button and sets aria-busy when loading', () => {
		const { container } = renderUI(<Button loading>Save</Button>)

		const button = bySlot(container, 'button')

		expect(button).toBeDisabled()

		expect(button).toHaveAttribute('aria-busy', 'true')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Button>Save</Button>, { skeleton: true })

		expect(bySlot(container, 'button')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('renders children content', () => {
		renderUI(<Button>Hello World</Button>)

		expect(screen.getByText('Hello World')).toBeInTheDocument()
	})

	describe('size resolution', () => {
		// Each size variant brings a distinct text class via ji.size; matching
		// it confirms which size the kata actually rendered.
		const textClassFor = {
			sm: 'text-sm/5',
			md: 'text-base/6',
			lg: 'text-lg/7',
		} as const

		it('inherits size from <Attached> when no explicit size prop is set', () => {
			const { container } = renderUI(
				<Attached size="lg">
					<Button>Inherit</Button>
				</Attached>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.lg)
		})

		it('inherits size from <Concentric> when no explicit size prop is set', () => {
			const { container } = renderUI(
				<Concentric size="sm">
					<Button>Inherit</Button>
				</Concentric>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.sm)
		})

		it('explicit size prop overrides <Attached> inheritance', () => {
			const { container } = renderUI(
				<Attached size="lg">
					<Button size="sm">Override</Button>
				</Attached>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.sm)
		})

		it('falls back to its own default when no wrapper provides a size', () => {
			const { container } = renderUI(<Button>Bare</Button>)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.md)
		})
	})
})
