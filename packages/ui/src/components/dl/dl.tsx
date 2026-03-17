import { cn } from '../../core'

export function DL({ className, ...props }: React.ComponentPropsWithoutRef<'dl'>) {
	return (
		<dl
			{...props}
			className={cn(
				'grid grid-cols-1 text-base/6 sm:grid-cols-[min(50%,--spacing(80))_auto]',
				className,
			)}
		/>
	)
}

export function DT({ className, ...props }: React.ComponentPropsWithoutRef<'dt'>) {
	return (
		<dt
			{...props}
			className={cn(
				'col-start-1 border-t border-zinc-950/5 pt-3 text-zinc-500 first:border-none sm:border-t sm:border-zinc-950/5 sm:py-3',
				'dark:border-white/5 dark:text-zinc-400 sm:dark:border-white/5',
				className,
			)}
		/>
	)
}

export function DD({ className, ...props }: React.ComponentPropsWithoutRef<'dd'>) {
	return (
		<dd
			{...props}
			className={cn(
				'pt-1 pb-3 text-zinc-950 sm:border-t sm:border-zinc-950/5 sm:py-3 sm:nth-2:border-none',
				'dark:text-white dark:sm:border-white/5',
				className,
			)}
		/>
	)
}
