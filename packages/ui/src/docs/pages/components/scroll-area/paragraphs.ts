const notes = [
	'The editor saves a draft every minute. When the browser closes before you save, open the draft from the File menu.',
	'Search finds text inside attached PDF files. Each result shows the page number of the match.',
	'You can pin up to five projects to the top of the sidebar. Drag a pinned project to change its position.',
	'Comments support mentions. Type @ and a name, and that member of your team gets an email.',
	'An export to CSV keeps the order and the width of the columns that you see in the table.',
	'Dark mode follows the setting of your device. Open the appearance settings to select a fixed theme.',
	'The calendar view shows each task that has a due date. Drag a task to a new day to change its due date.',
	'Two-factor authentication supports security keys. Add a key from the security page of your account.',
	'A large upload continues after a lost connection. The progress bar shows the part that remains.',
	'Each project has an activity log. The log shows who changed a task, and when.',
	'Keyboard shortcuts cover each main action. Press the question mark key to see the full list.',
	'An archived project moves to a separate list. You can restore it from the archive at any time.',
]

export const paragraphs = notes.map((text, index) => ({ id: `paragraph-${index}`, text }))
