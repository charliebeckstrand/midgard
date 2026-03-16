import { Heading, Subheading } from '../../components/heading'

export const meta = { category: 'Data Display' }

export default function HeadingDemo() {
	return (
		<div className="space-y-4">
			<Heading level={1}>Heading 1</Heading>
			<Heading level={2}>Heading 2</Heading>
			<Heading level={3}>Heading 3</Heading>
			<Heading level={4}>Heading 4</Heading>
			<Heading level={5}>Heading 5</Heading>
			<Heading level={6}>Heading 6</Heading>
			<Subheading>Subheading</Subheading>
		</div>
	)
}
