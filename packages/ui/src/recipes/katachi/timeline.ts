import { sumi } from '../sumi'

export const timeline = {
	base: ['list-none p-0 m-0'],
	orientation: {
		vertical: 'flex flex-col',
		horizontal: 'flex flex-row overflow-x-auto',
	},
	variant: {
		solid: '',
		outline: '',
	},
	item: {
		base: 'relative last:[&>[data-slot=timeline-connector]]:hidden',
		vertical: 'grid grid-cols-[0.875rem_1fr] gap-x-4 pb-8 last:pb-0',
		horizontal: 'pl-[6.5px] pt-8 pr-8 last:pr-0',
		active: '',
	},
	connector: {
		base: 'absolute',
		vertical: {
			solid: [
				'left-[6px] top-[39px] -bottom-[25px] w-0.5',
				'bg-zinc-200',
				'dark:bg-zinc-700',
			],
			outline: [
				'left-[6.5px] top-[39px] -bottom-[25px] w-px',
				'bg-zinc-950/10',
				'dark:bg-white/10',
			],
		},
		horizontal: {
			solid: [
				'top-[6px] left-[20.5px] -right-[6.5px] h-0.5',
				'bg-zinc-200',
				'dark:bg-zinc-700',
			],
			outline: [
				'top-[6.5px] left-[20.5px] -right-[6.5px] h-px',
				'bg-zinc-950/10',
				'dark:bg-white/10',
			],
		},
	},
	marker: {
		base: 'z-10 size-3.5',
		vertical: 'col-start-1 row-start-2 self-center justify-self-center',
		horizontal: 'absolute top-0 left-[6.5px]',
		color: {
			zinc: 'text-zinc-500 dark:text-zinc-400',
			red: 'text-red-500 dark:text-red-500',
			amber: 'text-amber-500 dark:text-amber-500',
			green: 'text-green-500 dark:text-green-500',
			blue: 'text-blue-500 dark:text-blue-500',
		},
	},
	heading: ['col-start-2 row-start-2 text-sm/6 font-semibold', sumi.text],
	description: ['col-start-2 row-start-3 mt-0.5 text-sm/5', sumi.textMuted],
	timestamp: ['col-start-2 row-start-1 text-xs/5', sumi.textMuted],
	defaults: { orientation: 'vertical' as const, variant: 'solid' as const },
}
