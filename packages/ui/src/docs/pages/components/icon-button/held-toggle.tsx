import { Italic, LetterB, Underline } from 'lucide-react'
import { IconButton } from 'ui/icon-button'
import { Toolbar } from 'ui/toolbar'

// A toggle with one icon shows its state with the held-down wash of its variant.
export default function HeldToggle() {
	return (
		<Toolbar aria-label="Format">
			<IconButton icon={<LetterB />} aria-label="Bold" variant="plain" defaultPressed tooltip />
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
		</Toolbar>
	)
}
