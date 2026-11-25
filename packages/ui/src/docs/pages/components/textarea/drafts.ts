import { words } from '../../../data/words.ts'

export const drafts = words('textarea-draft', {
	bio: 'Product designer. I work on design systems and typography.',
	releaseNotes: 'Fixes a crash on launch.',
	notes:
		'Launch is on Friday.\n\nBefore the launch:\n- Freeze the build on Wednesday\n- Ship the v2 flag to 10% of users\n- Watch the error rate each hour\n\nAfter the launch:\n- Send the release notes\n- Ask the design team before the copy changes\n- Plan the review for Monday',
})
