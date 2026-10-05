import { useEffect, useState } from 'react'
import { Button } from 'ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

export default function HeldOpen() {
	const [copied, setCopied] = useState(false)

	// The `open` prop holds the tooltip open for 1.5 seconds after the copy. Then hover and focus
	// control it again.
	useEffect(() => {
		if (!copied) return

		const timer = setTimeout(() => setCopied(false), 1500)

		return () => clearTimeout(timer)
	}, [copied])

	return (
		<Tooltip open={copied}>
			<TooltipTrigger>
				<Button
					variant="outline"
					onClick={() => {
						navigator.clipboard.writeText('SUMMER-2026').then(() => setCopied(true))
					}}
				>
					Copy invite code
				</Button>
			</TooltipTrigger>
			<TooltipContent>{copied ? 'Copied' : 'Copy the code to the clipboard.'}</TooltipContent>
		</Tooltip>
	)
}
