import { iro, narabi, sen } from '../kiso'

const { text } = iro
const { flex } = narabi
const { divider } = sen

export const k = {
	root: [flex.col, 'gap-2'],
	pin: [flex.inline, 'flex-none justify-center', 'px-3 -ml-3 -mr-3', ...text.muted],
	footer: [flex.row, 'justify-end', 'gap-1', 'pt-2', ...divider.top],
} as const
