import { Button } from 'ui/button'
import { useToast } from 'ui/toast'

export default function WithId() {
	const { toast } = useToast()

	return (
		<Button
			onClick={() => {
				navigator.clipboard.writeText(location.href).then(() =>
					toast({
						id: 'link-copied',
						title: 'Link copied',
						severity: 'success',
					}),
				)
			}}
		>
			Copy link
		</Button>
	)
}
