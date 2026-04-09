import { sumi } from '../sumi'

/** Panel slot arrangement (shared by dialog + sheet). */
export const panel = {
	base: 'flex flex-col',
	title: [sumi.text, 'text-lg/7 font-semibold'],
	description: [sumi.textMuted, 'mt-2 first:mt-0 text-base/6'],
	body: 'mt-4 first:mt-0 min-h-0 overflow-y-auto',
	actions: 'mt-6 first:mt-0 flex items-center justify-end gap-3',
}
