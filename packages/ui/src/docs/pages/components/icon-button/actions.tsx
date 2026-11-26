import { Pencil, Share2, Trash } from 'lucide-react'
import { Flex } from 'ui/flex'
import { IconButton } from 'ui/icon-button'

export default function Actions() {
	return (
		<Flex gap="sm">
			<IconButton icon={<Pencil />} aria-label="Edit" tooltip />
			<IconButton icon={<Share2 />} aria-label="Share" tooltip />
			<IconButton icon={<Trash />} aria-label="Delete" color="red" tooltip />
		</Flex>
	)
}
