import { useState } from 'react'
import { Button } from 'ui/button'
import {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerFooter,
	DrawerTitle,
	DrawerTrigger,
} from 'ui/drawer'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

type Topic = { question: string; answer: string }

const topics: Topic[] = [
	{
		question: 'How do I change my password?',
		answer:
			'Open Settings, then Security, and select Change password. We send a code to your email address before the change applies.',
	},
	{
		question: 'Can I share a folder with a guest?',
		answer:
			'Yes. Open the folder, select Share, and type the email address of the guest. A guest can see the files but cannot change them.',
	},
	{
		question: 'Where do deleted files go?',
		answer:
			'Deleted files stay in the trash for 30 days. Open the trash to restore a file before that period ends.',
	},
	{
		question: 'How do I export my data?',
		answer:
			'Open Settings, then Account, and select Export. We send you a link to a ZIP file when the export is ready.',
	},
	{
		question: 'Which file types can I preview?',
		answer:
			'You can preview images, PDF files, video, and most text files. Other files show their name and size.',
	},
	{
		question: 'How do I close my account?',
		answer:
			'Open Settings, then Account, and select Close account. We keep your files for 30 days in case you change your mind.',
	},
]

export default function FitContent() {
	const [open, setOpen] = useState(false)

	const [topic, setTopic] = useState<Topic | null>(null)

	return (
		<>
			<DrawerTrigger
				open={open}
				onClick={() => {
					setTopic(null)
					setOpen(true)
				}}
			>
				<Button variant="outline">Help</Button>
			</DrawerTrigger>
			{/* Open a question and go back. The drawer moves between the two heights. */}
			<Drawer height="fit" open={open} onOpenChange={setOpen}>
				<DrawerTitle>{topic ? topic.question : 'Help'}</DrawerTitle>
				<DrawerBody>
					{topic ? (
						<Text>{topic.answer}</Text>
					) : (
						<Stack gap="xs" align="start">
							{topics.map((item) => (
								<Button key={item.question} variant="plain" onClick={() => setTopic(item)}>
									{item.question}
								</Button>
							))}
						</Stack>
					)}
				</DrawerBody>
				<DrawerFooter>
					{topic && (
						<Button variant="plain" onClick={() => setTopic(null)}>
							Back
						</Button>
					)}
					<DrawerClose />
				</DrawerFooter>
			</Drawer>
		</>
	)
}
