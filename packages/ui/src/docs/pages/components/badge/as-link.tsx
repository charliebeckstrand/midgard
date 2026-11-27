import { Badge } from 'ui/badge'
import { Link } from 'ui/link'

// A badge is a static leaf and does not read the link of the app. Pass
// `render={<Link />}` so that a click goes through the router.
export default function AsLink() {
	return (
		<Badge color="blue" href="/icon-button" render={<Link href="" />}>
			New: IconButton
		</Badge>
	)
}
