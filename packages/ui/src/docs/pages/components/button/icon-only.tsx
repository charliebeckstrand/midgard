import { Plus } from 'lucide-react'
import { IconButton } from 'ui/icon-button'

// An icon-only button is an IconButton. It requires an accessible name.
export default function IconOnly() {
	return <IconButton icon={<Plus />} aria-label="Add" variant="solid" />
}
