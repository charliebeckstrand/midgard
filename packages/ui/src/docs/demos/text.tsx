import { Text } from '../../components/text'

export const meta = { category: 'Data Display' }

export default function TextDemo() {
	return (
		<div className="space-y-4">
			<Text>
				This is a paragraph of text using the default variant with proper line height and color.
			</Text>
			<Text variant="muted">
				This is muted text, useful for descriptions and secondary content.
			</Text>
		</div>
	)
}
