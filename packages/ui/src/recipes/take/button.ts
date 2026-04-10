import { gap, iconSlot, text } from './density'

/** Extra padding opposite the icon for buttons with icon + text (balances visual icon weight) */
export const buttonWithIcon = {
	start: {
		sm: 'pr-[calc(--spacing(3)-1px)]',
		md: 'pr-[calc(--spacing(4)-1px)]',
		lg: 'pr-[calc(--spacing(6)-1px)]',
	},
	end: {
		sm: 'pl-[calc(--spacing(3)-1px)]',
		md: 'pl-[calc(--spacing(4)-1px)]',
		lg: 'pl-[calc(--spacing(6)-1px)]',
	},
}

/** Gap override when a spinner child is present (extra breathing room beyond the icon gap) */
export const buttonWithSpinner = {
	sm: 'has-[[data-slot=spinner]]:gap-1.5',
	md: 'has-[[data-slot=spinner]]:gap-2',
	lg: 'has-[[data-slot=spinner]]:gap-2.5',
}

/** Button density (padding offset by 1px for border, includes gap + text + icon slot) */
export const button = {
	sm: [
		'px-[calc(--spacing(1.5)-1px)] py-[calc(--spacing(1.5)-1px)]',
		gap.sm,
		text.sm,
		iconSlot.sm,
		buttonWithSpinner.sm,
	],
	md: [
		'px-[calc(--spacing(2)-1px)] py-[calc(--spacing(2)-1px)]',
		gap.md,
		text.md,
		iconSlot.md,
		buttonWithSpinner.md,
	],
	lg: [
		'px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2.5)-1px)]',
		gap.lg,
		text.lg,
		iconSlot.lg,
		buttonWithSpinner.lg,
	],
}

/** Icon-only button dimensions (touch target slightly larger than text button) */
export const buttonIcon = { sm: 'size-7', md: 'size-9', lg: 'size-11' }
