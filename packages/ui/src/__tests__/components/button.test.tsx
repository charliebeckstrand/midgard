import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Group } from '../../components/group'
import { AffixContext } from '../../primitives/affix'
import { Density } from '../../primitives/density'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

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

		fireEvent.click(button as HTMLElement)

		expect(onClick).toHaveBeenCalledOnce()
	})

	it('renders as a link when href is provided', () => {
		const { container } = renderUI(<Button href="/about">About</Button>)

		const link = bySlot(container, 'button')

		expect(link).toBeInTheDocument()

		expect(link?.tagName).toBe('A')

		expect(link).toHaveAttribute('href', '/about')
	})

	it('forwards ref to the button element', () => {
		const ref = createRef<HTMLButtonElement>()

		renderUI(<Button ref={ref}>Click</Button>)

		expect(ref.current).toBeInstanceOf(HTMLButtonElement)
	})

	it('forwards ref to the anchor element when href is provided', () => {
		const ref = createRef<HTMLAnchorElement>()

		renderUI(
			<Button href="/about" ref={ref}>
				About
			</Button>,
		)

		expect(ref.current).toBeInstanceOf(HTMLAnchorElement)
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

	it('renders the spring wrapper around a link button', () => {
		const { container } = renderUI(
			<Button href="/spring" spring>
				Springy
			</Button>,
		)

		expect(bySlot(container, 'button')).toBeInTheDocument()

		expect(screen.getByText('Springy').closest('a')).toHaveAttribute('href', '/spring')
	})

	it('renders the spring wrapper around a button-shaped button', () => {
		const { container } = renderUI(<Button spring>Click</Button>)

		expect(bySlot(container, 'button')?.tagName).toBe('BUTTON')
	})

	describe('size resolution', () => {
		// Each size variant brings a distinct text class via ji; matching
		// it confirms which size the kata actually rendered.
		const textClassFor = {
			xs: 'text-xs',
			sm: 'text-sm',
			md: 'text-base',
			lg: 'text-lg',
		} as const

		it('inherits size from <Group> when no explicit size prop is set', () => {
			const { container } = renderUI(
				<Group size="lg">
					<Button>Inherit</Button>
				</Group>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.lg)
		})

		it('inherits size from the Density context when no explicit size prop is set', () => {
			const { container } = renderUI(
				<Density scale="sm">
					<Button>Inherit</Button>
				</Density>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.sm)
		})

		it('explicit size prop overrides <Group> inheritance', () => {
			const { container } = renderUI(
				<Group size="lg">
					<Button size="sm">Override</Button>
				</Group>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.sm)
		})

		it('falls back to its own default when no wrapper provides a size', () => {
			const { container } = renderUI(<Button>Bare</Button>)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.md)
		})

		// Regression: `<Input>` / `<SelectTrigger>` wrap their affix descendants
		// in an `<AffixContext>` carrying the one-step-smaller affix size. The
		// Affix cascade is read first by `useSizeWide` — so when `<Density>` (or
		// a surrounding `<Card>`) mounts an outer Step cascade at the app root,
		// the affix wrap still pins the button to the smaller affix size.

		it('Affix wins over an enclosing Density', () => {
			const { container } = renderUI(
				<Density scale="lg">
					<AffixContext value="sm">
						<Button>Affix</Button>
					</AffixContext>
				</Density>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.sm)
			expect(bySlot(container, 'button')?.className).not.toContain(textClassFor.lg)
		})

		it('Affix can drop a button to xs', () => {
			const { container } = renderUI(
				<Density scale="sm">
					<AffixContext value="xs">
						<Button>Affix</Button>
					</AffixContext>
				</Density>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.xs)
		})

		it('explicit size prop still wins over Affix', () => {
			const { container } = renderUI(
				<Density scale="lg">
					<AffixContext value="sm">
						<Button size="md">Override</Button>
					</AffixContext>
				</Density>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.md)
		})

		it('inherits Density when no explicit size is set', () => {
			const { container } = renderUI(
				<Density scale="lg">
					<Button>Density</Button>
				</Density>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.lg)
		})
	})
})
