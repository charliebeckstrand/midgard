import type { ReactElement } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/toggle-icon-button'
import { Icon } from '../icon'

type ToggleIconButtonIconsProps = {
	icon: ReactElement
	pressedIcon: ReactElement
	/** Which of the two icons shows. */
	pressed: boolean
}

/**
 * The two icons of a two-state icon button, which cross-fade on `pressed`. Pass
 * them as the `prefix` of a {@link Button}. The classes sit on the icons, not on
 * wrapper spans, so each icon stays a direct child of the Button. The slot
 * projection of the Button (`*:data-[slot=icon]`) then sizes it. Shared by {@link ToggleIconButton} and
 * {@link CopyButton}, which is not a toggle and so does not take `aria-pressed`.
 *
 * @internal
 */
export function ToggleIconButtonIcons({ icon, pressedIcon, pressed }: ToggleIconButtonIconsProps) {
	return (
		<>
			<Icon icon={icon} className={k({ active: !pressed }).icon} />
			<Icon
				icon={pressedIcon}
				className={cn('absolute inset-0 m-auto', k({ active: pressed }).icon)}
			/>
		</>
	)
}
