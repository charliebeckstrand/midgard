import { words } from '../../../data/words.ts'

export const drafts = words('wysiwyg-draft', {
	notes:
		'**Launch** is on *Friday*.\n\n- Freeze the build on Wednesday\n- Ship the `v2` flag\n\n> Ask the design team before the copy changes.',
	summary: 'The new search ships with **filters** and *saved queries*.',
	guide: 'Run `pnpm check` before each push.\n\n```sh\npnpm check\n```',
})
