import { words } from '../../../data/words.ts'

export type Campaign = {
	label: string
	description: string
	status: 'active' | 'archived'
}

export const campaigns: Campaign[] = [
	{ label: 'Holiday promo', description: 'End-of-year discount campaign', status: 'active' },
	{ label: 'Spring launch', description: 'New product line announcement', status: 'active' },
	{
		label: 'Beta program',
		description: 'Early access invite for select users',
		status: 'archived',
	},
	{ label: 'Referral bonus', description: 'Refer a friend and earn rewards', status: 'archived' },
]

export const campaignStatuses = words('campaign-status', { active: 'Active', archived: 'Archived' })
