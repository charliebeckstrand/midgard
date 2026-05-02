import { type CSSProperties, useMemo } from 'react'
import { cn } from '../../core'
import { type Step, sun } from '../../recipes/ryu/sun'
import { Box, type BoxProps } from '../box'
import { ConcentricContext } from '../concentric/context'

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type CardProps = DistributiveOmit<BoxProps, 'radius'> & {
	/** Size step that drives padding, inner radius, and the concentric outer radius. */
	size?: Step
}

export function Card({
	size = 'md',
	p,
	px,
	py,
	bg = 'tint',
	outline = true,
	className,
	children,
	...props
}: CardProps) {
	const ctx = useMemo(() => ({ size }), [size])

	const noExplicitPadding = p === undefined && px === undefined && py === undefined

	const step = sun[size]

	const style: CSSProperties = {
		'--ui-padding': `calc(var(--spacing) * ${step.space})`,
		'--ui-radius-inner': `var(--radius-${step.radius})`,
		'--ui-gap': `calc(var(--spacing) * ${step.gap})`,
	} as CSSProperties

	return (
		<ConcentricContext.Provider value={ctx}>
			<Box
				dataSlot="card"
				p={p}
				px={px}
				py={py}
				bg={bg}
				outline={outline}
				data-step={size}
				className={cn(
					noExplicitPadding && '[&:not(:has(>[data-slot^=card-]))]:p-(--ui-padding)',
					'overflow-hidden -outline-offset-1 rounded-(--ui-radius-inner)',
					className,
				)}
				style={style}
				{...props}
			>
				{children}
			</Box>
		</ConcentricContext.Provider>
	)
}
