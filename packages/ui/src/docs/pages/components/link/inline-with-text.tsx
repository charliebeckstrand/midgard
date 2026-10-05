import { Link } from 'ui/link'
import { Text } from 'ui/text'

export default function InlineWithText() {
	return (
		<Text>
			For more information, see the{' '}
			<Link href="/link" color="blue">
				getting started guide
			</Link>
			.
		</Text>
	)
}
