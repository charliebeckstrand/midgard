import { Copy, Download, Maximize2 } from 'lucide-react'
import { ContextMenu, type ContextMenuItem } from 'ui/context-menu'
import { GlassProvider } from 'ui/providers/glass'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'

const items: ContextMenuItem[] = [
	{ key: 'fullscreen', label: 'Fullscreen', icon: <Maximize2 /> },
	{ key: 'download', label: 'Download', icon: <Download /> },
	{ key: 'copy', label: 'Copy', icon: <Copy /> },
]

export default function Glass() {
	return (
		<GlassProvider>
			<ContextMenu aria-label="Image actions" items={items}>
				<div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 px-10 py-8 dark:border-zinc-700">
					<Text tone="muted" className="select-none">
						<PointerHint mouse="Right-click here" touch="Press and hold here" />
					</Text>
				</div>
			</ContextMenu>
		</GlassProvider>
	)
}
