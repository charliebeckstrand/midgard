import { Search } from 'lucide-react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Group } from '../../components/group'
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'
import { k } from '../../recipes/kata/button'
import { bySlot, densityStepOf, fireEvent, getSlot, present, renderUI, screen } from '../helpers'
import { findSteps } from '../helpers/class-stops'

describe('Button', () => {
	it('renders a button element with data-slot', () => {
		const { container } = renderUI(<Button>Click me</Button>)

		const button = bySlot(container, 'button')

		expect(button).toBeInTheDocument()

		expect(button?.tagName).toBe('BUTTON')
	})

	it('defaults to the native submit type without emitting a type attribute', () => {
		const { container } = renderUI(<Button>Submit</Button>)

		const button = getSlot<HTMLButtonElement>(container, 'button')

		// No explicit attribute — the DOM applies the native `submit` default, so
		// the IDL property reads `submit` while the attribute stays absent.
		expect(button).not.toHaveAttribute('type')

		expect(button.type).toBe('submit')
	})

	it('forwards an explicit type, overriding the submit default', () => {
		const { container } = renderUI(<Button type="button">Action</Button>)

		expect(bySlot(container, 'button')).toHaveAttribute('type', 'button')
	})

	it('forwards click handler', () => {
		const onClick = vi.fn()

		const { container } = renderUI(<Button onClick={onClick}>Click</Button>)

		fireEvent.click(getSlot(container, 'button'))

		expect(onClick).toHaveBeenCalledOnce()
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

	it('gates a loading link: no navigation, no onClick, out of the tab order', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			<Button href="/about" loading onClick={onClick}>
				About
			</Button>,
		)

		const link = getSlot<HTMLAnchorElement>(container, 'button')

		expect(link).toHaveAttribute('aria-disabled', 'true')

		expect(link).toHaveAttribute('aria-busy', 'true')

		// Removed from the tab order, mirroring the disabled <button> branch.
		expect(link).toHaveAttribute('tabindex', '-1')

		// Activation is canceled: the default navigation is prevented and the
		// consumer's handler never fires.
		const notCanceled = fireEvent.click(link)

		expect(notCanceled).toBe(false)

		expect(onClick).not.toHaveBeenCalled()
	})

	it('renders the motion wrapper around a link button', () => {
		const { container } = renderUI(<Button href="/spring">Springy</Button>)

		expect(bySlot(container, 'button')).toBeInTheDocument()

		expect(screen.getByText('Springy').closest('a')).toHaveAttribute('href', '/spring')
	})

	describe('size resolution', () => {
		// jsdom loads no stylesheet, so each test reads the step that the stepped
		// classes give the button from its density scopes (`densityStepOf`).
		it('inherits size from <Group> when no explicit size prop is set', () => {
			const { container } = renderUI(
				<Group size="lg">
					<Button>Inherit</Button>
				</Group>,
			)

			expect(densityStepOf(present(bySlot(container, 'button'), 'button'))).toBe('lg')
		})

		it('explicit size prop overrides <Group> inheritance', () => {
			const { container } = renderUI(
				<Group size="lg">
					<Button size="sm">Override</Button>
				</Group>,
			)

			expect(densityStepOf(present(bySlot(container, 'button'), 'button'))).toBe('sm')
		})

		// A control slot (`<Input>` prefix / suffix, `<SelectTrigger>` slots) is a
		// density scope one step below its host. A button in the slot reads that
		// step, whatever scope encloses the control.

		it('takes the step below its host control in a slot', () => {
			const { container } = renderUI(
				<div data-density="lg">
					<Input aria-label="Field" size="md" prefix={<Button>Slot</Button>} />
				</div>,
			)

			expect(densityStepOf(present(bySlot(container, 'button'), 'button'))).toBe('sm')
		})

		it('drops to xs in a slot of an sm control', () => {
			const { container } = renderUI(
				<Input aria-label="Field" size="sm" prefix={<Button>Slot</Button>} />,
			)

			expect(densityStepOf(present(bySlot(container, 'button'), 'button'))).toBe('xs')
		})

		it('explicit size prop still wins in a slot', () => {
			const { container } = renderUI(
				<Input aria-label="Field" size="lg" prefix={<Button size="md">Override</Button>} />,
			)

			expect(densityStepOf(present(bySlot(container, 'button'), 'button'))).toBe('md')
		})

		it('takes lg in an xl scope, because it has no xl size', () => {
			const { container } = renderUI(
				<div data-density="xl">
					<Button>Large</Button>
				</div>,
			)

			expect(densityStepOf(present(bySlot(container, 'button'), 'button'))).toBe('xl')

			// The stepped classes give `xl` the `lg` value.
			expect(findSteps([k.config.base], 'density-text-').xl).toBe('lg')
		})
	})

	describe('label detection', () => {
		// A labeled button carries `data-has-label`, which the recipe reads to
		// override py so the button matches same-size Input/Select height. An
		// icon-only button omits the attribute and keeps its square padding.
		it('marks a text-only button as labeled', () => {
			const { container } = renderUI(<Button>Save</Button>)

			expect(bySlot(container, 'button')).toHaveAttribute('data-has-label')
		})

		it('marks a button with an icon prefix and text as labeled', () => {
			const { container } = renderUI(<Button prefix={<Icon icon={<Search />} />}>Search</Button>)

			expect(bySlot(container, 'button')).toHaveAttribute('data-has-label')
		})

		it('does not mark an icon-only button as labeled', () => {
			const { container } = renderUI(
				<Button>
					<Icon icon={<Search />} />
				</Button>,
			)

			expect(bySlot(container, 'button')).not.toHaveAttribute('data-has-label')
		})
	})
})
