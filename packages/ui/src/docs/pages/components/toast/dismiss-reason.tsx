import { useState } from 'react'
import { Button } from 'ui/button'
import { Text } from 'ui/text'
import { Toast, type ToastDismissReason, ToastProvider, useToast } from 'ui/toast'

function ShowToast({ onDismiss }: { onDismiss: (reason: ToastDismissReason) => void }) {
	const { toast } = useToast()

	return (
		<Button
			onClick={() =>
				toast({ title: 'Report exported', description: 'Close it, or let it time out.', onDismiss })
			}
		>
			Show toast
		</Button>
	)
}

export default function DismissReason() {
	const [reason, setReason] = useState<ToastDismissReason | null>(null)

	return (
		<ToastProvider>
			<ShowToast onDismiss={setReason} />
			<Text>Reason: {reason ?? 'None'}</Text>
			<Toast />
		</ToastProvider>
	)
}
