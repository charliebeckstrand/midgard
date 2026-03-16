import { cva } from 'class-variance-authority'

export const badge = cva(
	'inline-flex items-center gap-x-1.5 rounded-md px-1.5 py-0.5 text-sm/5 font-medium sm:text-xs/5 forced-colors:outline',
	{
		variants: {
			color: {
				red: 'bg-red-500/15 text-red-700 group-hover:bg-red-500/25 dark:bg-red-500/10 dark:text-red-400 dark:group-hover:bg-red-500/20',
				orange:
					'bg-orange-500/15 text-orange-700 group-hover:bg-orange-500/25 dark:bg-orange-500/10 dark:text-orange-400 dark:group-hover:bg-orange-500/20',
				amber:
					'bg-amber-400/20 text-amber-700 group-hover:bg-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400 dark:group-hover:bg-amber-400/15',
				green:
					'bg-green-500/15 text-green-700 group-hover:bg-green-500/25 dark:bg-green-500/10 dark:text-green-400 dark:group-hover:bg-green-500/20',
				blue: 'bg-blue-500/15 text-blue-700 group-hover:bg-blue-500/25 dark:text-blue-400 dark:group-hover:bg-blue-500/25',
				indigo:
					'bg-indigo-500/15 text-indigo-700 group-hover:bg-indigo-500/25 dark:text-indigo-400 dark:group-hover:bg-indigo-500/20',
				violet:
					'bg-violet-500/15 text-violet-700 group-hover:bg-violet-500/25 dark:text-violet-400 dark:group-hover:bg-violet-500/20',
				zinc: 'bg-zinc-600/10 text-zinc-700 group-hover:bg-zinc-600/20 dark:bg-white/5 dark:text-zinc-400 dark:group-hover:bg-white/10',
				white:
					'bg-white text-zinc-950 group-hover:bg-zinc-50 dark:bg-white/5 dark:text-white dark:group-hover:bg-white/10',
				dark: 'bg-zinc-950/10 text-zinc-700 group-hover:bg-zinc-950/15 dark:bg-white/10 dark:text-zinc-300 dark:group-hover:bg-white/15',
			},
		},
		defaultVariants: {
			color: 'zinc',
		},
	},
)
