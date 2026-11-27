import { ChevronRight } from 'lucide-react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'

// The same button in a left-to-right and a right-to-left layout. The mirrored
// chevron points along the line in each direction.
export default function Mirror() {
	return (
		<Flex gap="lg" align="center">
			<div dir="ltr">
				<Button variant="plain" suffix={<Icon icon={<ChevronRight />} mirror />}>
					Next
				</Button>
			</div>
			<div dir="rtl">
				<Button variant="plain" suffix={<Icon icon={<ChevronRight />} mirror />}>
					Next
				</Button>
			</div>
		</Flex>
	)
}
