import { Heading, Subheading } from '../../components/heading'

export const meta = { category: 'Data Display' }

export default function HeadingDemo() {
	return (
		<div className="space-y-4">
			<Heading>Heading</Heading>
			<Subheading>Subheading</Subheading>
			<Heading level={1}>Level 1</Heading>
			<Heading level={2}>Level 2</Heading>
			<Heading level={3}>Level 3</Heading>
		</div>
	)
}
