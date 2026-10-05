import { Plus } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'

export default function IconOnly() {
	return (
		<Button aria-label="Add">
			<Icon icon={<Plus />} />
		</Button>
	)
}
