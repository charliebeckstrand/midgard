import { Button } from 'ui/button'
import { useToast } from 'ui/toast'

export default function Persist() {
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
