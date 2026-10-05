export type Campaign = {
	name: string
	description: string
	status: 'active' | 'archived'
}

export const campaigns: Campaign[] = [
	{ name: 'Holiday promo', description: 'End-of-year discount campaign', status: 'active' },
	{ name: 'Spring launch', description: 'New product line announcement', status: 'active' },
	{ name: 'Beta program', description: 'Early access invite for select users', status: 'archived' },
	{ name: 'Referral bonus', description: 'Refer a friend and earn rewards', status: 'archived' },
]
