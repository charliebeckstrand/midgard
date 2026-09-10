import { Activity, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Dialog } from '../../../components/dialog'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * An open overlay survives being parked in `<Activity mode="hidden">` and revealed.
 *
 * Here rather than in either jsdom project because both of those mock
 * `@floating-ui/react`, and the mock renders `FloatingPortal` inline — so the thing under
 * test, the lifecycle of floating-ui's own portal node, does not exist there. Against the
 * real engine that node is built in a layout effect and removed in its cleanup, and
 * `<Activity>` runs cleanups to hide a subtree and re-runs the effects to reveal it. Left
 * alone, the reveal built a *new* node, which changed `createPortal`'s container and
 * remounted the whole surface: state gone, scroll offsets gone. `patches/@floating-ui__react`
 * makes the node re-attach instead. See that patch for the reasoning.
 *
 * This is not a hypothetical arrangement. `primitives/mount`'s `Hold` parks an inactive
 * Tabs/Nav panel in exactly this boundary, and Next's App Router parks a navigated-away
 * route in it, which is how an in-app tab keeps a half-finished view alive.
 *
 * The assertion is on the *surface's own* state rather than on node identity, because
 * identity is the mechanism and this is the behaviour it buys: a remount is observable as a
 * `useState` that went back to its initial value.
 */
function Harness({ hidden }: { hidden: boolean }) {
	return (
		<Activity mode={hidden ? 'hidden' : 'visible'}>
			<Dialog open onOpenChange={() => {}} aria-label="Panel">
				<Counter />
			</Dialog>
		</Activity>
	)
}

function Counter() {
	const [count, setCount] = useState(0)

	return (
		<button type="button" onClick={() => setCount((value) => value + 1)}>
			count {count}
		</button>
	)
}

describe('overlay parked in <Activity> (real browser)', () => {
	it('keeps the surface mounted across a hide and reveal', async () => {
		const { rerender } = renderUI(<Harness hidden={false} />)

		const counter = await waitFor(() => screen.getByRole('button', { name: 'count 0' }))

		await userEvent.click(counter)

		await waitFor(() => expect(screen.getByRole('button', { name: 'count 1' })).toBeInTheDocument())

		rerender(<Harness hidden />)

		// Hidden means hidden: the surface is out of reach while parked, which is what makes
		// the reveal below a real question rather than a no-op.
		await waitFor(() => expect(screen.queryByRole('button', { name: 'count 1' })).toBeNull())

		rerender(<Harness hidden={false} />)

		// The count, not merely a button: `count 0` here would mean the surface came back
		// rebuilt, which is the regression this guards.
		await waitFor(() => expect(screen.getByRole('button', { name: 'count 1' })).toBeInTheDocument())
	})
})
