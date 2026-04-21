import { cn } from '../../core'
import type { PolymorphicProps } from '../../primitives'
import { kokkaku } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type ChipVariants, chipVariants } from './variants'

type ChipBaseProps = ChipVariants & {
	className?: string
}

export type ChipProps = ChipBaseProps & PolymorphicProps<'span'>

export function Chip({
	variant,
	color,
	interactive,
	active,
	size,
	className,
	children,
	...props
}: ChipProps) {
	if (useSkeleton()) {
		return (
			<Placeholder className={cn(kokkaku.chip.base, kokkaku.chip.size[size ?? 'md'], className)} />
		)
	}

	const classes = cn(chipVariants({ variant, color, active, size }), className)

	if (interactive) {
		const userOnKeyDown = props.onKeyDown as React.KeyboardEventHandler<HTMLSpanElement> | undefined

		return (
			// biome-ignore lint/a11y/useSemanticElements: Chip is a polymorphic span; using <button> would break the element type and nesting inside buttons/links
			<span
				data-slot="chip"
				role="button"
				tabIndex={0}
				className={classes}
				{...props}
				onKeyDown={(e) => {
					userOnKeyDown?.(e)

					if (e.defaultPrevented) return

					if (e.key !== 'Enter' && e.key !== ' ') return

					e.preventDefault()

					e.currentTarget.click()
				}}
			>
				{children}
			</span>
		)
	}

	return (
		<span data-slot="chip" tabIndex={-1} className={classes} {...props}>
			{children}
		</span>
	)
}
