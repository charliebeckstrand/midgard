import { Button } from 'ui/button'
import { Toast, ToastProvider, useToast } from 'ui/toast'

function DeleteMessage() {
	const { toast, dismiss } = useToast()

	function deleteMessage() {
		const id = crypto.randomUUID()

		function undo() {
			dismiss(id)

			toast({ title: 'Message restored', severity: 'success' })
		}

		toast({
			id,
			title: 'Message deleted',
			description: 'The message is in the trash.',
			duration: 10000,
			actions: <Button onClick={undo}>Undo</Button>,
		})
	}

	return <Button onClick={deleteMessage}>Delete message</Button>
}

export default function WithAction() {
	return (
		<ToastProvider>
			<DeleteMessage />
			<Toast />
		</ToastProvider>
	)
}
