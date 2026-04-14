import { sumi } from '../sumi'

export const text = {
	variant: {
		default: sumi.text,
		muted: sumi.textMuted,
		error: sumi.textError,
	},
	color: {
		current: 'text-current',
		zinc: 'text-zinc-600',
		red: 'text-red-600',
		amber: 'text-amber-500',
		green: 'text-green-600',
		blue: 'text-blue-600',
	},
	defaults: { variant: 'default' as const },
}
