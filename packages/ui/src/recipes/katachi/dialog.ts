import { omote } from '../omote'
import { take } from '../take'

export const dialog = {
	panel: {
		base: [
			omote.panel.base,
			'relative w-full p-6',
			'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[calc(85dvh)] max-sm:overflow-y-auto',
			'sm:rounded-2xl',
		],
		size: take.panel,
		defaults: { size: 'lg' as const },
	},
}
