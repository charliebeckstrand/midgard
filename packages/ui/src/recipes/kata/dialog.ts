import { tv, type VariantProps } from 'tailwind-variants'
import { narabi } from '../ryu/narabi'
import { omote } from '../ryu/omote'
import { take } from '../ryu/take'
import { definePanelRecipe } from '../waku/panel'

export const dialog = definePanelRecipe({
	panel: tv({
		base: [
			...omote.panel.chrome.flat(),
			narabi.panel.base,
			'relative',
			'w-full',
			'p-6',
			'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[calc(85dvh)] max-sm:overflow-y-auto',
			'sm:rounded-2xl sm:max-h-[calc(100dvh-2rem)]',
		],
		variants: {
			surface: {
				glass: [...omote.glass],
				flat: [...omote.panel.bg],
			},
			size: take.panel,
		},
		defaultVariants: { size: 'lg', surface: 'flat' },
	}),
})

export type DialogPanelVariants = VariantProps<typeof dialog.panel>
