import { File, Folder } from 'lucide-react'
import { useState } from 'react'
import { Stack } from 'ui/stack'
import { StatusDot } from 'ui/status'
import { Text } from 'ui/text'
import { Tree, TreeItem } from 'ui/tree'

const pages = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'install', label: 'Install' },
	{ id: 'upgrade', label: 'Upgrade guide', updated: true },
]

// `prefix` holds a status dot. It holds no control, because the row is one
// control. `current` marks the page that the reader has open, and `onAction`
// opens a page.
export default function RichContent() {
	const [open, setOpen] = useState('install')

	return (
		<Stack gap="md">
			<Tree aria-label="Guides">
				<TreeItem label="Getting started" icon={<Folder />} defaultOpen>
					{pages.map((page) => (
						<TreeItem
							key={page.id}
							label={page.label}
							icon={<File />}
							prefix={page.updated ? <StatusDot status="info" /> : undefined}
							current={page.id === open}
							onAction={() => setOpen(page.id)}
						/>
					))}
				</TreeItem>
			</Tree>
			<Text>Open: {pages.find((page) => page.id === open)?.label}</Text>
		</Stack>
	)
}
