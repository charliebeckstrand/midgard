import { Code, Strong, Text, TextLink } from '../../components/text'

export const meta = { category: 'Data Display' }

export default function TextDemo() {
	return (
		<div className="space-y-4">
			<Text>
				This is a paragraph of text. It uses the default text styles with proper line height and
				color.
			</Text>
			<Text>
				Text can contain <Strong>strong emphasis</Strong>, <Code>inline code</Code>, and{' '}
				<TextLink href="#text">links</TextLink>.
			</Text>
		</div>
	)
}
