import { describe, expect, it, vi } from 'vitest'
import { ToggleIconButton } from '../../components/toggle-icon-button'
import { bySlot, fireEvent, getSlot, renderUI, screen, setupUser, within } from '../helpers'

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

	it('lets a wrapper re-anchor it with its own data-slot', () => {
		const { container } = renderUI(
			<ToggleIconButton icon={icon} aria-label="Copy" data-slot="copy-button" />,
		)

		expect(bySlot(container, 'copy-button')?.tagName).toBe('BUTTON')

		expect(bySlot(container, 'toggle-icon-button')).toBeNull()
	})

	it('sets aria-pressed based on pressed prop', () => {
		const { container } = renderUI(
			<ToggleIconButton pressed={true} icon={icon} pressedIcon={pressedIcon} aria-label="Toggle" />,
		)

		const el = bySlot(container, 'toggle-icon-button')

		expect(el).toHaveAttribute('aria-pressed', 'true')
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

	it.each([
		[false, 'icon', 'pressed-icon'],
		[true, 'pressed-icon', 'icon'],
	])(
		'renders only the active icon when animate is false and pressed is %s',
		(pressed, shown, hidden) => {
			const { container } = renderUI(
				<ToggleIconButton
					animate={false}
					pressed={pressed}
					icon={icon}
					pressedIcon={pressedIcon}
					aria-label="Toggle"
				/>,
			)

			const el = getSlot(container, 'toggle-icon-button')

			expect(within(el).queryByTestId(shown)).toBeInTheDocument()

			expect(within(el).queryByTestId(hidden)).not.toBeInTheDocument()
		},
	)

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
		const user = setupUser()

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
