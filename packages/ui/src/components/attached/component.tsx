import { type ReactNode, type Ref, useMemo } from 'react'
import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps } from '../../primitives'
import type { Step } from '../../recipes/ryu/sun'
import type { AttachedOrientation } from '../../recipes/ryu/tsunagi'
import { useConcentric } from '../concentric'
import { ConcentricContext } from '../concentric/context'
import { useAttached } from './hook'

type AttachedBaseProps = {
	/** Axis the group lays out on. Defaults to horizontal. */
	orientation?: AttachedOrientation
	/**
	 * Size step that drives end-cap radii on participating children. Resolution
	 * order: explicit prop, then enclosing `<Concentric>` size, then `'md'`.
	 */
	size?: Step
	/** Override the data-slot attribute. Defaults to "attached". */
	dataSlot?: string
	ref?: Ref<HTMLDivElement>
	className?: string
	children?: ReactNode
}

export type AttachedProps = AttachedBaseProps & PolymorphicProps<'div'>

/**
 * Attached — a wrapper that joins adjacent children visually by stamping
 * `data-attached` position attributes (`start` | `middle` | `end` | `only`)
 * onto each child. Participating kata read these attributes via
 * `tsunagi.base` to drop their inner radii and overlap by 1 px so adjacent
 * borders don't double.
 *
 * Provides the same size context as `<Concentric>`: descendants that read
 * `useConcentric()` (Button, Input, etc.) will default their `size` prop to
 * the wrapper's resolved size unless the consumer passes one explicitly.
 *
 * Composes with `<Concentric>`: when `size` is omitted, the wrapper inherits
 * from the enclosing concentric context, keeping a Card → Toolbar → Buttons
 * hierarchy visually consistent without prop drilling.
 *
 * @example
 *   <Attached>
 *     <Button>Cut</Button>
 *     <Button>Copy</Button>
 *     <Button>Paste</Button>
 *   </Attached>
 */
export function Attached({
	orientation = 'horizontal',
	size,
	dataSlot = 'attached',
	ref,
	className,
	href,
	children,
	...props
}: AttachedProps) {
	const ctx = useConcentric()
	const resolvedSize = size ?? ctx?.size ?? 'md'
	const stamped = useAttached(children, orientation)

	const contextValue = useMemo(() => ({ size: resolvedSize }), [resolvedSize])

	return (
		<Polymorphic
			as="div"
			ref={ref}
			dataSlot={dataSlot}
			href={href}
			data-step={resolvedSize}
			data-attached-orientation={orientation}
			className={cn('inline-flex', orientation === 'vertical' ? 'flex-col' : 'flex-row', className)}
			{...props}
		>
			<ConcentricContext.Provider value={contextValue}>{stamped}</ConcentricContext.Provider>
		</Polymorphic>
	)
}
