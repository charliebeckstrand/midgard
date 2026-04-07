import { cn } from '../../core'
import { type PlaceholderVariants, placeholderVariants } from './variants'

export type PlaceholderProps = PlaceholderVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export type PlaceholderTextProps = Omit<React.ComponentPropsWithoutRef<'div'>, 'children'> & {
	bars?: number
}

export type PlaceholderSidebarItemProps = Omit<React.ComponentPropsWithoutRef<'div'>, 'children'>

export function Placeholder({ variant, className, ...props }: PlaceholderProps) {
	return (
		<div
			data-slot="placeholder"
			aria-hidden="true"
			className={cn(placeholderVariants({ variant }), className)}
			{...props}
		/>
	)
}

const barWidths = [40, 70, 80, 50] as const

export function PlaceholderText({ bars = 3, className, ...props }: PlaceholderTextProps) {
	return (
		<div className={cn('space-y-2', className)} aria-hidden="true" {...props}>
			{Array.from({ length: bars }).map((_, index) => (
				<Placeholder
					// biome-ignore lint/suspicious/noArrayIndexKey: deterministic static skeleton list
					key={index}
					style={bars > 1 ? { width: `${barWidths[index % barWidths.length]}%` } : undefined}
				/>
			))}
		</div>
	)
}

export function PlaceholderSidebarItem({ className, ...props }: PlaceholderSidebarItemProps) {
	return (
		<div
			className={cn('flex items-center gap-3 rounded-lg px-2 py-1.5', className)}
			aria-hidden="true"
			{...props}
		>
			<Placeholder variant="circle" className="size-4 shrink-0" />
			<Placeholder className="h-4 flex-1" />
		</div>
	)
}
