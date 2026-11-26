import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from 'ui/icon-button'

export default function ThemeToggle() {
	const [dark, setDark] = useState(false)

	return (
		<IconButton
			pressed={dark}
			onPressedChange={setDark}
			icon={<Moon />}
			pressedIcon={<Sun />}
			aria-label="Dark mode"
		/>
	)
}
