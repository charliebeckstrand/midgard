import { Copy, Download, Maximize2, Pencil, Share2 } from 'lucide-react'
import { ContextMenu, type ContextMenuItem } from '../../../components/context-menu'
import { Text } from '../../../components/text'
import { Box } from '../../../structure/box'
import { Stack } from '../../../structure/stack'
import { Example } from '../../engine'

export function Demo() {
	const defaults: ContextMenuItem[] = [
		{ key: 'fullscreen', label: 'Fullscreen', icon: <Maximize2 /> },
		{ key: 'download', label: 'Download', icon: <Download /> },
		{ key: 'copy', label: 'Copy', icon: <Copy /> },
	]

	const custom: ContextMenuItem[] = [
		{ key: 'edit', label: 'Edit', icon: <Pencil /> },
		{ key: 'share', label: 'Share', icon: <Share2 /> },
	]

	const surface = (
		<Box className="flex items-center justify-center rounded-lg border border-zinc-300 border-dashed p-20 dark:border-zinc-700">
			<Text tone="muted" className="select-none">
				Right-click here
			</Text>
		</Box>
	)

	return (
		<Stack gap="xl">
			<Example title="Defaults">
				<ContextMenu defaults={defaults}>{surface}</ContextMenu>
			</Example>

			<Example title="Custom items after the defaults">
				<ContextMenu defaults={defaults} items={custom}>
					{surface}
				</ContextMenu>
			</Example>

			<Example title="Custom items before the defaults">
				<ContextMenu defaults={defaults} items={custom} insert="before">
					{surface}
				</ContextMenu>
			</Example>

			<Example title="Custom items only">
				<ContextMenu defaults={defaults} items={custom} defaultItems={false}>
					{surface}
				</ContextMenu>
			</Example>
		</Stack>
	)
}
