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
			{/* biome-ignore lint/a11y/useSemanticElements: a fieldset is a form part, and the box holds no field. */}
			<div
				role="group"
				aria-label="Image"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: the box holds no control, so a keyboard opens the menu from the box.
				tabIndex={0}
				className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 px-10 py-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-zinc-700 dark:focus-visible:outline-blue-500"
			>
				<Text tone="muted" className="select-none">
					<PointerHint mouseText="Right-click here" touchText="Press and hold here" />
				</Text>
			</div>
		</ContextMenu>
	)
}
