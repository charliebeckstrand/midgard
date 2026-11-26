import { Pencil, Share2, Trash } from 'lucide-react'
import { IconButton } from 'ui/icon-button'
import { Toolbar } from 'ui/toolbar'

// A row of icon buttons is a Toolbar. It spaces the hit areas, so they do not overlap on a phone.
export default function Actions() {
	return (
		<Toolbar aria-label="Document">
			<IconButton icon={<Pencil />} aria-label="Edit" tooltip />
			<IconButton icon={<Share2 />} aria-label="Share" tooltip />
			<IconButton icon={<Trash />} aria-label="Delete" tooltip />
		</Toolbar>
	)
}
