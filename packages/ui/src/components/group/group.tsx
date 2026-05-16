import type { ReactNode, Ref } from 'react'
import { cn } from '../../core'
import { Density, useDensity } from '../../primitives/density'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import type { Step } from '../../recipes/ryu/sun'
import type { GroupOrientation } from '../../recipes/ryu/tsunagi'
import { useGroup } from './use-group'

type GroupBaseProps = {
	/** Axis the group lays out on. Defaults to horizontal. */
	orientation?: GroupOrientation
	/**
	 * Size step that drives end-cap radii on participating children. Resolution
	 * order: explicit prop, then enclosing Density size, then `'md'`.
	 */
	size?: Step
	dataSlot?: string
	ref?: Ref<HTMLDivElement>
	className?: string
	children?: ReactNode
}

export type GroupProps = GroupBaseProps & PolymorphicProps<'div'>

/**
 * Group — a wrapper that joins adjacent children visually by stamping
 * `data-group` position attributes (`start` | `middle` | `end` | `only`)
 * onto each child. Participating kata read these attributes via
 * `tsunagi.base` to drop their inner radii and overlap by 1 px so adjacent
 * borders don't double.
 *
 * Provides the Density cascade for its descendants: components that read
 * `useDensity()` (Button, Input, etc.) will default their `size` prop to
 * the wrapper's resolved size unless the consumer passes one explicitly.
 *
 * Composes with surrounding `<Card>` / `<Drawer>` / `<Popover>`: when `size`
 * is omitted, the wrapper inherits from the enclosing Density, keeping a
 * Card → Toolbar → Buttons hierarchy visually consistent without prop
 * drilling.
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
	dataSlot = 'group',
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
			dataSlot={dataSlot}
			href={href}
			data-step={resolvedSize}
			data-group-orientation={orientation}
			className={cn('inline-flex', orientation === 'vertical' ? 'flex-col' : 'flex-row', className)}
			{...props}
		>
			<Density density={resolvedSize} size={resolvedSize}>
				{stamped}
			</Density>
		</Polymorphic>
	)
}
