import { words } from '../../../data/words.ts'

export const drafts = words('wysiwyg-draft', {
	notes:
		'**Launch** is on *Friday*.\n\n- Freeze the build on Wednesday\n- Ship the `v2` flag\n\n> Ask the design team before the copy changes.',
	summary: 'The new search ships with **filters** and *saved queries*.',
	plan: '**Launch** is on *Friday*.\n\nBefore the launch:\n\n- Freeze the build on Wednesday\n- Ship the `v2` flag to 10% of users\n- Watch the error rate each hour\n\nAfter the launch:\n\n- Send the release notes\n- Plan the review for Monday\n\n> Ask the design team before the copy changes.',
	guide: 'Run `pnpm check` before each push.\n\n```sh\npnpm check\n```',
})
