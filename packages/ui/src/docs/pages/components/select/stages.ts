import { words } from '../../../data/words.ts'

export const stageWords = words('purchase-stage', {
	draft: 'Draft',
	awaiting: 'Awaiting approval from finance',
	approved: 'Approved',
	ordered: 'Ordered',
})
