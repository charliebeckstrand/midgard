import { Button } from 'ui/button'
import {
	Dialog,
	DialogBody,
	DialogDescription,
	DialogHeader,
	DialogPanel,
	type DialogPanelProps,
	DialogTitle,
	DialogTrigger,
} from 'ui/dialog'
import { Text } from 'ui/text'

export default function DialogPlayground(props: DialogPanelProps) {
	return (
		<Dialog>
			<DialogTrigger>
				<Button variant="outline">What's new</Button>
			</DialogTrigger>
			<DialogPanel {...props}>
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
			</DialogPanel>
		</Dialog>
	)
}
