import { useState } from 'react'
import { Button } from 'ui/button'
import { Toast, ToastProvider, useToast } from 'ui/toast'

function ShowToast() {
	const { toast } = useToast()

	const [count, setCount] = useState(0)

	function show() {
		const next = count + 1

		setCount(next)

		toast({ title: `Notification ${next}`, description: 'Only the three newest toasts stay.' })
	}

	return <Button onClick={show}>Show toast</Button>
}

export default function MaxToasts() {
	return (
		<ToastProvider maxToasts={3}>
			<ShowToast />
			<Toast />
		</ToastProvider>
	)
}
