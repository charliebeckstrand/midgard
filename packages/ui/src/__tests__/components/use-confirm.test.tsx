import { describe, expect, it } from 'vitest'
import { type ConfirmFunction, useConfirm } from '../../components/confirm'
import { UIProvider } from '../../providers/ui'
import { act, attach, fireEvent, renderUI, screen, waitFor } from '../helpers'

/** Renders a probe under a `UIProvider`, and returns the function it got. */
function setup(provider: { portalContainer?: HTMLElement } = {}) {
	const held: { confirm: ConfirmFunction | null } = { confirm: null }

	function Probe() {
		held.confirm = useConfirm()

		return null
	}

	const result = renderUI(
		<UIProvider {...provider}>
			<Probe />
		</UIProvider>,
	)

	// The provider loads the dialog on the first question, so the question waits
	// for the dialog. The answer is in an object, so the await does not take it.
	const ask = async (options: Parameters<ConfirmFunction>[0] = {}) => {
		let answer: Promise<boolean> = Promise.resolve(false)

		act(() => {
			answer = (held.confirm as ConfirmFunction)(options)
		})

		await screen.findByRole('alertdialog')

		return { answer }
	}

	return { ...result, held, ask }
}

describe('useConfirm', () => {
	it('throws outside a UIProvider', () => {
		function Probe() {
			useConfirm()

			return null
		}

		expect(() => renderUI(<Probe />)).toThrow('useConfirm must be used within a UIProvider')
	})

	it('shows the question in the alertdialog of the provider', async () => {
		const { ask } = setup()

		await ask({
			title: 'Delete the file?',
			description: 'You cannot undo this.',
			confirm: { label: 'Delete', color: 'red' },
			cancel: { label: 'Keep' },
		})

		const dialog = screen.getByRole('alertdialog')

		expect(dialog).toHaveTextContent('Delete the file?')

		expect(dialog).toHaveTextContent('You cannot undo this.')

		expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument()
	})

	it('resolves true when the user confirms', async () => {
		const { ask } = setup()

		const { answer } = await ask({ confirm: { label: 'Delete' } })

		fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

		await expect(answer).resolves.toBe(true)
	})

	it('resolves false when the user cancels', async () => {
		const { ask } = setup()

		const { answer } = await ask()

		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

		await expect(answer).resolves.toBe(false)
	})

	it('resolves false when the user dismisses the dialog with Escape', async () => {
		const { ask } = setup()

		const { answer } = await ask()

		fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })

		await expect(answer).resolves.toBe(false)
	})

	it('resolves an open question false when a new question replaces it', async () => {
		const { ask } = setup()

		const { answer: first } = await ask({ title: 'First?' })

		const { answer: second } = await ask({ title: 'Second?' })

		await expect(first).resolves.toBe(false)

		expect(screen.getByRole('alertdialog')).toHaveTextContent('Second?')

		fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

		await expect(second).resolves.toBe(true)
	})

	it('resolves an open question false when the provider unmounts', async () => {
		const { ask, unmount } = setup()

		const { answer } = await ask()

		unmount()

		await expect(answer).resolves.toBe(false)
	})

	it('keeps the function identity across renders and questions', async () => {
		const seen = new Set<ConfirmFunction>()

		function Probe({ label }: { label: string }) {
			seen.add(useConfirm())

			return <span>{label}</span>
		}

		const { rerender } = renderUI(
			<UIProvider>
				<Probe label="a" />
			</UIProvider>,
		)

		rerender(
			<UIProvider>
				<Probe label="b" />
			</UIProvider>,
		)

		const [confirm] = seen

		act(() => {
			void confirm?.({})
		})

		await screen.findByRole('alertdialog')

		expect(seen.size).toBe(1)
	})

	it('holds the dialog open, pending, while the action runs, then resolves true', async () => {
		const { ask } = setup()

		let finish = () => {}

		const work = new Promise<void>((resolve) => {
			finish = resolve
		})

		const { answer } = await ask({ confirm: { label: 'Delete' }, action: () => work })

		const button = screen.getByRole('button', { name: 'Delete' })

		fireEvent.click(button)

		await waitFor(() => expect(button).toHaveAttribute('aria-disabled', 'true'))

		expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

		// A dismissal waits for the work.
		fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })

		expect(screen.getByRole('alertdialog')).toBeInTheDocument()

		await act(async () => {
			finish()

			await work
		})

		await expect(answer).resolves.toBe(true)
	})

	it('rejects with the error of a failed action', async () => {
		const { ask } = setup()

		const failure = new Error('Network down')

		const { answer } = await ask({
			action: () => Promise.reject(failure),
		})

		const caught = answer.catch((error: unknown) => error)

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

			await caught
		})

		await expect(caught).resolves.toBe(failure)
	})

	it('portals the dialog into the container of the provider', async () => {
		const target = attach(document.createElement('div'))

		const { ask } = setup({ portalContainer: target })

		await ask()

		expect(target).toContainElement(screen.getByRole('alertdialog'))
	})
})
