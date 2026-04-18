import { tv, type VariantProps } from 'tailwind-variants'
import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const sheetPanel = tv({
	base: [...omote.panel.chrome.flat(), narabi.panel.base, 'fixed overflow-y-auto', 'rounded-xl'],
	variants: {
		side: {
			right: [
				'inset-y-0 right-0 w-full',
				'max-sm:rounded-r-none',
				'sm:top-4 sm:right-4 sm:bottom-4',
			],
			left: ['inset-y-0 left-0 w-full', 'max-sm:rounded-l-none', 'sm:top-4 sm:left-4 sm:bottom-4'],
			top: narabi.slide.top,
			bottom: narabi.slide.bottom,
		},
		size: take.panel,
		glass: {
			true: [...omote.glass],
			false: [...omote.panel.bg],
		},
	},
	compoundVariants: [
		{ side: 'right', size: 'full', class: 'sm:left-4' },
		{ side: 'left', size: 'full', class: 'sm:right-4' },
	],
	defaultVariants: { side: 'right', size: 'md', glass: false },
})

export const sheetBackdrop = tv({
	base: 'absolute inset-0',
	variants: {
		glass: {
			true: [...omote.backdrop.glass],
			false: [...omote.backdrop.base],
		},
	},
	defaultVariants: { glass: false },
})

export const sheetTitle = tv({ base: [...narabi.panel.title, 'px-6 pt-6'] })
export const sheetDescription = tv({ base: [...narabi.panel.description, 'px-6'] })
export const sheetActions = tv({ base: [narabi.panel.actions, 'px-6 pb-6'] })
export const sheetBody = tv({ base: [narabi.panel.body, 'flex-1 overflow-y-auto px-6'] })
export const sheetClose = tv({
	base: [...sumi.textMuted, ki.inset, maru.roundedMd, 'absolute right-5 top-5', 'p-1'],
})

export type SheetPanelVariants = VariantProps<typeof sheetPanel>

/** Kept for the `katachi` barrel — not consumed directly. */
export const sheet = {
	panel: sheetPanel,
	backdrop: sheetBackdrop,
	title: sheetTitle,
	description: sheetDescription,
	actions: sheetActions,
	body: sheetBody,
	close: sheetClose,
}
