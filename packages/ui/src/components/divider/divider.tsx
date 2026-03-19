import { cn } from '../../core'
import { kage } from '../../recipes'

export function Divider({
	soft = false,
	className,
	...props
}: { soft?: boolean } & React.ComponentPropsWithoutRef<'hr'>) {
	return (
		<hr
			role="presentation"
			data-slot="divider"
			{...props}
			className={cn('w-full border-t', soft ? kage.usui : kage.base, className)}
		/>
	)
}
