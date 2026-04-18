import { sumi } from '../sumi'

/** Panel slot layout shared by dialog and sheet. */
export const panel = {
	base: 'flex flex-col',
	title: [...sumi.text, 'text-lg/7 font-semibold leading-none'],
	description: [...sumi.textMuted, 'text-base/6', 'mt-2 first:mt-0'],
	body: [...sumi.textMuted, 'min-h-0', 'mt-4 first:mt-0', 'overflow-y-auto'],
	actions: ['flex items-center justify-end', 'mt-6 first:mt-0', 'gap-3'],
}
