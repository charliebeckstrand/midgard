import { Copy, Download, Maximize2, Pencil, Share2 } from 'lucide-react'
import { ContextMenu, type ContextMenuItem } from '../../../components/context-menu'
import { Text } from '../../../components/text'
import { Box } from '../../../structure/box'
import { Axes } from '../../engine'

const defaults: ContextMenuItem[] = [
	{ key: 'fullscreen', label: 'Fullscreen', icon: <Maximize2 /> },
	{ key: 'download', label: 'Download', icon: <Download /> },
	{ key: 'copy', label: 'Copy', icon: <Copy /> },
]

const custom: ContextMenuItem[] = [
	{ key: 'edit', label: 'Edit', icon: <Pencil /> },
	{ key: 'share', label: 'Share', icon: <Share2 /> },
]

function surface(text: string) {
	return (
		<Box className="flex items-center justify-center rounded-lg border border-zinc-300 border-dashed px-10 py-8 dark:border-zinc-700">
			<Text tone="muted" className="select-none">
				{text}
			</Text>
		</Box>
	)
}

export default function Demo() {
	return (
		<>
			{/* A short menu shows no effect of `capped`, so the axis is left out. */}
			<Axes
				of="ContextMenu"
				captions={false}
				omit={['capped']}
				render={(props, label) => (
					<ContextMenu {...props} defaults={defaults} items={custom}>
						{surface(label)}
					</ContextMenu>
				)}
			/>
		</>
	)
}
