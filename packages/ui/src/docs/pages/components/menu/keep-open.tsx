import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSeparator,
	MenuShortcut,
	MenuTrigger,
} from 'ui/menu'

export default function KeepOpen() {
	const [zoom, setZoom] = useState(100)

	return (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline">Zoom: {zoom}%</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuItem closeOnAction={false} disabled={zoom >= 200} onAction={() => setZoom(zoom + 10)}>
					<Icon icon={<ZoomIn />} />
					<MenuLabel>Zoom in</MenuLabel>
					<MenuShortcut>⌘+</MenuShortcut>
				</MenuItem>
				<MenuItem closeOnAction={false} disabled={zoom <= 50} onAction={() => setZoom(zoom - 10)}>
					<Icon icon={<ZoomOut />} />
					<MenuLabel>Zoom out</MenuLabel>
					<MenuShortcut>⌘−</MenuShortcut>
				</MenuItem>
				<MenuSeparator />
				<MenuItem onAction={() => setZoom(100)}>
					<Icon icon={<RotateCcw />} />
					<MenuLabel>Reset</MenuLabel>
					<MenuShortcut>⌘0</MenuShortcut>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
