import { Button } from 'ui/button'
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogTitle,
	DialogTrigger,
} from 'ui/dialog'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

const sections = [
	{
		heading: 'Your account',
		text: 'You are responsible for the activity on your account. Keep your password private, and tell us at once if someone uses your account without your permission.',
	},
	{
		heading: 'Your content',
		text: 'You own the files that you upload. You give us permission to store them, copy them for backups, and show them to the people that you share them with.',
	},
	{
		heading: 'Acceptable use',
		text: 'Do not use the service to send spam, to break the law, or to attack other systems. We can remove content that breaks these rules.',
	},
	{
		heading: 'Payment',
		text: 'A paid plan renews each month until you cancel it. We charge the card on your account on the first day of each period.',
	},
	{
		heading: 'Cancellation',
		text: 'You can cancel your plan at any time from the billing page. Your files stay available until the end of the period that you paid for.',
	},
	{
		heading: 'Privacy',
		text: 'Our privacy policy tells you what data we collect and why. We do not sell your data to other companies.',
	},
	{
		heading: 'Changes to these terms',
		text: 'We tell you by email 30 days before a change to these terms. If you use the service after that date, you accept the new terms.',
	},
	{
		heading: 'Contact',
		text: 'Send your questions about these terms to legal@example.com. We answer within five business days.',
	},
]

export default function LongContent() {
	return (
		<Dialog>
			<DialogTrigger>
				<Button variant="outline">Read the terms</Button>
			</DialogTrigger>
			<DialogPanel>
				<DialogHeader>
					<DialogTitle>Terms of service</DialogTitle>
					<DialogDescription>Updated on March 3.</DialogDescription>
				</DialogHeader>
				<DialogBody>
					<Stack gap="lg">
						{sections.map((section) => (
							<Stack key={section.heading} gap="xs">
								<Heading level={3}>{section.heading}</Heading>
								<Text>{section.text}</Text>
							</Stack>
						))}
					</Stack>
				</DialogBody>
				<DialogFooter>
					<DialogClose>
						<Button type="button" variant="plain">
							Decline
						</Button>
					</DialogClose>
					<DialogClose>
						<Button type="button">Accept</Button>
					</DialogClose>
				</DialogFooter>
			</DialogPanel>
		</Dialog>
	)
}
