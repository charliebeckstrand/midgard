import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export default function TextDemo() {
	return (
		<Example title="Variants">
			<Text>
				This is a paragraph of text using the default variant with proper line height and color.
			</Text>
			<Text variant="muted">
				This is muted text, useful for descriptions and secondary content.
			</Text>
		</Example>
	)
}
