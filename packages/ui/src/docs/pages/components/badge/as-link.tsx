import { ArrowRight } from 'lucide-react'
import { Badge } from 'ui/badge'
import { Icon } from 'ui/icon'

// With `href`, the badge renders an anchor with a focus ring and a hover wash.
export default function AsLink() {
	return (
		<Badge href="/status" color="blue" suffix={<Icon icon={<ArrowRight />} />}>
			Status
		</Badge>
	)
}
