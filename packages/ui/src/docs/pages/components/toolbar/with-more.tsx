import {
	Italic,
	LetterB,
	Redo,
	Strikethrough,
	TextAlignCenter,
	TextAlignEnd,
	TextAlignStart,
	Underline,
	Undo,
} from 'lucide-react'
import type { ReactElement } from 'react'
import { IconButton } from 'ui/icon-button'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from 'ui/toolbar'

// Bare icon buttons have the height of More and Back, so each page of the row
// has one height. A pressed toggle takes the wash of a held-down bare button.
function Toggle({ label, icon }: { label: string; icon: ReactElement }) {
	return <IconButton icon={icon} aria-label={label} defaultPressed={false} tooltip />
}

function Action({ label, icon }: { label: string; icon: ReactElement }) {
	return <IconButton icon={icon} aria-label={label} tooltip />
}

export default function WithMore() {
	return (
		<div className="max-w-64">
			<Toolbar aria-label="Text formatting" overflow="more">
				<ToolbarGroup aria-label="History">
					<Action label="Undo" icon={<Undo />} />
					<Action label="Redo" icon={<Redo />} />
				</ToolbarGroup>
				<ToolbarSeparator />
				<ToolbarGroup aria-label="Marks">
					<Toggle label="Bold" icon={<LetterB />} />
					<Toggle label="Italic" icon={<Italic />} />
					<Toggle label="Underline" icon={<Underline />} />
					<Toggle label="Strikethrough" icon={<Strikethrough />} />
				</ToolbarGroup>
				<ToolbarSeparator />
				<ToolbarGroup aria-label="Alignment">
					<Action label="Align left" icon={<TextAlignStart />} />
					<Action label="Align center" icon={<TextAlignCenter />} />
					<Action label="Align right" icon={<TextAlignEnd />} />
				</ToolbarGroup>
			</Toolbar>
		</div>
	)
}
