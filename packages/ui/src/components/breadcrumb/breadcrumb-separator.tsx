import { cn } from '../../core'
import { breadcrumbSeparatorVariants } from './variants'

export type BreadcrumbSeparatorProps = React.ComponentPropsWithoutRef<'li'>

export function BreadcrumbSeparator({ children, className, ...props }: BreadcrumbSeparatorProps) {
	return (
		<li
			data-slot="breadcrumb-separator"
			role="presentation"
			aria-hidden="true"
			className={cn(breadcrumbSeparatorVariants(), className)}
			{...props}
		>
			{children ?? (
				<svg
					role="img"
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
			)}
		</li>
	)
}
