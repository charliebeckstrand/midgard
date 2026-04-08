import { sumi } from '../sumi'

export const text = {
	variant: {
		default: sumi.text,
		muted: sumi.textMuted,
		error: sumi.textError,
	},
	defaults: { variant: 'default' as const },
}
