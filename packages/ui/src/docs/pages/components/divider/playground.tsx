import { Divider, type DividerProps } from 'ui/divider'
import { Flex } from 'ui/flex'

export default function DividerPlayground(props: DividerProps) {
	return (
		<Flex align="center" className="h-12">
			<Divider {...props} />
		</Flex>
	)
}
