import { Copy, Download, Maximize2, Pencil, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Box } from '../../../components/box'
import { ContextMenu, type ContextMenuItem } from '../../../components/context-menu'
import { Stack } from '../../../components/stack'
import { Text } from '../../../components/text'
import { Example } from '../../engine'

export function Demo() {
	const [last, setLast] = useState<string | null>(null)

	const act = (name: string) => () => setLast(name)

	const defaults: ContextMenuItem[] = [
		{ key: 'fullscreen', label: 'Fullscreen', icon: <Maximize2 />, onSelect: act('Fullscreen') },
		{ key: 'download', label: 'Download', icon: <Download />, onSelect: act('Download') },
		{ key: 'copy', label: 'Copy', icon: <Copy />, onSelect: act('Copy') },
	]

	const custom: ContextMenuItem[] = [
		{ key: 'edit', label: 'Edit', icon: <Pencil />, onSelect: act('Edit') },
		{ key: 'share', label: 'Share', icon: <Share2 />, onSelect: act('Share') },
	]

	const surface = (
		<Box className="flex items-center justify-center rounded-lg border border-zinc-300 border-dashed p-20 dark:border-zinc-700">
			<Text severity="muted" className="select-none">
				Right-click here
			</Text>
		</Box>
	)

	return (
		<Stack gap="xl">
			<Text severity="muted">Last action: {last ?? '—'}</Text>

			<Example title="Defaults">
				<ContextMenu defaults={defaults}>{surface}</ContextMenu>
			</Example>

			<Example title="Custom items after the defaults">
				<ContextMenu defaults={defaults} items={custom}>
					{surface}
				</ContextMenu>
			</Example>

			<Example title="Custom items before the defaults">
				<ContextMenu defaults={defaults} items={custom} position="before">
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
