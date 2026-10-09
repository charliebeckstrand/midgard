import { Search } from 'lucide-react'
import { createRef } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, type Mock, vi } from 'vitest'
import { Button, ButtonSkeleton } from '../../components/button'
import { Group } from '../../components/group'
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'
import { HeadlessProvider } from '../../providers/headless'
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

	/**
	 * A loading button or link is out of the tab order, and it cancels a click
	 * before the `onClick` of the consumer runs.
	 */
	function expectGated(element: HTMLElement, onClick: Mock) {
		expect(element).toHaveAttribute('aria-disabled', 'true')

		expect(element).toHaveAttribute('aria-busy', 'true')

		expect(element).toHaveAttribute('tabindex', '-1')

		expect(fireEvent.click(element)).toBe(false)

		expect(onClick).not.toHaveBeenCalled()
	}

	it('gates a loading button: enabled for its focus, no onClick, no form submission', () => {
		const onClick = vi.fn()

		const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())

		const { container } = renderUI(
			<form onSubmit={onSubmit}>
				<Button loading onClick={onClick}>
					Save
				</Button>
			</form>,
		)

		const button = getSlot<HTMLButtonElement>(container, 'button')

		// A disabled button drops the focus that it has, so a loading button stays enabled.
		expect(button).toBeEnabled()

		expectGated(button, onClick)

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('gates a loading link: no navigation, no onClick, out of the tab order', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			<Button href="/about" loading onClick={onClick}>
				About
			</Button>,
		)

		const link = getSlot<HTMLAnchorElement>(container, 'button')

		// The canceled click prevents the navigation.
		expectGated(link, onClick)

		// A middle click opens a link in a new tab unless its own event is canceled.
		const auxNotCanceled = fireEvent(
			link,
			new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }),
		)

		expect(auxNotCanceled).toBe(false)
	})

	it('paints the zinc fill for a solid or soft button with the inherit color', () => {
		// `inherit` is a text color, and a text color cannot fill a button.
		renderUI(
			<>
				<Button variant="solid" color="inherit">
					Solid
				</Button>
				<Button variant="solid">Solid reference</Button>
				<Button variant="soft" color="inherit">
					Soft
				</Button>
				<Button variant="soft">Soft reference</Button>
			</>,
		)

		for (const name of ['Solid', 'Soft']) {
			expect(screen.getByRole('button', { name }).className).toBe(
				screen.getByRole('button', { name: `${name} reference` }).className,
			)
		}
	})

	it('renders a link button as the anchor itself, with no wrapper', () => {
		const { container } = renderUI(
			<Button href="/report.pdf" type="application/pdf">
				Report
			</Button>,
		)

		const anchor = getSlot<HTMLAnchorElement>(container, 'button')

		expect(anchor.tagName).toBe('A')

		expect(anchor).toHaveAttribute('href', '/report.pdf')

		expect(anchor).toHaveAttribute('type', 'application/pdf')

		// The anchor is the box that a parent lays out, so `flex-1` and the like reach it.
		expect(anchor.parentElement).toBe(container)
	})

	it('shows the spinner in place of the icon of a loading icon-only button', () => {
		renderUI(
			<Button aria-label="Search" loading>
				<Icon icon={<Search />} />
			</Button>,
		)

		const button = screen.getByRole('button', { name: 'Search' })

		expect(button.querySelector('[data-slot="loading-spinner"]')).toBeInTheDocument()

		// The icon stays in the tree for assistive technology, but takes no room.
		expect(button.querySelector('.sr-only [data-slot="icon"]')).toBeInTheDocument()
	})

	it('keeps the prefix and the suffix under the headless provider', () => {
		renderUI(
			<HeadlessProvider>
				<Button type="button" prefix={<span>Before</span>} suffix={<span>After</span>}>
					Label
				</Button>
			</HeadlessProvider>,
		)

		expect(screen.getByRole('button')).toHaveTextContent('BeforeLabelAfter')
	})

	// A button can sit in a line of text, so its skeleton has to be able to as well.
	it('stands in for a button inside a paragraph, as server markup and inline', () => {
		const holder = document.createElement('div')

		holder.innerHTML = renderToString(
			<p>
				Your session ended. <ButtonSkeleton size="sm" />
			</p>,
		)

		const skeleton = getSlot(holder, 'placeholder')

		expect(skeleton.tagName).toBe('SPAN')

		expect(skeleton.parentElement?.tagName).toBe('P')
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

		it('takes xl in an xl scope', () => {
			const { container } = renderUI(
				<div data-density="xl">
					<Button>Large</Button>
				</div>,
			)

			expect(densityStepOf(present(bySlot(container, 'button'), 'button'))).toBe('xl')

			// The stepped classes give `xl` a value of its own.
			expect(findSteps([k.config.base], 'density-text-').xl).toBe('xl')
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

		it('does not count a visually hidden name as a label', () => {
			const { container } = renderUI(
				<Button>
					<Icon icon={<Search />} />
					<span className="sr-only">Search</span>
				</Button>,
			)

			expect(bySlot(container, 'button')).not.toHaveAttribute('data-has-label')
		})
	})
})
