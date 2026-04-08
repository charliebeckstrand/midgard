import { sumi } from '../sumi'

export const heading = {
	base: sumi.text,
	level: {
		1: 'text-3xl/9 font-bold tracking-tight',
		2: 'text-2xl/8 font-semibold tracking-tight',
		3: 'text-xl/7 font-semibold tracking-tight',
		4: 'text-lg/6 font-semibold',
		5: 'text-base/6 font-medium',
		6: 'text-sm/5 font-medium',
	},
	defaults: { level: 1 as const },
}
