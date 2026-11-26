import { Check, Clock, X } from 'lucide-react'
import { Badge } from 'ui/badge'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'

export default function WithIcon() {
	return (
		<Flex gap="sm" wrap>
			<Badge color="green" prefix={<Icon icon={<Check />} />}>
				Verified
			</Badge>
			<Badge color="amber" prefix={<Icon icon={<Clock />} />}>
				Pending
			</Badge>
			<Badge variant="outline" suffix={<Icon icon={<X />} />}>
				Declined
			</Badge>
		</Flex>
	)
}
