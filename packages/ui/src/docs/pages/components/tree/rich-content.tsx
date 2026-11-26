import { File, Folder } from 'lucide-react'
import { useState } from 'react'
import { Stack } from 'ui/stack'
import { StatusDot } from 'ui/status'
import { Text } from 'ui/text'
import { Tree, TreeItem } from 'ui/tree'

const pages = ['Overview', 'Install', 'Upgrade guide']

// `prefix` holds a status dot. It holds no control, because the row is one
// control. `current` marks the page that
// the reader has open, and `onAction` opens a page.
export default function RichContent() {
	const [open, setOpen] = useState('Install')

	return (
		<Stack gap="md">
			<Tree aria-label="Guides">
				<TreeItem label="Getting started" icon={<Folder />} defaultOpen>
					{pages.map((page) => (
						<TreeItem
							key={page}
							label={page}
							icon={<File />}
							prefix={page === 'Upgrade guide' ? <StatusDot status="info" /> : undefined}
							current={page === open}
							onAction={() => setOpen(page)}
						/>
					))}
				</TreeItem>
			</Tree>
			<Text>Open: {open}</Text>
		</Stack>
	)
}
