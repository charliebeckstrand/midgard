import { describe, expect, it } from 'vitest'
import { ButtonIconTooltip } from '../../components/button/button-icon-tooltip'
import { Dialog, DialogPanel, DialogTrigger } from '../../components/dialog'
import { fireEvent, renderUI, screen } from '../helpers'

describe('ButtonIconTooltip', () => {
	it('stays focusable while disabled, and a press opens nothing', () => {
		renderUI(
			<Dialog>
				<DialogTrigger>
					<ButtonIconTooltip label="Settings" icon={<svg />} disabled />
				</DialogTrigger>
				<DialogPanel>Panel</DialogPanel>
			</Dialog>,
		)

		const button = screen.getByLabelText('Settings')

		expect(button).toBeEnabled()

		expect(button).toHaveAttribute('aria-disabled', 'true')

		fireEvent.click(button)

		expect(screen.queryByText('Panel')).toBeNull()
	})
})
