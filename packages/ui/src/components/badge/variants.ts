import { cva } from 'class-variance-authority'

export const badge = cva(
	'inline-flex items-center justify-center gap-x-1.5 rounded-md font-medium forced-colors:outline',
	{
		variants: {
			color: {
				red: 'bg-red-600/15 text-red-800 group-hover:bg-red-600/25 dark:bg-red-600/10 dark:text-red-900 dark:group-hover:bg-red-600/20',
				amber:
					'bg-amber-700/20 text-amber-600 group-hover:bg-amber-700/30 dark:bg-amber-700/10 dark:text-amber-900 dark:group-hover:bg-amber-700/15',
				green:
					'bg-green-600/15 text-green-800 group-hover:bg-green-600/25 dark:bg-green-600/10 dark:text-green-900 dark:group-hover:bg-green-600/20',
				blue: 'bg-blue-600/15 text-blue-800 group-hover:bg-blue-600/25 dark:text-blue-900 dark:group-hover:bg-blue-600/25',
				teal: 'bg-teal-600/15 text-teal-800 group-hover:bg-teal-600/25 dark:bg-teal-600/10 dark:text-teal-900 dark:group-hover:bg-teal-600/20',
				purple:
					'bg-purple-600/15 text-purple-800 group-hover:bg-purple-600/25 dark:bg-purple-600/10 dark:text-purple-900 dark:group-hover:bg-purple-600/20',
				pink: 'bg-pink-600/15 text-pink-800 group-hover:bg-pink-600/25 dark:bg-pink-600/10 dark:text-pink-900 dark:group-hover:bg-pink-600/20',
				zinc: 'bg-zinc-600/10 text-zinc-700 group-hover:bg-zinc-600/20 dark:bg-white/5 dark:text-zinc-400 dark:group-hover:bg-white/10',
				white:
					'bg-white text-zinc-950 group-hover:bg-zinc-50 dark:bg-white/5 dark:text-white dark:group-hover:bg-white/10',
				dark: 'bg-zinc-950/10 text-zinc-700 group-hover:bg-zinc-950/15 dark:bg-white/10 dark:text-zinc-300 dark:group-hover:bg-white/15',
			},
			size: {
				sm: 'px-1 py-0.5 text-xs/4',
				md: 'px-1.5 py-0.5 text-sm/5 sm:text-xs/5',
				lg: 'px-2 py-1 text-sm/5',
			},
		},
		defaultVariants: {
			color: 'zinc',
			size: 'md',
		},
	},
)
