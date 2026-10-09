import { useState } from 'react'
import { Button } from 'ui/button'
import { useHasHover, useTimeout } from 'ui/hooks'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

export default function HeldOpen() {
	const [copied, setCopied] = useState(false)

	const timeout = useTimeout()

	// A touch screen gives no hover, so the demo opens on a tap there.
	const trigger = useHasHover() ? 'hover' : 'click'

	return (
		<Tooltip open={copied} trigger={trigger}>
			<TooltipTrigger>
				<Button
					variant="outline"
					onClick={() => {
						navigator.clipboard.writeText('SUMMER-2026').then(() => {
							setCopied(true)

							// The `open` prop holds the tooltip open for 1.5 seconds after the first copy. Then
							// hover and focus control it again.
							if (!timeout.pending()) timeout.set(() => setCopied(false), 1500)
						})
					}}
				>
					Copy invite code
				</Button>
			</TooltipTrigger>
			<TooltipContent>{copied ? 'Copied' : 'Copy the code to the clipboard.'}</TooltipContent>
		</Tooltip>
	)
}
