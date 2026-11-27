import { Heart } from 'lucide-react'
import { IconButton, type IconButtonProps } from 'ui/icon-button'

type IconButtonPlaygroundProps = Pick<
	IconButtonProps,
	'variant' | 'color' | 'size' | 'loading' | 'tooltipPlacement'
> & {
	animate?: boolean
	defaultPressed?: boolean
	disabled?: boolean
}

export default function IconButtonPlayground(props: IconButtonPlaygroundProps) {
	return (
		<IconButton
			defaultPressed={false}
			{...props}
			icon={<Heart />}
			pressedIcon={<Heart fill="currentColor" />}
			aria-label="Favorite"
			tooltip
		/>
	)
}
