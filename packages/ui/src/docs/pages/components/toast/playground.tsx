import { Button } from 'ui/button'
import { Toast, type ToastProps, ToastProvider, useToast } from 'ui/toast'

function ShowToast() {
	const { toast } = useToast()

	return (
		<Button
			onClick={() => toast({ title: 'Event created', description: 'Friday, March 6 at 9:00 AM' })}
		>
			Show toast
		</Button>
	)
}

export default function ToastPlayground(props: ToastProps) {
	return (
		<ToastProvider>
			<ShowToast />
			<Toast {...props} />
		</ToastProvider>
	)
}
