/** Form control wrapper (Input, Select, Textarea, Combobox) */
export const controlWrapper = [
	'relative block w-full',
	'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm',
	'dark:before:hidden',
	'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset',
	'focus-within:after:ring-2 focus-within:after:ring-blue-600',
	'has-[:disabled]:opacity-50 has-[:disabled]:before:bg-zinc-950/5 has-[:disabled]:before:shadow-none',
]

/** Shared input element styles (Input, Select, Textarea, Combobox) */
export const controlInput = [
	'text-base/6 text-zinc-950 placeholder:text-zinc-500  dark:text-white',
	'border border-zinc-950/10 hover:border-zinc-950/20 dark:border-white/10 dark:hover:border-white/20',
	'bg-transparent dark:bg-white/5',
	'focus:outline-hidden',
	'data-invalid:border-red-600 data-invalid:hover:border-red-600 dark:data-invalid:border-red-700 dark:data-invalid:hover:border-red-700',
	'disabled:border-zinc-950/20 dark:disabled:border-white/15 dark:disabled:bg-white/2.5 dark:hover:disabled:border-white/15',
]
