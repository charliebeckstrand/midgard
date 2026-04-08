export const divider = {
	base: 'border-0',
	orientation: {
		horizontal: 'w-full border-t',
		vertical: 'self-stretch border-l',
	},
	soft: {
		true: ['border-zinc-950/5', 'dark:border-white/5'],
		false: ['border-zinc-950/10', 'dark:border-white/10'],
	},
	defaults: { orientation: 'horizontal' as const, soft: false as const },
}
