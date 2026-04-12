export const status = {
	dot: {
		base: 'inline-block rounded-full',
		variant: {
			solid: 'bg-current',
			outline: 'border-2 border-current bg-white dark:bg-zinc-900',
		},
		status: {
			inactive: 'text-zinc-400 dark:text-zinc-500',
			active: 'text-green-500',
			info: 'text-blue-500',
			warning: 'text-amber-500',
			error: 'text-red-500',
		},
		pulse: {
			true: 'animate-pulse',
			false: '',
		},
		size: {
			xs: 'size-1.5',
			sm: 'size-2',
			md: 'size-2.5',
			lg: 'size-3',
			xl: 'size-4',
		},
		defaults: {
			variant: 'solid' as const,
			status: 'inactive' as const,
			size: 'md' as const,
		},
	},
}
