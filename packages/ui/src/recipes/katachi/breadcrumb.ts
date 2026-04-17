import { sawari } from '../sawari'
import { sumi } from '../sumi'

export const breadcrumb = {
	base: '',
	list: 'flex flex-wrap items-center gap-1.5 break-words text-sm/5',
	item: {
		base: 'inline-flex items-center gap-1.5',
		current: {
			true: [sumi.text, 'font-normal'],
			false: [],
		},
		defaults: { current: false as const },
	},
	link: {
		base: '',
		current: {
			true: [sumi.text, 'font-normal'],
			false: [sumi.textMuted, sawari.cursor, 'hover:text-zinc-950', 'dark:hover:text-white'],
		},
		defaults: { current: false as const },
	},
	separator: [sumi.textMuted, '[&>svg]:size-3.5'],
}
