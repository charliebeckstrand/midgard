import { type CSSProperties, useMemo } from 'react'
import { cn } from '../../core'
import { ConcentricProvider, useConcentric } from '../../primitives'
import { kokkaku } from '../../recipes'
import { type Step, sun } from '../../recipes/ryu/sun'
import { Box, type BoxProps } from '../box'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'

export type CardProps = BoxProps<'radius'> & {
	/**
	 * Size step that drives padding, inner radius, and the concentric outer radius.
	 * Resolution order: explicit prop, then enclosing concentric size, then `'md'`.
	 */
	size?: Step
}

export function Card({
	size,
	p,
	px,
	py,
	bg = 'tint',
	outline = true,
	className,
	children,
	...props
}: CardProps) {
	const ambient = useConcentric()

	const resolvedSize = size ?? ambient?.size ?? 'md'

	const ctx = useMemo(() => ({ size: resolvedSize }), [resolvedSize])

	if (useSkeleton()) {
		return (
			<Placeholder className={cn(kokkaku.card.base, kokkaku.card.size[resolvedSize], className)} />
		)
	}

	const noExplicitPadding = p === undefined && px === undefined && py === undefined

	const step = sun[resolvedSize]

	const style: CSSProperties = {
		'--ui-padding': `calc(var(--spacing) * ${step.space})`,
		'--ui-radius-inner': `var(--radius-${step.radius})`,
		'--ui-gap': `calc(var(--spacing) * ${step.gap})`,
	} as CSSProperties

	return (
		<Box
			dataSlot="card"
			p={p}
			px={px}
			py={py}
			bg={bg}
			outline={outline}
			data-step={resolvedSize}
			className={cn(
				noExplicitPadding && '[&:not(:has(>[data-slot^=card-]))]:p-(--ui-padding)',
				'overflow-hidden -outline-offset-1 rounded-(--ui-radius-inner)',
				className,
			)}
			style={style}
			{...props}
		>
			<ConcentricProvider value={ctx}>{children}</ConcentricProvider>
		</Box>
	)
}
