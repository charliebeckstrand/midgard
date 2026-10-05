import { Heart } from 'lucide-react'
import { ToggleIconButton, type ToggleIconButtonProps } from 'ui/toggle-icon-button'

export default function ToggleIconButtonPlayground(props: ToggleIconButtonProps) {
	return (
		<ToggleIconButton
			{...props}
			icon={<Heart />}
			pressedIcon={<Heart fill="currentColor" />}
			aria-label="Favorite"
		/>
	)
}
