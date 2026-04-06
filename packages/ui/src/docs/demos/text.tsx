import { Text } from '../../components/text'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

export default function TextDemo() {
	return (
		<Example
			code={`import { Text } from 'ui/text'

<Text>Default paragraph text.</Text>
<Text variant="muted">Muted secondary text.</Text>`}
		>
			<div className="space-y-4">
				<Text>
					This is a paragraph of text using the default variant with proper line height and color.
				</Text>
				<Text variant="muted">
					This is muted text, useful for descriptions and secondary content.
				</Text>
			</div>
		</Example>
	)
}
