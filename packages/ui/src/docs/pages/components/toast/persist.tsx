import { Button } from 'ui/button'
import { useToast } from 'ui/toast'

export default function Persist() {
	const { toast } = useToast()

	return (
		<Button
			onClick={() =>
				toast({
					title: 'Connection lost',
					description: 'Your changes save when the connection returns.',
					severity: 'warning',
					persist: true,
				})
			}
		>
			Show toast
		</Button>
	)
}
