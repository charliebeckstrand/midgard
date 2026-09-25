import { describe, expect, it, vi } from 'vitest'
import { ToggleIconButton } from '../../components/toggle-icon-button'
import { bySlot, fireEvent, getSlot, renderUI, screen, userEvent, within } from '../helpers'

describe('ToggleIconButton', () => {
	const icon = <svg data-testid="icon" />

	const pressedIcon = <svg data-testid="pressed-icon" />

	it('renders with data-slot="toggle-icon-button"', () => {
		const { container } = renderUI(
			<ToggleIconButton
				pressed={false}
				icon={icon}
				pressedIcon={pressedIcon}
				aria-label="Toggle"
			/>,
		)

		const el = bySlot(container, 'toggle-icon-button')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('BUTTON')
	})

	it('sets aria-pressed based on pressed prop', () => {
		const { container } = renderUI(
			<ToggleIconButton pressed={true} icon={icon} pressedIcon={pressedIcon} aria-label="Toggle" />,
		)

		const el = bySlot(container, 'toggle-icon-button')

		expect(el).toHaveAttribute('aria-pressed', 'true')
	})

	it('forwards click handler', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			<ToggleIconButton
				pressed={false}
				icon={icon}
				pressedIcon={pressedIcon}
				onClick={onClick}
				aria-label="Toggle"
			/>,
		)

		const el = bySlot(container, 'toggle-icon-button')

		fireEvent.click(el as HTMLElement)

		expect(onClick).toHaveBeenCalledOnce()
	})

	// The toggle is the activation the button exists to perform, so a consumer's
	// `preventDefault()` does not cancel it (CONVENTIONS.md §3.9).
	it('runs the user onClick first, and toggles when it prevents the default', () => {
		const calls: string[] = []

		renderUI(
			<ToggleIconButton
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

		expect(button).toHaveAttribute('aria-pressed', 'true')
	})

	it('renders a single icon when animate is false and pressed is false', () => {
		const { container } = renderUI(
			<ToggleIconButton
				animate={false}
				pressed={false}
				icon={icon}
				pressedIcon={pressedIcon}
				aria-label="Toggle"
			/>,
		)

		const el = getSlot(container, 'toggle-icon-button')

		expect(el).toBeInTheDocument()

		expect(within(el).queryByTestId('icon')).toBeInTheDocument()

		expect(within(el).queryByTestId('pressed-icon')).not.toBeInTheDocument()
	})

	it('renders only the active icon when animate is false and pressed is true', () => {
		const { container } = renderUI(
			<ToggleIconButton
				animate={false}
				pressed={true}
				icon={icon}
				pressedIcon={pressedIcon}
				aria-label="Toggle"
			/>,
		)

		const el = getSlot(container, 'toggle-icon-button')

		expect(within(el).queryByTestId('pressed-icon')).toBeInTheDocument()

		expect(within(el).queryByTestId('icon')).not.toBeInTheDocument()
	})

	it('renders both icons (for the crossfade) when animate is true', () => {
		const { container } = renderUI(
			<ToggleIconButton
				pressed={false}
				icon={icon}
				pressedIcon={pressedIcon}
				aria-label="Toggle"
			/>,
		)

		const el = getSlot(container, 'toggle-icon-button')

		expect(within(el).queryByTestId('icon')).toBeInTheDocument()

		expect(within(el).queryByTestId('pressed-icon')).toBeInTheDocument()
	})

	// The Button slot projection (`*:data-[slot=icon]`) sizes direct children
	// only; a wrapper between button and icon breaks size cascade.
	it('keeps both crossfade icons direct children of the button', () => {
		const { container } = renderUI(
			<ToggleIconButton
				pressed={false}
				icon={icon}
				pressedIcon={pressedIcon}
				aria-label="Toggle"
			/>,
		)

		const el = getSlot(container, 'toggle-icon-button')

		expect(el.querySelectorAll(':scope > [data-slot=icon]')).toHaveLength(2)
	})

	it('toggles uncontrolled from defaultPressed and reports through onPressedChange', async () => {
		const user = userEvent.setup()

		const onPressedChange = vi.fn()

		renderUI(
			<ToggleIconButton
				defaultPressed
				onPressedChange={onPressedChange}
				icon={icon}
				aria-label="Favorite"
			/>,
		)

		const button = screen.getByRole('button', { name: 'Favorite' })

		expect(button).toHaveAttribute('aria-pressed', 'true')

		await user.click(button)

		expect(onPressedChange).toHaveBeenCalledWith(false)

		expect(button).toHaveAttribute('aria-pressed', 'false')
	})
})
