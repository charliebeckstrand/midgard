import { Button } from 'ui/button'
import { useToast } from 'ui/toast'

export default function WithAction() {
	const { toast, dismiss } = useToast()

	function deleteMessage() {
		function undo() {
			dismiss(id)

			toast({ title: 'Message restored', severity: 'success' })
		}

		const id = toast({
			title: 'Message deleted',
			description: 'The message is in the trash.',
			duration: 10000,
			actions: <Button onClick={undo}>Undo</Button>,
		})
	}

	return <Button onClick={deleteMessage}>Delete message</Button>
}
