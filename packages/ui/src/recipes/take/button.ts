import { gap, iconSlot, text } from './density'

/** Extra padding opposite the icon for buttons with icon + text (balances visual icon weight) */
export const buttonWithIcon = {
	start: {
		xs: 'pr-[calc(--spacing(1.5)-1px)]',
		sm: 'pr-[calc(--spacing(2)-1px)]',
		md: 'pr-[calc(--spacing(3)-1px)]',
		lg: 'pr-[calc(--spacing(4)-1px)]',
	},
	end: {
		xs: 'pl-[calc(--spacing(1.5)-1px)]',
		sm: 'pl-[calc(--spacing(2)-1px)]',
		md: 'pl-[calc(--spacing(3)-1px)]',
		lg: 'pl-[calc(--spacing(4)-1px)]',
	},
}

/** Icon-only button dimensions (touch target slightly larger than text button) */
export const buttonWithIconSize = { xs: 'size-6', sm: 'size-7', md: 'size-9', lg: 'size-11' }

/** Extra padding opposite a Kbd child — half the icon offset, since Kbd carries less visual weight */
export const buttonWithKbd = {
	start: {
		xs: 'pr-[calc(--spacing(1)-1px)]',
		sm: 'pr-[calc(--spacing(1.5)-1px)]',
		md: 'pr-[calc(--spacing(2)-1px)]',
		lg: 'pr-[calc(--spacing(3)-1px)]',
	},
	end: {
		xs: 'pl-[calc(--spacing(1)-1px)]',
		sm: 'pl-[calc(--spacing(1.5)-1px)]',
		md: 'pl-[calc(--spacing(2)-1px)]',
		lg: 'pl-[calc(--spacing(3)-1px)]',
	},
}

/** Gap override when a spinner child is present (extra breathing room beyond the icon gap) */
export const buttonWithSpinner = {
	xs: 'has-[[data-slot=spinner]]:gap-1',
	sm: 'has-[[data-slot=spinner]]:gap-1.5',
	md: 'has-[[data-slot=spinner]]:gap-2',
	lg: 'has-[[data-slot=spinner]]:gap-2.5',
}

/** Button density (padding offset by 1px for border, includes gap + text + icon slot) */
export const button = {
	xs: [
		'px-[calc(--spacing(1)-1px)] py-[calc(--spacing(1)-1px)]',
		gap.xs,
		text.xs,
		iconSlot.xs,
		buttonWithSpinner.xs,
	],
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
