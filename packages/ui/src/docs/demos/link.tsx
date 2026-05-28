import { Link } from '../../components/link'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

export function Demo() {
	return (
		<>
			<Example title="Default">
				<Link href="#link">Read the documentation</Link>
			</Example>

			<Example title="Inline with text">
				<Text>
					For more information, see the <Link href="#link">getting started guide</Link>.
				</Text>
			</Example>

			<Example title="External">
				<Link href="https://example.com" target="_blank" rel="noreferrer">
					example.com
				</Link>
			</Example>

			<Example title="Underline">
				<Link href="#link" underline>
					Read the documentation
				</Link>
			</Example>
		</>
	)
}
