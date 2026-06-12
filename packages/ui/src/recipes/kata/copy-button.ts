import { hannou, iro, kasane, narabi } from '../kiso'

const { fg } = hannou
const { text } = iro
const { rounded } = kasane
const { flex } = narabi

const rest = [text.muted, fg.hover, fg.focus]

const copied = [
	text.success,
	'hover:not-disabled:text-green-700 dark:hover:not-disabled:text-green-500',
	'focus-visible:not-disabled:text-green-700 dark:focus-visible:not-disabled:text-green-500',
]

export const k = ({ copied: _copied }: { copied: boolean }) =>
	({
		base: ['relative', flex.row, 'justify-center', rounded.lg, _copied ? copied : rest],
	}) as const
