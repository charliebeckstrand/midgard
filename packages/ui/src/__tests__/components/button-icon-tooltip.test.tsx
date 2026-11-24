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

	it('keeps a bare button bare while on, and marks it active', () => {
		renderUI(
			<ButtonIconTooltip label="Bold" icon={<svg />} variant="bare" active disabled={false} />,
		)

		expect(screen.getByLabelText('Bold')).toHaveAttribute('data-active')
	})

	it('marks no plain button active, because it takes the soft variant while on', () => {
		renderUI(<ButtonIconTooltip label="Bold" icon={<svg />} active disabled={false} />)

		expect(screen.getByLabelText('Bold')).not.toHaveAttribute('data-active')
	})
})
