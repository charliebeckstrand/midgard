import { useState } from 'react'
import { Button } from 'ui/button'
import {
	Sheet,
	SheetBody,
	SheetDescription,
	SheetHeader,
	type SheetProps,
	SheetTitle,
	SheetTrigger,
} from 'ui/sheet'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

const activity = [
	'Jane Smith uploaded brand-guide.pdf.',
	'Tom Cook renamed the folder Drafts to Archive.',
	'Lisa Wong shared the project with the design team.',
]

export default function SheetPlayground(props: SheetProps) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<SheetTrigger open={open} onClick={() => setOpen(true)}>
				<Button variant="outline">Show activity</Button>
			</SheetTrigger>
			<Sheet open={open} onOpenChange={setOpen} {...props}>
				<SheetHeader>
					<SheetTitle>Activity</SheetTitle>
					<SheetDescription>The last changes in this project.</SheetDescription>
				</SheetHeader>
				<SheetBody>
					<Stack gap="sm">
						{activity.map((line) => (
							<Text key={line}>{line}</Text>
						))}
					</Stack>
				</SheetBody>
				{/* With no footer of its own, the sheet shows the standard Close button. */}
			</Sheet>
		</>
	)
}
