import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { DatePicker } from '../../../components/date-picker'
import { getSlot, renderUI, screen, waitFor } from '../../helpers'

/**
 * DatePicker ARIA roles (real floating engine). `role: null` on the floating
 * hook keeps floating-ui's `useRole` from putting the popup ARIA on the
 * positioning wrapper. Then the trigger is the only control that tells of the
 * dialog. jsdom mocks `useRole` away, so only the real engine runs this path.
 */
describe('DatePicker ARIA roles (real browser)', () => {
	it('puts the popup ARIA on the trigger only', async () => {
		const { container } = renderUI(<DatePicker aria-label="Due date" />)

		const wrapper = getSlot(container, 'control')

		const trigger = screen.getByRole('combobox', { name: 'Due date' })

		expect(wrapper).not.toHaveAttribute('aria-haspopup')

		expect(wrapper).not.toHaveAttribute('aria-expanded')

		await userEvent.click(trigger)

		await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))

		expect(wrapper).not.toHaveAttribute('aria-expanded')

		expect(wrapper).not.toHaveAttribute('aria-controls')

		expect(trigger.getAttribute('aria-controls')).toBe(screen.getByRole('dialog').id)
	})
})
