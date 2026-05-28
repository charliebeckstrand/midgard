import { iro, narabi, sen } from '../kiso'

export const k = {
	root: [narabi.col, 'gap-2'],
	pin: [narabi.inlineRow, 'flex-none justify-center', 'px-3 -ml-3 -mr-3', ...iro.text.muted],
	footer: [narabi.row, 'justify-end', 'gap-1', 'pt-2', ...sen.divider.top],
} as const
