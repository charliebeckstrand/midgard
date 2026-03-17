/** Standard form control padding — the px/py calc shared by Input, Select, Textarea, Combobox */
export const controlPadding =
	'px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)]'

/**
 * Form field slot spacing — how label, control, description, and error relate.
 * Used by Field, Fieldset, and any container that lays out form slot children.
 */
export const formFieldSpacing = [
	'[&>[data-slot=label]+[data-slot=control]]:mt-3',
	'[&>[data-slot=label]+[data-slot=description]]:mt-1',
	'[&>[data-slot=description]+[data-slot=control]]:mt-3',
	'[&>[data-slot=control]+[data-slot=description]]:mt-3',
	'[&>[data-slot=control]+[data-slot=error]]:mt-3',
	'*:data-[slot=label]:font-medium',
]

/** Form control wrapper (Input, Select, Textarea, Combobox) */
export const controlWrapper = [
	// Layout
	'relative block w-full',
	// Before pseudo — visual border/shadow
	'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm',
	'dark:before:hidden',
	// After pseudo — focus ring
	'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset',
	'focus-within:after:ring-2 focus-within:after:ring-blue-600',
	// Disabled
	'has-[:disabled]:opacity-50 has-[:disabled]:before:bg-zinc-950/5 has-[:disabled]:before:shadow-none',
]

/** WebKit date input overrides — normalises padding on date/time picker pseudo-elements */
export const dateInputOverrides = [
	'[&::-webkit-datetime-edit-fields-wrapper]:p-0',
	'[&::-webkit-date-and-time-value]:min-h-[1.5em]',
	'[&::-webkit-datetime-edit]:inline-flex',
	'[&::-webkit-datetime-edit]:p-0',
	'[&::-webkit-datetime-edit-year-field]:p-0',
	'[&::-webkit-datetime-edit-month-field]:p-0',
	'[&::-webkit-datetime-edit-day-field]:p-0',
	'[&::-webkit-datetime-edit-hour-field]:p-0',
	'[&::-webkit-datetime-edit-minute-field]:p-0',
	'[&::-webkit-datetime-edit-second-field]:p-0',
	'[&::-webkit-datetime-edit-millisecond-field]:p-0',
	'[&::-webkit-datetime-edit-meridiem-field]:p-0',
]

/** Shared input element styles (Input, Select, Textarea, Combobox) */
export const controlInput = [
	// Text
	'text-base/6 text-zinc-950 placeholder:text-zinc-500',
	'dark:text-white',
	// Background
	'bg-transparent',
	'dark:bg-white/5',
	// Border
	'border border-zinc-950/10',
	'dark:border-white/10',
	// Hover
	'hover:border-zinc-950/20',
	'dark:hover:border-white/20',
	// Focus
	'focus:outline-hidden',
	// Invalid
	'data-invalid:border-red-600',
	'dark:data-invalid:border-red-700',
	'data-invalid:hover:border-red-600',
	'dark:data-invalid:hover:border-red-700',
	// Disabled
	'disabled:border-zinc-950/20',
	'dark:disabled:border-white/15 dark:disabled:bg-white/2.5',
	'dark:hover:disabled:border-white/15',
]
