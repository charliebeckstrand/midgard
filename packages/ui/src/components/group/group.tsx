'use client'

import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import type { GroupOrientation } from '../../recipes'
import { k } from '../../recipes/kata/group'
import { Box } from '../../structure/box'
import { useGroup } from './use-group'

type GroupBaseProps = {
	/** Axis the group lays out on. @defaultValue 'horizontal' */
	orientation?: GroupOrientation
	/**
	 * The density step of the children. Omit it to take the step of the nearest
	 * density scope. A step makes the group a density scope.
	 */
	size?: DensityStep
	className?: string
	children?: ReactNode
}

/** Props for {@link Group}: `orientation` and `size` atop native `<div>` attributes. */
export type GroupProps = GroupBaseProps & Omit<ComponentProps<'div'>, 'className'>

/**
 * Joins adjacent children visually by stamping `data-group` position
 * attributes (`start` | `middle` | `end` | `only`) onto each child. The
 * container carries the `tsunagi` join classes (`recipes/kata/group`). Their
 * descendant selectors drop the inner radii and overlap adjacent borders by
 * 1 px, keyed on the stamped position. Each child also takes
 * `data-group-orientation`, which those selectors read; the root itself stamps
 * plain `data-orientation`, the axis marker every oriented container carries.
 * A vertical group stretches each child to the width of the group, so the outer
 * edges line up.
 *
 * An explicit `size` opens a density scope, so the children (Button, Input,
 * and so on) take that step unless they have a `size` of their own. With no
 * `size`, the group opens no scope, and the children take the step of the
 * nearest scope, such as a surrounding `<Card>`, `<Drawer>`, or `<Popover>`.
 *
 * @example
 *   <Group>
 *     <Button>Cut</Button>
 *     <Button>Copy</Button>
 *     <Button>Paste</Button>
 *   </Group>
 */
export function Group({
	orientation = 'horizontal',
	size,
	className,
	children,
	...props
}: GroupProps) {
	const stamped = useGroup(children, orientation)

	return (
		<Box
			data-slot="group"
			density={size}
			data-orientation={orientation}
			className={cn(k.frame(orientation), className)}
			{...props}
		>
			{stamped}
		</Box>
	)
}
