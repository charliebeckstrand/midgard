import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { useConfirm } from '../../../components/confirm'
import { Sheet, SheetPanel } from '../../../components/sheet'
import { UIProvider } from '../../../providers/ui'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * The dialog of `useConfirm` keeps the words of a question while it closes, so
 * the text does not change during the exit animation. Real Motion is
 * necessary: the instant mock removes the node in the commit that closes it.
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
				<output>{outcome}</output>
			</SheetPanel>
		</Sheet>
	)
}

describe('useConfirm exit', () => {
	it('keeps the words of the question during the exit animation', async () => {
		renderUI(
			<UIProvider>
				<SheetApp />
			</UIProvider>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Save' }))

		await screen.findByRole('alertdialog')

		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

		// The answer comes before the exit ends, and the title is still there.
		await waitFor(() => expect(screen.getByText('Kept')).toBeInTheDocument())

		expect(screen.getByText('Line still pending')).toBeInTheDocument()

		await waitFor(() => expect(screen.queryByText('Line still pending')).toBeNull())
	})
})
