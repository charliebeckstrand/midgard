import { cn } from '../../core/cn'
import { k } from '../../recipes/kata/icon-button'
import { Icon, type IconProps } from '../icon'

type IconButtonSwapProps = {
	icon: IconProps['icon']
	pressedIcon: IconProps['icon']
	/** Which of the two icons shows. */
	pressed: boolean
	/** Mirrors both icons in a right-to-left layout. @defaultValue false */
	mirror?: boolean
}

/**
 * The two icons of a two-state icon button, which cross-fade on `pressed`. Pass
 * them as the `prefix` of a {@link Button}. The classes sit on the icons, not on
 * wrapper spans, so each icon stays a direct child of the Button. The slot
 * projection of the Button (`*:data-[slot=icon]`) then sizes it. Shared by
 * {@link IconButton} and {@link CopyButton}. A CopyButton is not a toggle, so it
 * does not take `aria-pressed`.
 *
 * @internal
 */
export function IconButtonSwap({
	icon,
	pressedIcon,
	pressed,
	mirror = false,
}: IconButtonSwapProps) {
	return (
		<>
			<Icon icon={icon} mirror={mirror} className={k({ active: !pressed }).icon} />
			<Icon
				icon={pressedIcon}
				mirror={mirror}
				className={cn('absolute inset-0 m-auto', k({ active: pressed }).icon)}
			/>
		</>
	)
}
