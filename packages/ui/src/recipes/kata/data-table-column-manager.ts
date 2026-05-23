import { iro, sen } from '../kiso'

export const k = {
	root: ['flex flex-col', 'gap-2'],
	pin: ['inline-flex flex-none items-center justify-center', 'px-3 -ml-3 -mr-3', ...iro.text.muted],
	footer: ['flex items-center justify-end', 'gap-1', 'pt-2', ...sen.divider],
}
