import { type CSSProperties, useMemo } from 'react'
import { cn } from '../../core'
import { type Step, sun } from '../../recipes/ryu/sun'
import { Box, type BoxProps } from '../box'
import { ConcentricContext } from '../concentric/context'

export type CardProps = Omit<BoxProps, 'radius'> & {
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
	const noExplicitPadding = p === undefined && px === undefined && py === undefined
	const step = sun[size]
	const ctx = useMemo(() => ({ size }), [size])

	const style: CSSProperties = {
		'--ui-radius-inner': `var(--radius-${step.radius})`,
		'--ui-padding': `calc(var(--spacing) * ${step.space})`,
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
					'overflow-hidden outline-offset-[-1px]',
					'rounded-[calc(var(--ui-radius-inner)+var(--ui-padding))]',
					noExplicitPadding && `[&:not(:has(>[data-slot^=card-]))]:p-${step.space}`,
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
