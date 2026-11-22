import { Button } from 'ui/button'
import { useToast } from 'ui/toast'

export default function WithId() {
	const { toast } = useToast()

	return (
		<Button
			onClick={() =>
				toast({
					id: 'link-copied',
					title: 'Link copied',
					severity: 'success',
				})
			}
		>
			Copy link
		</Button>
	)
}
