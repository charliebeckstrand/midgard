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

		const dialog = await screen.findByRole('alertdialog')

		// Each state of the dialog from the close to its removal. A timed read
		// can land after the exit ends on a slow runner, so the test records
		// every change instead.
		const seen: string[] = []

		const observer = new MutationObserver(() => {
			if (dialog.isConnected) seen.push(dialog.textContent ?? '')
		})

		observer.observe(document.body, {
			subtree: true,
			childList: true,
			characterData: true,
			attributes: true,
		})

		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

		await waitFor(() => expect(dialog.isConnected).toBe(false))

		observer.disconnect()

		expect(screen.getByText('Kept')).toBeInTheDocument()

		expect(seen.length).toBeGreaterThan(0)

		expect(seen.filter((text) => !text.includes('Line still pending'))).toEqual([])
	})
})
