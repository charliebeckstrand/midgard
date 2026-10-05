import { ClipboardPaste, Copy, Scissors, Trash } from 'lucide-react'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuShortcut } from 'ui/menu'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'

// A menu with no `placement` opens at the pointer on a right click in its content.
export default function RightClick() {
	return (
		<Menu>
			<div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 px-10 py-8 dark:border-zinc-700">
				<Text tone="muted" className="select-none">
					<PointerHint mouse="Right-click here" touch="Press and hold here" />
				</Text>
			</div>
			<MenuContent aria-label="Edit">
				<MenuItem>
					<Icon icon={<Scissors />} />
					<MenuLabel>Cut</MenuLabel>
					<MenuShortcut>⌘X</MenuShortcut>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Copy />} />
					<MenuLabel>Copy</MenuLabel>
					<MenuShortcut>⌘C</MenuShortcut>
				</MenuItem>
				<MenuItem>
					<Icon icon={<ClipboardPaste />} />
					<MenuLabel>Paste</MenuLabel>
					<MenuShortcut>⌘V</MenuShortcut>
				</MenuItem>
				<MenuSeparator />
				<MenuItem>
					<Icon icon={<Trash />} />
					<MenuLabel>Delete</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)
}
