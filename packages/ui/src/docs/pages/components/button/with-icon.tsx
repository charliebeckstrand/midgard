import { Plus } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'

export default function WithIcon() {
	return <Button prefix={<Icon icon={<Plus />} />}>Add</Button>
}
