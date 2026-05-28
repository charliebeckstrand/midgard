import { iro, narabi, sen } from '../kiso'

export const k = {
	root: [narabi.flex.col, 'gap-2'],
	pin: [narabi.flex.inline, 'flex-none justify-center', 'px-3 -ml-3 -mr-3', ...iro.text.muted],
	footer: [narabi.flex.row, 'justify-end', 'gap-1', 'pt-2', ...sen.divider.top],
} as const
