export const scrollArea = {
	base: [
		'overscroll-contain',
		'[scrollbar-width:thin]',
		'[&::-webkit-scrollbar]:h-1.5',
		'[&::-webkit-scrollbar]:w-1.5',
		'[&::-webkit-scrollbar-track]:bg-transparent',
		'[&::-webkit-scrollbar-thumb]:rounded-full',
		'[&::-webkit-scrollbar-thumb]:bg-zinc-950/10',
		'hover:[&::-webkit-scrollbar-thumb]:bg-zinc-950/20',
		'dark:[&::-webkit-scrollbar-thumb]:bg-white/10',
		'dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20',
	],
	orientation: {
		vertical: 'overflow-x-hidden overflow-y-auto',
		horizontal: 'overflow-x-auto overflow-y-hidden',
		both: 'overflow-auto',
	},
	defaults: { orientation: 'vertical' as const },
}
