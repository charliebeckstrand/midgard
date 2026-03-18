import { cn } from '../../core'

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
			className={cn(
				'w-full border-t',
				soft ? 'border-zinc-950/5' : 'border-zinc-950/10',
				soft ? 'dark:border-white/5' : 'dark:border-white/10',
				className,
			)}
		/>
	)
}
