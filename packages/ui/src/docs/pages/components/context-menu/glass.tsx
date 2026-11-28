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
		</GlassProvider>
	)
}
