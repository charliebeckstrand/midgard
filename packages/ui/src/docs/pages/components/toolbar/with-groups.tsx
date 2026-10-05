import {
	Bold,
	Italic,
	Redo,
	Strikethrough,
	TextAlignCenter,
	TextAlignEnd,
	TextAlignStart,
	Underline,
	Undo,
} from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from 'ui/toolbar'

export default function WithGroups() {
	return (
		<Toolbar aria-label="Text formatting">
			<ToolbarGroup aria-label="History">
				<Button variant="plain" aria-label="Undo">
					<Icon icon={<Undo />} />
				</Button>
				<Button variant="plain" aria-label="Redo">
					<Icon icon={<Redo />} />
				</Button>
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="Marks">
				<Button variant="plain" aria-label="Bold" aria-pressed={false}>
					<Icon icon={<Bold />} />
				</Button>
				<Button variant="plain" aria-label="Italic" aria-pressed={false}>
					<Icon icon={<Italic />} />
				</Button>
				<Button variant="plain" aria-label="Underline" aria-pressed={false}>
					<Icon icon={<Underline />} />
				</Button>
				<Button variant="plain" aria-label="Strikethrough" aria-pressed={false}>
					<Icon icon={<Strikethrough />} />
				</Button>
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="Alignment">
				<Button variant="plain" aria-label="Align left" aria-pressed={false}>
					<Icon icon={<TextAlignStart />} />
				</Button>
				<Button variant="plain" aria-label="Align center" aria-pressed={false}>
					<Icon icon={<TextAlignCenter />} />
				</Button>
				<Button variant="plain" aria-label="Align right" aria-pressed={false}>
					<Icon icon={<TextAlignEnd />} />
				</Button>
			</ToolbarGroup>
		</Toolbar>
	)
}
