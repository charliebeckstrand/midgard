import { Button } from 'ui/button'
import {
	Sheet,
	SheetBody,
	SheetDescription,
	SheetHeader,
	SheetPanel,
	type SheetPanelProps,
	SheetTitle,
	SheetTrigger,
} from 'ui/sheet'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

const activity = [
	'Mia Chen uploaded brand-guide.pdf.',
	'Tom Cook renamed the folder Drafts to Archive.',
	'Ravi Shah shared the project with the design team.',
]

export default function SheetPlayground(props: SheetPanelProps) {
	return (
		<Sheet>
			<SheetTrigger>
				<Button variant="outline">Show activity</Button>
			</SheetTrigger>
			<SheetPanel {...props}>
				<SheetHeader>
					<SheetTitle>Activity</SheetTitle>
					<SheetDescription>The last changes in this project</SheetDescription>
				</SheetHeader>
				<SheetBody>
					<Stack gap="sm">
						{activity.map((line) => (
							<Text key={line} tone="muted">
								{line}
							</Text>
						))}
					</Stack>
				</SheetBody>
				{/* With no footer of its own, the sheet shows the standard Close button. */}
			</SheetPanel>
		</Sheet>
	)
}
