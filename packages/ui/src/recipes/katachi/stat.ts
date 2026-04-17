import { sumi } from '../sumi'

export const stat = {
	base: 'flex flex-col gap-1',
	label: ['text-sm/5 font-medium', sumi.textMuted],
	value: {
		base: ['font-semibold tracking-tight tabular-nums', sumi.text],
		size: {
			sm: 'text-2xl/8',
			md: 'text-3xl/9',
			lg: 'text-4xl/10',
		},
		defaults: { size: 'md' as const },
	},
	delta: {
		base: 'inline-flex items-center gap-1 text-sm/5 font-medium tabular-nums',
		trend: {
			up: 'text-green-600 dark:text-green-500',
			down: 'text-red-600 dark:text-red-500',
			neutral: sumi.textMuted,
		},
		defaults: { trend: 'neutral' as const },
	},
	description: ['text-sm/5', sumi.textMuted],
}
