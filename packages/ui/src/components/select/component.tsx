import { cn } from '../../core'
import { FormControl } from '../../primitives'
import { sumi } from '../../recipes'
import { type SelectVariants, selectVariants } from './variants'

export type SelectProps = SelectVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'select'>, 'className'>

export function Select({ className, children, ...props }: SelectProps) {
	return (
		<FormControl>
			<select data-slot="select" className={cn(selectVariants(), className)} {...props}>
				{children}
			</select>
			<svg
				data-slot="icon"
				className={cn(
					'pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 fill-current',
					sumi.muted,
				)}
				viewBox="0 0 16 16"
				aria-hidden="true"
			>
				<path
					fillRule="evenodd"
					d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
					clipRule="evenodd"
				/>
			</svg>
		</FormControl>
	)
}
