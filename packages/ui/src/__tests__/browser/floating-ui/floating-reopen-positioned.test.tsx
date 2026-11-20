import { describe, expect, it } from 'vitest'
import { useFloatingPanel } from '../../../hooks/use-floating-panel'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * A panel that opens again while its element is still mounted, as in its exit
 * animation, is placed again. floating-ui sets `isPositioned` to `false` when
 * the panel closes. It places the panel again only on a pass, and a reopen
 * with no scroll or resize starts no pass. The jsdom suite mocks
 * `@floating-ui/react`, so the case runs here.
 */
describe('a floating panel that opens again while mounted (real floating engine)', () => {
	/** A panel that stays mounted while closed, as a panel does during its exit. */
	function Harness({ open }: { open: boolean }) {
		const { refs, floatingStyles, isPositioned } = useFloatingPanel({ placement: 'bottom', open })

		return (
			<>
				<button type="button" ref={refs.setReference}>
					Trigger
				</button>

				<div
					ref={refs.setFloating}
					data-testid="panel"
					data-positioned={String(isPositioned)}
					style={floatingStyles}
				>
					Panel
				</div>
			</>
		)
	}

	it('reports the panel as placed after the reopen', async () => {
		const { rerender } = renderUI(<Harness open />)

		const panel = screen.getByTestId('panel')

		await waitFor(() => expect(panel).toHaveAttribute('data-positioned', 'true'))

		rerender(<Harness open={false} />)

		await waitFor(() => expect(panel).toHaveAttribute('data-positioned', 'false'))

		rerender(<Harness open />)

		await waitFor(() => expect(panel).toHaveAttribute('data-positioned', 'true'))
	})
})
