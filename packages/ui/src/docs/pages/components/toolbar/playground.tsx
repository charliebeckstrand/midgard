import { Bold, Italic, TextAlignEnd, TextAlignStart, Underline } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Toolbar, type ToolbarProps, ToolbarSeparator } from 'ui/toolbar'

export default function ToolbarPlayground(props: ToolbarProps) {
	return (
		<Toolbar {...props} aria-label="Formatting">
			<Button variant="plain" aria-label="Bold" aria-pressed={false}>
				<Icon icon={<Bold />} />
			</Button>
			<Button variant="plain" aria-label="Italic" aria-pressed={false}>
				<Icon icon={<Italic />} />
			</Button>
			<Button variant="plain" aria-label="Underline" aria-pressed={false}>
				<Icon icon={<Underline />} />
			</Button>
			<ToolbarSeparator />
			<Button variant="plain" aria-label="Align left" aria-pressed={false}>
				<Icon icon={<TextAlignStart />} />
			</Button>
			<Button variant="plain" aria-label="Align right" aria-pressed={false}>
				<Icon icon={<TextAlignEnd />} />
			</Button>
		</Toolbar>
	)
}
