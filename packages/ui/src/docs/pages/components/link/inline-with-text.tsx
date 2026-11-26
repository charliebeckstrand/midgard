import { Link } from 'ui/link'
import { Text } from 'ui/text'

export default function InlineWithText() {
	return (
		<Text>
			To style a run of text, see the{' '}
			<Link href="/text" color="blue">
				Text page
			</Link>
			.
		</Text>
	)
}
