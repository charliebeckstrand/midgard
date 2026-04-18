import { tv, type VariantProps } from 'tailwind-variants'
import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sumi } from '../sumi'

export const drawerPanel = tv({
	base: [
		...omote.panel.chrome.flat(),
		narabi.panel.base,
		'fixed inset-x-0 bottom-0',
		'overflow-hidden',
		'w-full max-h-[85dvh]',
		'rounded-t-xl',
	],
	variants: {
		glass: {
			true: [...omote.glass],
			false: [...omote.panel.bg],
		},
	},
	defaultVariants: { glass: false },
})

export const drawerBackdrop = tv({
	base: 'absolute inset-0',
	variants: {
		glass: {
			true: [...omote.backdrop.glass],
			false: [...omote.backdrop.base],
		},
	},
	defaultVariants: { glass: false },
})

export const drawerTitle = tv({ base: [...narabi.panel.title, 'px-6 pt-6'] })
export const drawerDescription = tv({ base: [...narabi.panel.description, 'px-6'] })
export const drawerActions = tv({ base: [narabi.panel.actions, 'px-6 pb-6'] })
export const drawerBody = tv({
	base: [narabi.panel.body, 'flex-1 overflow-y-auto overscroll-y-contain', 'px-6 last:mb-6'],
})
export const drawerClose = tv({
	base: ['absolute right-4 top-4', 'p-1', ...sumi.textMuted, ki.inset, maru.roundedMd],
})

export type DrawerPanelVariants = VariantProps<typeof drawerPanel>

/** Kept for the `katachi` barrel — not consumed directly. */
export const drawer = {
	panel: drawerPanel,
	backdrop: drawerBackdrop,
	title: drawerTitle,
	description: drawerDescription,
	actions: drawerActions,
	body: drawerBody,
	close: drawerClose,
}
