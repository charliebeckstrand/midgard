import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import type { GroupOrientation } from '../../recipes'
import type { scale } from '../../recipes/kata/button'
import { k } from '../../recipes/kata/group'
import { Box } from '../../structure/box'

type GroupBaseProps = {
	/** Axis the group lays out on. @defaultValue 'horizontal' */
	orientation?: GroupOrientation
	/**
	 * The density step of the children. Omit it to take the step of the nearest
	 * density scope. A step makes the group a density scope.
	 */
	size?: ScaleStep<typeof scale>
	className?: string
	children?: ReactNode
}

/** Props for {@link Group}: `orientation` and `size` atop native `<div>` attributes. */
export type GroupProps = GroupBaseProps & Omit<ComponentProps<'div'>, 'className'>

/**
 * A container that joins adjacent children visually. It carries the `tsunagi` join
 * classes (`recipes/kata/group`). They drop the inner radii and overlap
 * adjacent borders by 1 px, keyed on the DOM position of each child. A child
 * that renders nothing takes no position, and the children of a Fragment join
 * as siblings. The root stamps `data-orientation`, the axis marker every
 * oriented container carries. A vertical group stretches each child to the
 * width of the group, so the outer edges line up. Static leaf: renders in React
 * Server Components.
 *
 * An explicit `size` opens a density scope, so the children (Button, Input,
 * and so on) take that step unless they have a `size` of their own. With no
 * `size`, the group opens no scope, and the children take the step of the
 * nearest scope, such as a surrounding `<Card>`, `<Drawer>`, or `<Popover>`.
 *
 * @remarks
 * The group takes no role by default. A group that joins an input to its addon
 * is one control to the reader, and an unnamed `role="group"` there is noise.
 * When the children are a set of related controls, such as the buttons of a
 * text format bar, pass `role="group"` and an `aria-label`. Pass
 * `role="toolbar"` when the set acts as a toolbar.
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
	return (
		<Box
			density={size}
			data-orientation={orientation}
			className={cn(k({ orientation }).base, className)}
			{...props}
			data-slot="group"
		>
			{children}
		</Box>
	)
}
