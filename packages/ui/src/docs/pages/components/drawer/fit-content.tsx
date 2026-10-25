import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Button } from 'ui/button'
import {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerFooter,
	DrawerPanel,
	DrawerTitle,
	DrawerTrigger,
} from 'ui/drawer'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

type Topic = { title: string; text: string }

const topics: Topic[] = [
	{
		title: 'How do I change my password?',
		text: 'Open Settings, then Security, and select Change password. You get a code by email before the change applies.',
	},
	{
		title: 'Can I share a folder with a guest?',
		text: 'Yes. Open the folder, select Share, and type the email address of the guest. A guest can see the files but cannot change them.',
	},
	{
		title: 'Where do deleted files go?',
		text: 'Deleted files stay in the trash for 30 days. Open the trash to restore a file before that period ends.',
	},
	{
		title: 'How do I export my data?',
		text: 'Open Settings, then Account, and select Export. You get an email with a link to a ZIP file when the export is ready.',
	},
	{
		title: 'Which file types can I preview?',
		text: 'You can preview images, PDF files, video, and most text files. Other files show their name and size.',
	},
	{
		title: 'How do I close my account?',
		text: 'Open Settings, then Account, and select Close account. Your files stay for 30 days in case you change your mind.',
	},
]

export default function FitContent() {
	const [topic, setTopic] = useState<Topic | null>(null)

	// The question that the reader opened last. Back gives the focus to it.
	const [opened, setOpened] = useState<Topic | null>(null)

	const backRef = useRef<HTMLButtonElement>(null)

	const openedRef = useRef<HTMLButtonElement>(null)

	// Each change of topic removes the button that the reader pressed, so it gives
	// the focus to the button that shows next.
	const open = (item: Topic) => {
		flushSync(() => {
			setTopic(item)

			setOpened(item)
		})

		backRef.current?.focus()
	}

	const back = () => {
		flushSync(() => setTopic(null))

		openedRef.current?.focus()
	}

	return (
		<Drawer>
			<DrawerTrigger>
				<Button variant="outline" onClick={() => setTopic(null)}>
					Help
				</Button>
			</DrawerTrigger>
			{/* Open a question and go back. The drawer moves between the two heights. */}
			<DrawerPanel height="fit">
				<DrawerTitle>{topic ? topic.title : 'Help'}</DrawerTitle>
				<DrawerBody>
					{topic ? (
						<Text tone="muted">{topic.text}</Text>
					) : (
						<Stack gap="xs" align="start">
							{topics.map((item) => (
								<Button
									key={item.title}
									ref={item === opened ? openedRef : undefined}
									variant="plain"
									onClick={() => open(item)}
								>
									{item.title}
								</Button>
							))}
						</Stack>
					)}
				</DrawerBody>
				<DrawerFooter>
					{topic && (
						<Button ref={backRef} variant="plain" onClick={back}>
							Back
						</Button>
					)}
					<DrawerClose />
				</DrawerFooter>
			</DrawerPanel>
		</Drawer>
	)
}
