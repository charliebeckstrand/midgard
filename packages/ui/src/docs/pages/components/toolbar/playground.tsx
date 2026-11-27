import { Italic, LetterB, TextAlignEnd, TextAlignStart, Underline } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from 'ui/icon-button'
import { Toolbar, type ToolbarProps, ToolbarSeparator } from 'ui/toolbar'

const alignments = [
	{ value: 'start', label: 'Align left', icon: <TextAlignStart /> },
	{ value: 'end', label: 'Align right', icon: <TextAlignEnd /> },
]

export default function ToolbarPlayground(props: ToolbarProps) {
	const [align, setAlign] = useState('start')

	return (
		<Toolbar {...props} aria-label="Formatting">
			<IconButton
				icon={<LetterB />}
				aria-label="Bold"
				variant="plain"
				defaultPressed={false}
				tooltip
			/>
			<IconButton
				icon={<Italic />}
				aria-label="Italic"
				variant="plain"
				defaultPressed={false}
				tooltip
			/>
			<IconButton
				icon={<Underline />}
				aria-label="Underline"
				variant="plain"
				defaultPressed={false}
				tooltip
			/>
			<ToolbarSeparator />
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
		</Toolbar>
	)
}
