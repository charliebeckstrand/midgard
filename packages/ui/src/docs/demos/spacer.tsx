import { Button } from '../../components/button'
import { Card } from '../../components/card'
import { Heading } from '../../components/heading'
import { Spacer } from '../../components/spacer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function SpacerDemo() {
	return (
		<Stack gap={6}>
			<Example title="Justify">
				<Card p={3}>
					<Stack direction="row" align="center" className="w-full">
						<Heading level={3}>Title</Heading>
						<Spacer />
						<Button>Action</Button>
					</Stack>
				</Card>
			</Example>

			<Example title="Between groups">
				<Card p={3} bg="none">
					<Stack direction="row" gap={3} align="center" className="w-full">
						<Button variant="plain">Back</Button>
						<Spacer />
						<Button variant="plain">Cancel</Button>
						<Button>Save</Button>
					</Stack>
				</Card>
			</Example>
		</Stack>
	)
}
