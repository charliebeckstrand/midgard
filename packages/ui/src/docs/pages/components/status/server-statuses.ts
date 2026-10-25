import { words } from '../../../data/words.ts'

export const serverStatuses = words('server-status', {
	inactive: 'Server offline',
	active: 'Server online',
	info: 'Server updating',
	warning: 'Server degraded',
	error: 'Server down',
})
