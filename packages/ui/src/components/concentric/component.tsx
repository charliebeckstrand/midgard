import { type CSSProperties, type ReactNode, type Ref, useMemo } from 'react'
import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps } from '../../primitives'
import { type Step, sun } from '../../recipes/ryu/sun'
import { ConcentricContext } from './context'

type ConcentricBaseProps = {
	/** Size step that drives padding, inner radius, and the concentric outer radius. */
	size?: Step
	/** Skip the wrapper's own padding — useful when the child paints the surface itself. */
	flush?: boolean
	/** Override the data-slot attribute. Defaults to "concentric". */
	dataSlot?: string
	ref?: Ref<HTMLDivElement>
	className?: string
	children?: ReactNode
}

export type ConcentricProps = ConcentricBaseProps & PolymorphicProps<'div'>

/**
 * Concentric — a wrapper that propagates a size context and renders an outer
 * container whose border-radius follows the concentric formula:
 *
 *     outer-radius = inner-radius + padding
 *
 * Children inherit the active size via `useConcentric()`. CSS variables
 * `--ui-radius-inner` and `--ui-padding` are exposed for descendants that
 * want to derive their own concentric corners.
 *
 * @example
 *   <Concentric size="md">
 *     <Button>Inner content</Button>
 *   </Concentric>
 */
export function Concentric({
	size = 'md',
	flush = false,
	dataSlot = 'concentric',
	ref,
	className,
	href,
	children,
	...props
}: ConcentricProps) {
	const value = useMemo(() => ({ size }), [size])

	const style = useMemo(
		() =>
			({
				'--ui-radius-inner': `var(--radius-${sun[size].radius})`,
				'--ui-padding': `calc(var(--spacing) * ${sun[size].space})`,
			}) as CSSProperties,
		[size],
	)

	return (
		<Polymorphic
			as="div"
			ref={ref}
			dataSlot={dataSlot}
			href={href}
			data-step={size}
			className={cn(
				!flush && `p-${sun[size].space}`,
				'rounded-[calc(var(--ui-radius-inner)+var(--ui-padding))]',
				className,
			)}
			style={style}
			{...props}
		>
			<ConcentricContext.Provider value={value}>{children}</ConcentricContext.Provider>
		</Polymorphic>
	)
}
