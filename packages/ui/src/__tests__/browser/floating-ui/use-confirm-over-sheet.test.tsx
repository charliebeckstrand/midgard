import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { useConfirm } from '../../../components/confirm'
import { Sheet, SheetPanel } from '../../../components/sheet'
import { UIProvider } from '../../../providers/ui'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * The dialog of `useConfirm` renders at `UIProvider`, outside the React tree
 * of the caller. A caller in an open modal sheet must still get a dialog that
 * takes the pointer and the focus, and the sheet must work again when the
 * dialog closes.
 */
function SheetApp() {
	const confirm = useConfirm()

	const [outcome, setOutcome] = useState('None')

	return (
		<Sheet open onOpenChange={() => {}}>
			<SheetPanel aria-label="Prediction">
				<Button
					onClick={async () => {
						const confirmed = await confirm({
							title: 'Line still pending',
							confirm: { label: 'Save anyway' },
						})

						setOutcome(confirmed ? 'Saved' : 'Kept')
					}}
				>
					Save
				</Button>
				<Button onClick={() => setOutcome('Cleared')}>Reset</Button>
				<output>{outcome}</output>
			</SheetPanel>
		</Sheet>
	)
}

describe('useConfirm over a modal sheet', () => {
	it('asks over an open modal sheet, and gives the sheet back after the answer', async () => {
		renderUI(
			<UIProvider>
				<SheetApp />
			</UIProvider>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Save' }))

		const dialog = await screen.findByRole('alertdialog')

		await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))

		await userEvent.click(screen.getByRole('button', { name: 'Save anyway' }))

		await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())

		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())

		await userEvent.click(screen.getByRole('button', { name: 'Reset' }))

		expect(screen.getByRole('status')).toHaveTextContent('Cleared')
	})
})
