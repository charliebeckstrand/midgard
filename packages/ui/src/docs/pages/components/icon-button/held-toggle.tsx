import { Bold, Italic, Underline } from 'lucide-react'
import { Flex } from 'ui/flex'
import { IconButton } from 'ui/icon-button'

export default function HeldToggle() {
	return (
		<Flex gap="xs">
			<IconButton icon={<Bold />} aria-label="Bold" variant="plain" defaultPressed tooltip />
			<IconButton
				icon={<Italic />}
				aria-label="Italic"
				variant="plain"
				defaultPressed={false}
				tooltip
			/>
			<IconButton icon={<Underline />} aria-label="Underline" defaultPressed={false} tooltip />
		</Flex>
	)
}
