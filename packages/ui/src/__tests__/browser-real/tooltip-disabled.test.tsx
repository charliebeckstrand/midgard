import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { bySlot, renderUI, screen, waitFor } from '../helpers'

/**
 * Tooltip `:disabled` gating against the real floating engine. The jsdom and
 * main browser suites mock `@floating-ui/react` to a null reference, so the
 * gate, which reads the live reference node, runs only here. A disabled
 * trigger (its own `disabled` or an ancestor `<fieldset disabled>`) must not
 * surface its tooltip, matching the PasswordInput visibility toggle inside a
 * submitting auth form.
 */

describe('Tooltip disabled gating (real browser)', () => {
	it('shows the tooltip on hover when the trigger is enabled', async () => {
		const { container } = renderUI(
			<Tooltip delay={0}>
				<TooltipTrigger>
					<button type="button">Toggle</button>
				</TooltipTrigger>
				<TooltipContent>Show password</TooltipContent>
			</Tooltip>,
		)

		await userEvent.hover(bySlot(container, 'tooltip-trigger') as HTMLElement)

		await waitFor(() => expect(screen.getByText('Show password')).toBeInTheDocument())
	})

	it('suppresses the tooltip on hover while an ancestor fieldset is disabled', async () => {
		const { container } = renderUI(
			<>
				<fieldset disabled>
					<Tooltip delay={0}>
						<TooltipTrigger>
							<button type="button">Toggle</button>
						</TooltipTrigger>
						<TooltipContent>Show password</TooltipContent>
					</Tooltip>
				</fieldset>
				<Tooltip delay={0}>
					<TooltipTrigger>
						<button type="button" data-slot="sentinel">
							Sentinel
						</button>
					</TooltipTrigger>
					<TooltipContent>Sentinel tip</TooltipContent>
				</Tooltip>
			</>,
		)

		// The hover stays on the disabled trigger; the gate must veto its open.
		await userEvent.hover(bySlot(container, 'tooltip-trigger') as HTMLElement)

		// Focus (not hover) the enabled sentinel so the pointer never leaves the
		// disabled trigger. Awaiting the sentinel's focus tooltip is a deterministic
		// checkpoint that the open delay has elapsed: a failed gate would have
		// surfaced 'Show password' by now, with no pointer-leave to close it.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(screen.getByText('Sentinel tip')).toBeInTheDocument())

		expect(screen.queryByText('Show password')).not.toBeInTheDocument()
	})

	it('closes an open tooltip when an ancestor fieldset disables its trigger', async () => {
		function Harness({ disabled }: { disabled: boolean }) {
			return (
				<fieldset disabled={disabled}>
					<Tooltip delay={0}>
						<TooltipTrigger>
							<button type="button">Toggle</button>
						</TooltipTrigger>
						<TooltipContent>Show password</TooltipContent>
					</Tooltip>
				</fieldset>
			)
		}

		const { container, rerender } = renderUI(<Harness disabled={false} />)

		await userEvent.hover(bySlot(container, 'tooltip-trigger') as HTMLElement)

		await waitFor(() => expect(screen.getByText('Show password')).toBeInTheDocument())

		rerender(<Harness disabled />)

		await waitFor(() => expect(screen.queryByText('Show password')).not.toBeInTheDocument())
	})
})
