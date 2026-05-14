import { Search } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Group } from '../../components/group'
import { Icon } from '../../components/icon'
import { AffixSizeProvider } from '../../components/input/context'
import { ConcentricProvider } from '../../primitives'
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

	describe('label detection', () => {
		// data-has-label drives the icon-only vs labelled padding in the recipe.
		// Text children produce a labelled button; icon-only children do not, so
		// <Button><Icon /></Button> matches <Button prefix={<Icon />} />.

		it('marks the button as labelled when children contain text', () => {
			const { container } = renderUI(<Button>Save</Button>)

			expect(bySlot(container, 'button')).toHaveAttribute('data-has-label', 'true')
		})

		it('does not mark the button as labelled when the only child is an <Icon>', () => {
			const { container } = renderUI(
				<Button>
					<Icon icon={<Search />} />
				</Button>,
			)

			expect(bySlot(container, 'button')).not.toHaveAttribute('data-has-label')
		})

		it('does not mark the button as labelled when the only child is a raw <svg>', () => {
			const { container } = renderUI(
				<Button>
					<svg aria-hidden />
				</Button>,
			)

			expect(bySlot(container, 'button')).not.toHaveAttribute('data-has-label')
		})

		it('does not mark the button as labelled when the only child opts in via data-slot="icon"', () => {
			const { container } = renderUI(
				<Button>
					<span data-slot="icon" />
				</Button>,
			)

			expect(bySlot(container, 'button')).not.toHaveAttribute('data-has-label')
		})

		it('marks the button as labelled when children mix an icon and text', () => {
			const { container } = renderUI(
				<Button>
					<Icon icon={<Search />} />
					Search
				</Button>,
			)

			expect(bySlot(container, 'button')).toHaveAttribute('data-has-label', 'true')
		})

		it('produces equivalent attributes for icon-as-child and icon-as-prefix', () => {
			const child = renderUI(
				<Button>
					<Icon icon={<Search />} />
				</Button>,
			)
			const prefix = renderUI(<Button prefix={<Icon icon={<Search />} />} />)

			const childButton = bySlot(child.container, 'button')
			const prefixButton = bySlot(prefix.container, 'button')

			expect(childButton?.className).toBe(prefixButton?.className)
			expect(childButton?.hasAttribute('data-has-label')).toBe(false)
			expect(prefixButton?.hasAttribute('data-has-label')).toBe(false)
		})
	})

	describe('size resolution', () => {
		// Each size variant brings a distinct text class via ji.size; matching
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

		it('inherits size from the concentric context when no explicit size prop is set', () => {
			const { container } = renderUI(
				<ConcentricProvider value={{ size: 'sm' }}>
					<Button>Inherit</Button>
				</ConcentricProvider>,
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

		// Regression: `<Input>` / `<SelectTrigger>` / `<Grid>` wrap their affix
		// descendants in `<AffixSizeProvider>` to broadcast a one-step-smaller
		// size. AffixSize must beat Concentric in the resolution chain — when
		// `<Density>` is mounted at the app root every Button has a non-null
		// Concentric ancestor, so an earlier ordering of
		// `explicit ?? concentric ?? affixSize` caused affix buttons (and badges)
		// to render at the outer surface size instead of one step smaller.

		it('AffixSize wins over Concentric when both are set', () => {
			const { container } = renderUI(
				<ConcentricProvider value={{ size: 'lg' }}>
					<AffixSizeProvider value="sm">
						<Button>Affix</Button>
					</AffixSizeProvider>
				</ConcentricProvider>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.sm)
			expect(bySlot(container, 'button')?.className).not.toContain(textClassFor.lg)
		})

		it('AffixSize can drop a button to xs (a size Concentric does not express)', () => {
			const { container } = renderUI(
				<ConcentricProvider value={{ size: 'sm' }}>
					<AffixSizeProvider value="xs">
						<Button>Affix</Button>
					</AffixSizeProvider>
				</ConcentricProvider>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.xs)
		})

		it('explicit size prop still wins over AffixSize', () => {
			const { container } = renderUI(
				<ConcentricProvider value={{ size: 'lg' }}>
					<AffixSizeProvider value="sm">
						<Button size="md">Override</Button>
					</AffixSizeProvider>
				</ConcentricProvider>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.md)
		})

		it('falls back to Concentric when no AffixSize is set', () => {
			const { container } = renderUI(
				<ConcentricProvider value={{ size: 'lg' }}>
					<Button>Concentric</Button>
				</ConcentricProvider>,
			)

			expect(bySlot(container, 'button')?.className).toContain(textClassFor.lg)
		})
	})
})
