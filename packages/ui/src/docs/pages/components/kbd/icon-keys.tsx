import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import { Icon } from 'ui/icon'
import { Kbd } from 'ui/kbd'
import { Text } from 'ui/text'

export default function IconKeys() {
	return (
		<Text>
			Move with{' '}
			<Kbd>
				<Icon icon={<ArrowUp />} />
			</Kbd>{' '}
			<Kbd>
				<Icon icon={<ArrowDown />} />
			</Kbd>{' '}
			<Kbd>
				<Icon icon={<ArrowLeft />} />
			</Kbd>{' '}
			<Kbd>
				<Icon icon={<ArrowRight />} />
			</Kbd>
			, and press <Kbd>Esc</Kbd> to close.
		</Text>
	)
}
