import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { ToggleIconButton } from 'ui/toggle-icon-button'

export default function ThemeToggle() {
	const [dark, setDark] = useState(false)

	return (
		<ToggleIconButton
			pressed={dark}
			onPressedChange={setDark}
			icon={<Moon />}
			pressedIcon={<Sun />}
			aria-label="Dark mode"
		/>
	)
}
