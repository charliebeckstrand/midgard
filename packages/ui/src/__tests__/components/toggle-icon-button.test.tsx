import { describe, expect, it, vi } from 'vitest'
import { ToggleIconButton } from '../../components/toggle-icon-button'
import { bySlot, renderUI } from '../helpers'

describe('ToggleIconButton', () => {
	const icon = <svg data-testid="icon" />
	const activeIcon = <svg data-testid="active-icon" />

	it('renders with data-slot="toggle-icon-button"', () => {
		const { container } = renderUI(
			<ToggleIconButton pressed={false} icon={icon} activeIcon={activeIcon} />,
		)

		const el = bySlot(container, 'toggle-icon-button')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('BUTTON')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<ToggleIconButton pressed={false} icon={icon} activeIcon={activeIcon} className="custom" />,
		)

		const el = bySlot(container, 'toggle-icon-button')

		expect(el?.className).toContain('custom')
	})

	it('sets aria-pressed based on pressed prop', () => {
		const { container } = renderUI(
			<ToggleIconButton pressed={true} icon={icon} activeIcon={activeIcon} />,
		)

		const el = bySlot(container, 'toggle-icon-button')

		expect(el).toHaveAttribute('aria-pressed', 'true')
	})

	it('forwards click handler', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			<ToggleIconButton pressed={false} icon={icon} activeIcon={activeIcon} onClick={onClick} />,
		)

		const el = bySlot(container, 'toggle-icon-button')

		el?.click()

		expect(onClick).toHaveBeenCalledOnce()
	})
})
