import { Copy, Download, Maximize2, Pencil, Share2 } from 'lucide-react'
import { ContextMenu, type ContextMenuItem, type ContextMenuProps } from 'ui/context-menu'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'

// The built-in items of the host, such as a chart or an image viewer.
const defaults: ContextMenuItem[] = [
	{ key: 'fullscreen', label: 'Fullscreen', icon: <Maximize2 /> },
	{ key: 'download', label: 'Download', icon: <Download /> },
	{ key: 'copy', label: 'Copy', icon: <Copy /> },
]

// The custom items of the app.
const items: ContextMenuItem[] = [
	{ key: 'edit', label: 'Edit', icon: <Pencil /> },
	{ key: 'share', label: 'Share', icon: <Share2 /> },
]

export default function ContextMenuPlayground(props: ContextMenuProps) {
	return (
		<ContextMenu aria-label="Image actions" defaults={defaults} items={items} {...props}>
			<div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 px-10 py-8 dark:border-zinc-700">
				<Text tone="muted" className="select-none">
					<PointerHint mouse="Right-click here" touch="Press and hold here" />
				</Text>
			</div>
		</ContextMenu>
	)
}
