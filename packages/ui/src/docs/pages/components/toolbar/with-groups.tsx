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
import { type ReactElement, useState } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from 'ui/toolbar'

const alignments = [
	{ value: 'start', label: 'Align left', icon: <TextAlignStart /> },
	{ value: 'center', label: 'Align center', icon: <TextAlignCenter /> },
	{ value: 'end', label: 'Align right', icon: <TextAlignEnd /> },
]

// A pressed toggle takes the soft fill, so the state shows, and the button keeps its size.
function Toggle({
	label,
	icon,
	pressed,
	onPress,
}: {
	label: string
	icon: ReactElement
	pressed: boolean
	onPress: () => void
}) {
	return (
		<Button
			variant={pressed ? 'soft' : 'plain'}
			aria-label={label}
			aria-pressed={pressed}
			onClick={onPress}
		>
			<Icon icon={icon} />
		</Button>
	)
}

function Mark({ label, icon }: { label: string; icon: ReactElement }) {
	const [pressed, setPressed] = useState(false)

	return <Toggle label={label} icon={icon} pressed={pressed} onPress={() => setPressed(!pressed)} />
}

export default function WithGroups() {
	const [align, setAlign] = useState('start')

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
				<Mark label="Bold" icon={<Bold />} />
				<Mark label="Italic" icon={<Italic />} />
				<Mark label="Underline" icon={<Underline />} />
				<Mark label="Strikethrough" icon={<Strikethrough />} />
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="Alignment">
				{alignments.map((alignment) => (
					<Toggle
						key={alignment.value}
						label={alignment.label}
						icon={alignment.icon}
						pressed={align === alignment.value}
						onPress={() => setAlign(alignment.value)}
					/>
				))}
			</ToolbarGroup>
		</Toolbar>
	)
}
