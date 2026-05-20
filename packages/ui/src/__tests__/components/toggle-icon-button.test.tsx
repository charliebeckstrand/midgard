import { describe, expect, it, vi } from 'vitest'
import { ToggleIconButton } from '../../components/toggle-icon-button'
import { bySlot, fireEvent, renderUI, within } from '../helpers'

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

	it('applies custom className', () => {
		const { container } = renderUI(
			<ToggleIconButton
				pressed={false}
				icon={icon}
				pressedIcon={pressedIcon}
				className="custom"
				aria-label="Toggle"
			/>,
		)

		const el = bySlot(container, 'toggle-icon-button')

		expect(el?.className).toContain('custom')
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

		const el = bySlot(container, 'toggle-icon-button') as HTMLElement

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

		const el = bySlot(container, 'toggle-icon-button') as HTMLElement

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

		const el = bySlot(container, 'toggle-icon-button') as HTMLElement

		expect(within(el).queryByTestId('icon')).toBeInTheDocument()

		expect(within(el).queryByTestId('pressed-icon')).toBeInTheDocument()
	})
})
