import { useState } from 'react'
import { Button } from 'ui/button'
import {
	Dialog,
	DialogBody,
	DialogDescription,
	DialogHeader,
	type DialogProps,
	DialogTitle,
	DialogTrigger,
} from 'ui/dialog'
import { Text } from 'ui/text'

export default function DialogPlayground(props: DialogProps) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<DialogTrigger open={open} onClick={() => setOpen(true)}>
				<Button variant="outline">What's new</Button>
			</DialogTrigger>
			<Dialog open={open} onOpenChange={setOpen} {...props}>
				<DialogHeader>
					<DialogTitle>What's new in version 2.4</DialogTitle>
					<DialogDescription>Released on March 3.</DialogDescription>
				</DialogHeader>
				<DialogBody>
					<Text>
						Search now finds the text in your attachments. Shared folders show who changed each file
						last, and the dark theme follows the setting of your system.
					</Text>
				</DialogBody>
				{/* With no footer of its own, the dialog shows the standard Close button. */}
			</Dialog>
		</>
	)
}
