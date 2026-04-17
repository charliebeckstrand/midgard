import { cn } from '../../core'
import { breadcrumbListVariants } from './variants'

export type BreadcrumbListProps = React.ComponentPropsWithoutRef<'ol'>

export function BreadcrumbList({ className, ...props }: BreadcrumbListProps) {
	return (
		<ol
			data-slot="breadcrumb-list"
			className={cn(breadcrumbListVariants(), className)}
			{...props}
		/>
	)
}
