import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useButtonSize } from '../button/context'
import { useInputSize } from '../input/context'
import { type SpinnerVariants, spinnerVariants } from './variants'

export type SpinnerProps = SpinnerVariants & {
	label?: string
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
	className?: string
} & Omit<ComponentPropsWithoutRef<'output'>, 'className' | 'color'>

export function Spinner({ size, color, label = 'Loading', className, ...props }: SpinnerProps) {
	const buttonSize = useButtonSize()

	const inputSize = useInputSize()

	const resolvedSize = size ?? buttonSize ?? inputSize

	return (
		<output
			data-slot="spinner"
			className={cn(spinnerVariants({ size: resolvedSize, color }), className)}
			{...props}
		>
			<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-full">
				<circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
				<path
					d="M12 2a10 10 0 0 1 10 10"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
				/>
			</svg>
			<span className="sr-only">{label}</span>
		</output>
	)
}
