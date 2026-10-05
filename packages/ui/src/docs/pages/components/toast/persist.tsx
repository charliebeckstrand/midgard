import { Button } from 'ui/button'
import { Toast, ToastProvider, useToast } from 'ui/toast'

function ShowToast() {
	const { toast } = useToast()

	return (
		<Button
			onClick={() =>
				toast({
					title: 'Connection lost',
					description: 'This toast stays until you close it.',
					severity: 'warning',
					persist: true,
				})
			}
		>
			Show toast
		</Button>
	)
}

export default function Persist() {
	return (
		<ToastProvider>
			<ShowToast />
			<Toast />
		</ToastProvider>
	)
}
