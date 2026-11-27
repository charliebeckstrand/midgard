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
import { useState } from 'react'
import { IconButton } from 'ui/icon-button'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from 'ui/toolbar'

const marks = [
	{ label: 'Bold', icon: <LetterB /> },
	{ label: 'Italic', icon: <Italic /> },
	{ label: 'Underline', icon: <Underline /> },
	{ label: 'Strikethrough', icon: <Strikethrough /> },
]

const alignments = [
	{ value: 'start', label: 'Align left', icon: <TextAlignStart /> },
	{ value: 'center', label: 'Align center', icon: <TextAlignCenter /> },
	{ value: 'end', label: 'Align right', icon: <TextAlignEnd /> },
]

export default function WithGroups() {
	const [align, setAlign] = useState('start')

	return (
		<Toolbar aria-label="Text formatting">
			<ToolbarGroup aria-label="History">
				<IconButton icon={<Undo />} aria-label="Undo" variant="plain" tooltip />
				<IconButton icon={<Redo />} aria-label="Redo" variant="plain" tooltip />
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="Marks">
				{marks.map((mark) => (
					<IconButton
						key={mark.label}
						icon={mark.icon}
						aria-label={mark.label}
						variant="plain"
						defaultPressed={false}
						tooltip
					/>
				))}
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="Alignment">
				{alignments.map((alignment) => (
					<IconButton
						key={alignment.value}
						icon={alignment.icon}
						aria-label={alignment.label}
						variant="plain"
						pressed={align === alignment.value}
						onPressedChange={() => setAlign(alignment.value)}
						tooltip
					/>
				))}
			</ToolbarGroup>
		</Toolbar>
	)
}
