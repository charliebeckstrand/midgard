import { narabi } from '../narabi'
import { omote } from '../omote'
import { take } from '../take'

export const dialog = {
	panel: {
		base: [
			omote.panel.chrome,
			narabi.panel.base,
			'relative',
			'w-full',
			'p-6',
			'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[calc(85dvh)] max-sm:overflow-y-auto',
			'sm:rounded-2xl sm:max-h-[calc(100dvh-2rem)]',
		],
		glass: {
			true: omote.glass,
			false: omote.panel.bg,
		},
		size: take.panel,
		defaults: { size: 'lg' as const },
	},
}
