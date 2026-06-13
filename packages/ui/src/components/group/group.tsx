'use client'

import type { ReactNode, Ref } from 'react'
import { cn } from '../../core'
import { Density, useDensity } from '../../primitives/density'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import type { GroupOrientation, Step } from '../../recipes'
import { k } from '../../recipes/kata/group'
import { useGroup } from './use-group'

type GroupBaseProps = {
	/** Axis the group lays out on. @default 'horizontal' */
	orientation?: GroupOrientation
	/**
	 * Size step that drives end-cap radii on participating children. Resolution
	 * order: explicit prop, then enclosing Density size, then `'md'`.
	 */
	size?: Step
	'data-slot'?: string
	ref?: Ref<HTMLDivElement>
	className?: string
	children?: ReactNode
}

/** Props for {@link Group}: `orientation` and `size` plus polymorphic `as`/`href` host attributes. */
export type GroupProps = GroupBaseProps & PolymorphicProps<'div'>

/**
 * Joins adjacent children visually by stamping `data-group` position
 * attributes (`start` | `middle` | `end` | `only`) onto each child. The
 * container carries the `tsunagi` join classes (`recipes/kata/group`), whose
 * descendant selectors drop the inner radii and overlap adjacent borders by
 * 1 px, keyed on the stamped position.
 *
 * Provides the Density cascade for its descendants: components that read
 * `useDensity()` (Button, Input, etc.) default their `size` prop to the
 * wrapper's resolved size unless the consumer passes one explicitly.
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
	'data-slot': slot = 'group',
	ref,
	className,
	href,
	children,
	...props
}: GroupProps) {
	const stamped = useGroup(children, orientation)
	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

	return (
		<Polymorphic
			as="div"
			ref={ref}
			data-slot={slot}
			href={href}
			data-size={resolvedSize}
			data-group-orientation={orientation}
			className={cn(
				'inline-flex',
				orientation === 'vertical' ? 'flex-col' : 'flex-row',
				k.join(orientation),
				className,
			)}
			{...props}
		>
			<Density scale={resolvedSize}>{stamped}</Density>
		</Polymorphic>
	)
}
