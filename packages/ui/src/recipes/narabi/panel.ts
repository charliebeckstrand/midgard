import { sumi } from '../sumi'

/** Panel slot arrangement (shared by dialog + sheet). */
export const panel = {
	title: [sumi.text, 'text-lg/7 font-semibold'],
	description: [sumi.textMuted, 'text-base/6'],
	body: 'mt-4',
	actions: 'mt-6 flex items-center justify-end gap-3',
}
