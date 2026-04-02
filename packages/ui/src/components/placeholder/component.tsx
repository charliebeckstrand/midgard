import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../core'
import { maru } from '../../recipes'

export const placeholderVariants = cva(['animate-pulse bg-zinc-200 dark:bg-zinc-700'], {
	variants: {
		variant: {
			line: 'h-3.5 w-full rounded',
			circle: 'rounded-full',
			rect: ['w-full', maru.rounded],
		},
	},
	defaultVariants: {
		variant: 'line',
	},
})

export type PlaceholderVariants = VariantProps<typeof placeholderVariants>

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

const barWidths = ['max-w-[40%]', 'max-w-[70%]', 'max-w-[80%]', 'max-w-[50%]']

export function PlaceholderText({ bars = 3, className, ...props }: PlaceholderTextProps) {
	return (
		<div className={cn('space-y-2', className)} aria-hidden="true" {...props}>
			{Array.from({ length: bars }).map((_, index) => (
				<Placeholder
					// biome-ignore lint/suspicious/noArrayIndexKey: deterministic static skeleton list
					key={index}
					className={bars > 1 ? barWidths[index % barWidths.length] : undefined}
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
