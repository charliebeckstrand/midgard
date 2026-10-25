import { useState } from 'react'
import { afterAll, describe, expect, it } from 'vitest'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { tooltipBody } from '../../../components/tooltip/tooltip-body-loader'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'
import { tooltipLoad } from '../../mocks/tooltip-body-loader'

/**
 * A prop that closes the tooltip often changes its content in the same render,
 * as a copy button does: `open` holds "Copied", and the release shows the hint
 * again. The exit must keep the content of the last open render, so the
 * closing panel does not show the hint.
 *
 * A tooltip that mounts before the state module loads shares the state that a
 * host gives one render after the props. The open state must still close in
 * the render of the props, as it does for a tooltip that mounts after the load.
 *
 * The real engine and real Motion are necessary. The instant Motion mock
 * removes the panel in the commit that closes it, so no exit occurs.
 */
function CopyHint() {
	const [copied, setCopied] = useState(false)

	const [disabled, setDisabled] = useState(false)

	return (
		<>
			<button type="button" onClick={() => setCopied(true)}>
				Copy
			</button>
			<button type="button" onClick={() => setCopied(false)}>
				Release
			</button>
			<button
				type="button"
				onClick={() => {
					setCopied(false)

					setDisabled(true)
				}}
			>
				Disable
			</button>
			<Tooltip open={copied} disabled={disabled}>
				<TooltipTrigger>
					<button type="button">Code</button>
				</TooltipTrigger>
				<TooltipContent>{copied ? 'Copied' : 'Copy the code'}</TooltipContent>
			</Tooltip>
		</>
	)
}

afterAll(async () => {
	tooltipLoad.release()

	await tooltipBody.load()
})

describe.each([
	{ mount: 'before the load', held: true },
	{ mount: 'after the load', held: false },
])(
	'the exit of a Tooltip that mounts $mount and that a prop closes (real engine, real Motion)',
	({ held }) => {
		it.each(['Release', 'Disable'])('keeps the last open content (%s)', async (close) => {
			if (held) tooltipLoad.hold()

			renderUI(<CopyHint />)

			tooltipLoad.release()

			await tooltipBody.load()

			fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

			const tooltip = await screen.findByRole('tooltip')

			await waitFor(() => expect(tooltip).toHaveTextContent('Copied'))

			// `fireEvent` commits in this task, so the checks run inside the exit.
			fireEvent.click(screen.getByRole('button', { name: close }))

			expect(tooltip).toBeInTheDocument()

			expect(tooltip).not.toHaveAttribute('data-open')

			expect(tooltip).toHaveTextContent('Copied')

			await waitFor(() => expect(tooltip).not.toBeInTheDocument())
		})
	},
)
