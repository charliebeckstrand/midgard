import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dialog, DialogPanel, DialogTrigger } from '../../components/dialog'
import { IconButton } from '../../components/icon-button'
import { bySlot, fireEvent, getSlot, renderUI, screen, setupUser, within } from '../helpers'

describe('IconButton', () => {
	const icon = <svg data-testid="icon" />

	const pressedIcon = <svg data-testid="pressed-icon" />

	it('renders with data-slot="icon-button"', () => {
		const { container } = renderUI(
			<IconButton pressed={false} icon={icon} pressedIcon={pressedIcon} aria-label="Toggle" />,
		)

		const el = bySlot(container, 'icon-button')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('BUTTON')
	})

	it('lets a wrapper re-anchor it with its own data-slot', () => {
		const { container } = renderUI(
			<IconButton icon={icon} aria-label="Copy" data-slot="copy-button" />,
		)

		expect(bySlot(container, 'copy-button')?.tagName).toBe('BUTTON')

		expect(bySlot(container, 'icon-button')).toBeNull()
	})

	it('sets aria-pressed based on pressed prop', () => {
		const { container } = renderUI(
			<IconButton pressed={true} icon={icon} pressedIcon={pressedIcon} aria-label="Toggle" />,
		)

		const el = bySlot(container, 'icon-button')

		expect(el).toBePressed()
	})

	// The toggle is the activation the button exists to perform, so a consumer's
	// `preventDefault()` does not cancel it (CONVENTIONS.md §3.9).
	it('runs the user onClick first, and toggles when it prevents the default', () => {
		const calls: string[] = []

		renderUI(
			<IconButton
				onPressedChange={(next) => calls.push(`pressed ${next}`)}
				onClick={(event) => {
					calls.push('consumer')

					event.preventDefault()
				}}
				icon={icon}
				aria-label="Favorite"
			/>,
		)

		const button = screen.getByRole('button', { name: 'Favorite' })

		fireEvent.click(button)

		expect(calls).toEqual(['consumer', 'pressed true'])

		expect(button).toBePressed()
	})

	it.each([
		[false, 'icon', 'pressed-icon'],
		[true, 'pressed-icon', 'icon'],
	])(
		'renders only the active icon when animate is false and pressed is %s',
		(pressed, shown, hidden) => {
			const { container } = renderUI(
				<IconButton
					animate={false}
					pressed={pressed}
					icon={icon}
					pressedIcon={pressedIcon}
					aria-label="Toggle"
				/>,
			)

			const el = getSlot(container, 'icon-button')

			expect(within(el).queryByTestId(shown)).toBeInTheDocument()

			expect(within(el).queryByTestId(hidden)).not.toBeInTheDocument()
		},
	)

	it('renders both icons (for the crossfade) when animate is true', () => {
		const { container } = renderUI(
			<IconButton pressed={false} icon={icon} pressedIcon={pressedIcon} aria-label="Toggle" />,
		)

		const el = getSlot(container, 'icon-button')

		expect(within(el).queryByTestId('icon')).toBeInTheDocument()

		expect(within(el).queryByTestId('pressed-icon')).toBeInTheDocument()
	})

	// The Button slot projection (`*:data-[slot=icon]`) sizes direct children
	// only; a wrapper between button and icon breaks size cascade.
	it('keeps both crossfade icons direct children of the button', () => {
		const { container } = renderUI(
			<IconButton pressed={false} icon={icon} pressedIcon={pressedIcon} aria-label="Toggle" />,
		)

		const el = getSlot(container, 'icon-button')

		expect(el.querySelectorAll(':scope > [data-slot=icon]')).toHaveLength(2)
	})

	it('toggles uncontrolled from defaultPressed and reports through onPressedChange', async () => {
		const user = setupUser()

		const onPressedChange = vi.fn()

		renderUI(
			<IconButton
				defaultPressed
				onPressedChange={onPressedChange}
				icon={icon}
				aria-label="Favorite"
			/>,
		)

		const button = screen.getByRole('button', { name: 'Favorite' })

		expect(button).toBePressed()

		await user.click(button)

		expect(onPressedChange).toHaveBeenCalledWith(false)

		expect(button).toBeUnpressed()
	})

	// Button gives the inline box and the stepped radius. A plain utility in the className comes
	// after the recipe of Button and wins, so the toggle must not set its own layout or radius.
	it('keeps the inline box and the stepped radius of a Button', () => {
		const { container } = renderUI(<IconButton icon={icon} aria-label="Pin" />)

		const { classList } = getSlot(container, 'icon-button')

		expect(classList).toContain('inline-flex')

		expect(classList).toContain('density-rounded-[1,1.5,2,2.5,3]')

		expect(classList).not.toContain('flex')

		expect(classList).not.toContain('rounded-lg')
	})

	it('is an action with no aria-pressed when it takes no pressed state', async () => {
		const user = setupUser()

		const onClick = vi.fn()

		renderUI(<IconButton icon={icon} aria-label="Remove" onClick={onClick} />)

		const button = screen.getByRole('button', { name: 'Remove' })

		expect(button).not.toHaveAttribute('aria-pressed')

		expect(button).toHaveAttribute('type', 'button')

		await user.click(button)

		expect(onClick).toHaveBeenCalledOnce()

		expect(button).not.toHaveAttribute('aria-pressed')
	})

	it('is a toggle when it takes only onPressedChange, and starts unpressed', async () => {
		const user = setupUser()

		const onPressedChange = vi.fn()

		renderUI(<IconButton icon={icon} aria-label="Pin" onPressedChange={onPressedChange} />)

		const button = screen.getByRole('button', { name: 'Pin' })

		expect(button).toBeUnpressed()

		await user.click(button)

		expect(onPressedChange).toHaveBeenCalledWith(true)
	})

	// A toggle with one icon shows its state by the held-down wash. The wash keeps
	// the size of the button, so a bar does not reflow.
	it.each([
		['bare', 'bare', true],
		['plain', 'soft', false],
	] as const)(
		'gives a pressed %s toggle with no pressedIcon the held-down wash',
		(variant, rendered, active) => {
			const { container } = renderUI(
				<IconButton pressed icon={icon} aria-label="Pin" variant={variant} />,
			)

			const el = getSlot(container, 'icon-button')

			expect(el).toHaveAttribute('data-variant', rendered)

			expect(el.hasAttribute('data-active')).toBe(active)
		},
	)

	// Only `bare` and `plain` have a wash. A toggle with no `pressedIcon` on another
	// variant would look the same pressed and unpressed, so the type refuses it.
	it('takes another variant on a toggle only with a pressedIcon', () => {
		const { container } = renderUI(
			<>
				{/* @ts-expect-error A held toggle takes only `bare` or `plain`. */}
				<IconButton defaultPressed icon={icon} aria-label="A" variant="outline" />
				{/* @ts-expect-error An active action takes only `bare` or `plain`. */}
				<IconButton active icon={icon} aria-label="D" variant="outline" />
				<IconButton
					defaultPressed
					icon={icon}
					pressedIcon={pressedIcon}
					aria-label="B"
					variant="outline"
				/>
				<IconButton icon={icon} aria-label="C" variant="outline" />
			</>,
		)

		expect(container.querySelectorAll('[data-slot=icon-button]')).toHaveLength(4)
	})

	// An action whose target is on, such as a search trigger with a query, takes
	// the wash with no `aria-pressed`, because a press of it is not a toggle.
	it.each([
		['bare', 'bare', true],
		['plain', 'soft', false],
	] as const)(
		'gives an active %s action the held-down wash, with no aria-pressed',
		(variant, rendered, marked) => {
			const { container } = renderUI(
				<IconButton active icon={icon} aria-label="Search" variant={variant} />,
			)

			const el = getSlot(container, 'icon-button')

			expect(el).toHaveAttribute('data-variant', rendered)

			expect(el.hasAttribute('data-active')).toBe(marked)

			expect(el).not.toHaveAttribute('aria-pressed')
		},
	)

	it('renders each icon of a list as a direct child of the button', () => {
		const { container } = renderUI(
			<IconButton
				icon={[<svg key="a" data-testid="a" />, <svg key="b" data-testid="b" />]}
				aria-label="Panel"
			/>,
		)

		const el = getSlot(container, 'icon-button')

		expect(el.querySelectorAll(':scope > [data-slot=icon]')).toHaveLength(2)
	})

	it('gives no wash to an unpressed toggle or to a toggle with a pressedIcon', () => {
		const { container } = renderUI(
			<>
				<IconButton pressed={false} icon={icon} aria-label="A" variant="plain" />
				<IconButton pressed icon={icon} pressedIcon={pressedIcon} aria-label="B" />
			</>,
		)

		const [a, b] = container.querySelectorAll('[data-slot=icon-button]')

		expect(a).toHaveAttribute('data-variant', 'plain')

		expect(b).not.toHaveAttribute('data-active')
	})

	// A press can disable its own button, such as a stepper at its limit. A native
	// `disabled` then drops the focus to the page (WCAG 2.4.3).
	it('keeps a disabled button focusable, and drops each press', async () => {
		const user = setupUser()

		const onClick = vi.fn()

		const onPressedChange = vi.fn()

		renderUI(
			<>
				<IconButton icon={icon} aria-label="Next" disabled onClick={onClick} />
				<IconButton
					icon={icon}
					aria-label="Pin"
					disabled
					pressed={false}
					onPressedChange={onPressedChange}
				/>
			</>,
		)

		for (const name of ['Next', 'Pin']) {
			const button = screen.getByRole('button', { name })

			expect(button).not.toBeDisabled()

			expect(button).toHaveAttribute('aria-disabled', 'true')

			await user.click(button)

			expect(button).toHaveFocus()
		}

		expect(onClick).not.toHaveBeenCalled()

		expect(onPressedChange).not.toHaveBeenCalled()
	})

	it('passes mirror to each of its icons', () => {
		const { container } = renderUI(
			<>
				<IconButton icon={icon} aria-label="Next" mirror />
				<IconButton icon={[<svg key="a" />, <svg key="b" />]} aria-label="Panel" mirror />
				<IconButton
					icon={icon}
					pressedIcon={icon}
					aria-label="Swap"
					defaultPressed={false}
					mirror
				/>
			</>,
		)

		const icons = container.querySelectorAll('[data-slot="icon"]')

		expect(icons).toHaveLength(5)

		for (const each of Array.from(icons).slice(0, 3)) {
			expect(each.getAttribute('class')).toContain('rtl:-scale-x-100')
		}

		// The swap mirrors each icon at its own scale step, so the mirror does not
		// replace the x step of the hidden icon.
		const [shown, hidden] = [icons[3], icons[4]]

		expect(shown?.getAttribute('class')).toContain('rtl:-scale-x-100')
		expect(hidden?.getAttribute('class')).toContain('rtl:-scale-x-25')
		expect(hidden?.getAttribute('class')).not.toContain('rtl:-scale-x-100')
	})

	it('takes a disabled button out of the tab order, as native disabled does', async () => {
		const user = setupUser()

		renderUI(
			<>
				<IconButton icon={icon} aria-label="Before" />
				<IconButton icon={icon} aria-label="Off" disabled tabIndex={0} />
				<IconButton icon={icon} aria-label="After" />
			</>,
		)

		expect(screen.getByRole('button', { name: 'Off' })).toHaveAttribute('tabindex', '-1')

		await user.tab()

		expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus()

		await user.tab()

		expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
	})

	it('keeps the focus on a button that its own press disables', async () => {
		const user = setupUser()

		function Stepper() {
			const [at, setAt] = useState(0)

			return (
				<IconButton icon={icon} aria-label="Next" disabled={at === 1} onClick={() => setAt(1)} />
			)
		}

		renderUI(<Stepper />)

		const button = screen.getByRole('button', { name: 'Next' })

		await user.click(button)

		expect(button).toHaveAttribute('aria-disabled', 'true')

		expect(button).toHaveFocus()
	})

	it('opens nothing from a trigger around it while disabled', () => {
		renderUI(
			<Dialog>
				<DialogTrigger>
					<IconButton icon={icon} aria-label="Settings" disabled />
				</DialogTrigger>
				<DialogPanel>Panel</DialogPanel>
			</Dialog>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

		expect(screen.queryByText('Panel')).toBeNull()
	})

	it('renders a link with href, with no type and no aria-pressed', () => {
		renderUI(<IconButton icon={icon} aria-label="Open" href="/next" />)

		const link = screen.getByRole('link', { name: 'Open' })

		expect(link).toHaveAttribute('href', '/next')

		expect(link).not.toHaveAttribute('type')

		expect(link).not.toHaveAttribute('aria-pressed')
	})

	// A tooltip of `true` shows the name, so a description would say it two times.
	it('shows the aria-label as the tooltip of `true`, with no description', async () => {
		const user = setupUser()

		renderUI(<IconButton icon={icon} aria-label="Rotate" tooltip />)

		const button = screen.getByRole('button', { name: 'Rotate' })

		await user.tab()

		expect(button).toHaveFocus()

		expect(screen.getByRole('tooltip')).toHaveTextContent('Rotate')

		expect(button).not.toHaveAttribute('aria-describedby')
	})

	it('describes the button with tooltip content that says more than the name', async () => {
		const user = setupUser()

		renderUI(<IconButton icon={icon} aria-label="Zoom in" tooltip="Zoom to 150%" />)

		const button = screen.getByRole('button', { name: 'Zoom in' })

		await user.tab()

		expect(screen.getByRole('tooltip')).toHaveTextContent('Zoom to 150%')

		expect(button).toHaveAccessibleDescription('Zoom to 150%')
	})
})
