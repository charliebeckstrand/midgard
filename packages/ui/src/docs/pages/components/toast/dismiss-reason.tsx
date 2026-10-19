import { useState } from 'react'
import { Button } from 'ui/button'
import { Text } from 'ui/text'
import { type ToastDismissReason, useToast } from 'ui/toast'

const reasons: Record<ToastDismissReason, string> = {
	timeout: 'Timeout',
	close: 'Close',
	evicted: 'Evicted',
	dismissed: 'Dismissed',
}

export default function DismissReason() {
	const { toast } = useToast()

	const [reason, setReason] = useState<ToastDismissReason | null>(null)

	return (
		<>
			<Button
				onClick={() =>
					toast({
						title: 'Report exported',
						description: 'Close it, or let it time out.',
						onDismiss: setReason,
					})
				}
			>
				Show toast
			</Button>
			<Text>Last close reason: {reason ? reasons[reason] : 'None'}</Text>
		</>
	)
}
