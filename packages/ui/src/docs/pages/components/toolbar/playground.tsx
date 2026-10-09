import { Bold, Italic, TextAlignEnd, TextAlignStart, Underline } from 'lucide-react'
import { type ReactElement, useState } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Toolbar, type ToolbarProps, ToolbarSeparator } from 'ui/toolbar'

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

export default function ToolbarPlayground(props: ToolbarProps) {
	const [align, setAlign] = useState('start')

	return (
		<Toolbar {...props} aria-label="Formatting">
			<Mark label="Bold" icon={<Bold />} />
			<Mark label="Italic" icon={<Italic />} />
			<Mark label="Underline" icon={<Underline />} />
			<ToolbarSeparator />
			<Toggle
				label="Align left"
				icon={<TextAlignStart />}
				pressed={align === 'start'}
				onPress={() => setAlign('start')}
			/>
			<Toggle
				label="Align right"
				icon={<TextAlignEnd />}
				pressed={align === 'end'}
				onPress={() => setAlign('end')}
			/>
		</Toolbar>
	)
}
