export const status = {
	dot: {
		base: 'inline-block rounded-full',
		status: {
			inactive: 'bg-zinc-400 dark:bg-zinc-500',
			active: 'bg-green-500',
			warning: 'bg-amber-500',
			error: 'bg-red-500',
		},
		size: {
			xs: 'size-1.5',
			sm: 'size-2',
			md: 'size-2.5',
			lg: 'size-3',
			xl: 'size-4',
		},
		defaults: { status: 'inactive' as const, size: 'md' as const },
	},
}
