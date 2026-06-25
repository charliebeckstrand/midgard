import { Example } from 'docs'
import { Button } from '../../components/button'
import { Card } from '../../components/card'
import { Heading } from '../../components/heading'
import { Spacer } from '../../components/spacer'
import { Stack } from '../../components/stack'

export function Demo() {
	return (
		<>
			<Example title="Justify">
				<Card p="md" bg="none">
					<Stack direction="row" align="center" className="w-full">
						<Heading level={3}>Title</Heading>
						<Spacer />
						<Button>Action</Button>
					</Stack>
				</Card>
			</Example>

			<Example title="Between groups">
				<Card p="md" bg="none">
					<Stack direction="row" gap="md" align="center" className="w-full">
						<Button variant="plain">Back</Button>
						<Spacer />
						<Button variant="plain">Cancel</Button>
						<Button>Save</Button>
					</Stack>
				</Card>
			</Example>
		</>
	)
}
