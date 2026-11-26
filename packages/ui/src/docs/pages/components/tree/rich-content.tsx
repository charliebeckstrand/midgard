import { File, Folder } from 'lucide-react'
import { useState } from 'react'
import { Badge } from 'ui/badge'
import { Stack } from 'ui/stack'
import { StatusDot } from 'ui/status'
import { Text } from 'ui/text'
import { Tree, TreeItem } from 'ui/tree'

const pages = ['Overview', 'Install', 'Upgrade guide']

// `prefix` holds a status dot, and `suffix` holds a count. Neither holds a
// control, because the row is one control. `current` marks the page that
// the reader has open, and `onAction` opens a page.
export default function RichContent() {
	const [open, setOpen] = useState('Install')

	return (
		<Stack gap="md">
			<Tree aria-label="Guides">
				<TreeItem
					label="Getting started"
					icon={<Folder />}
					suffix={<Badge size="sm">{pages.length}</Badge>}
					defaultOpen
				>
					{pages.map((page) => (
						<TreeItem
							key={page}
							label={page}
							icon={<File />}
							prefix={
								page === 'Upgrade guide' ? (
									<StatusDot status="warning" label="Out of date" />
								) : undefined
							}
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
