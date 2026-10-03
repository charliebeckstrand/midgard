import { Link } from '../../../components/link'
import { Text } from '../../../components/text'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes
				of="Link"
				captions={false}
				render={(props, label) => (
					<Link {...props} href="/link">
						{label}
					</Link>
				)}
			/>

			<Example title="Inline with text">
				<Text>
					For more information, see the{' '}
					<Link href="/link" color="blue">
						getting started guide
					</Link>
					.
				</Text>
			</Example>

			<Example title="External">
				<Link href="https://example.com" target="_blank" rel="noreferrer">
					example.com
				</Link>
			</Example>
		</>
	)
}
