import { describe, expect, it, vi } from 'vitest'
import { type ConfirmFunction, useConfirm } from '../../components/confirm/use-confirm'
import { UIProvider } from '../../providers/ui'
import { act, renderUI } from '../helpers'

/**
 * The host loads the module of the dialog on the first question. When the
 * module does not load, as when the network drops, the question rejects. The
 * failed load needs a module mock, so this suite is in `boundary/`, which runs
 * on forks, and not in the shared-registry `unit` project (see
 * `test-isolation-boundary`).
 */
vi.mock('../../components/confirm/confirm', () => {
	throw new Error('Network down')
})

describe('useConfirm load', () => {
	it('rejects the question when the dialog does not load', async () => {
		const held: { confirm: ConfirmFunction | null } = { confirm: null }

		function Probe() {
			held.confirm = useConfirm()

			return null
		}

		renderUI(
			<UIProvider>
				<Probe />
			</UIProvider>,
		)

		let answer: Promise<boolean> = Promise.resolve(false)

		act(() => {
			answer = (held.confirm as ConfirmFunction)({ title: 'Delete the file?' })
		})

		await act(async () => {
			await expect(answer).rejects.toThrow()
		})
	})
})
