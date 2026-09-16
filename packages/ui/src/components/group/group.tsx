'use client'

import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core'
import { Density, useDensity } from '../../primitives/density'
import type { GroupOrientation, Step } from '../../recipes'
import { k } from '../../recipes/kata/group'
import { useGroup } from './use-group'

type GroupBaseProps = {
	/** Axis the group lays out on. @defaultValue 'horizontal' */
	orientation?: GroupOrientation
	/**
	 * Size step that drives end-cap radii on participating children. Resolution
	 * order: explicit prop, then enclosing Density size, then `'md'`.
	 */
	size?: Step
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
 *
 * Provides the Density cascade for its descendants. Components that read
 * `useDensity()` (Button, Input, etc.) default their `size` prop to the
 * wrapper's resolved size, unless the consumer passes one explicitly.
 *
 * Composes with surrounding `<Card>` / `<Drawer>` / `<Popover>`: when `size`
 * is omitted, the wrapper inherits the enclosing Density size.
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
	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

	return (
		<div
			data-slot="group"
			data-size={resolvedSize}
			data-orientation={orientation}
			className={cn(k.frame(orientation), className)}
			{...props}
		>
			<Density scale={resolvedSize}>{stamped}</Density>
		</div>
	)
}
