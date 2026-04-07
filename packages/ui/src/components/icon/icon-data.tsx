export type IconName =
	| 'arrow-down-left'
	| 'arrow-down-right'
	| 'arrow-down'
	| 'arrow-left'
	| 'arrow-right'
	| 'arrow-up-left'
	| 'arrow-up-right'
	| 'arrow-up'
	| 'check'
	| 'chevron-down'
	| 'chevron-left'
	| 'chevron-right'
	| 'chevron-up-down'
	| 'chevron-up'
	| 'clipboard'
	| 'code'
	| 'command'
	| 'copy'
	| 'edit-2'
	| 'edit-3'
	| 'edit'
	| 'eye-off'
	| 'eye'
	| 'external-link'
	| 'folder'
	| 'grid'
	| 'hash'
	| 'lock'
	| 'log-in'
	| 'log-out'
	| 'menu'
	| 'minus'
	| 'moon'
	| 'plus'
	| 'search'
	| 'share'
	| 'sidebar'
	| 'slash'
	| 'sun'
	| 'trash-2'
	| 'trash'
	| 'unlock'
	| 'x-circle'
	| 'x'

interface IconDatum {
	viewBox: string
	strokeWidth: number
	content: React.ReactNode
}

export const iconData: Record<IconName, IconDatum> = {
	'arrow-down-left': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<line x1="17" y1="7" x2="7" y2="17" />
				<polyline points="17 17 7 17 7 7" />
			</>
		),
	},
	'arrow-down-right': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<line x1="7" y1="7" x2="17" y2="17" />
				<polyline points="17 7 17 17 7 17" />
			</>
		),
	},
	'arrow-down': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<line x1="12" y1="5" x2="12" y2="19" />
				<polyline points="19 12 12 19 5 12" />
			</>
		),
	},
	'arrow-left': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<line x1="19" y1="12" x2="5" y2="12" />
				<polyline points="12 19 5 12 12 5" />
			</>
		),
	},
	'arrow-right': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<line x1="5" y1="12" x2="19" y2="12" />
				<polyline points="12 5 19 12 12 19" />
			</>
		),
	},
	'arrow-up-left': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<line x1="17" y1="17" x2="7" y2="7" />
				<polyline points="7 17 7 7 17 7" />
			</>
		),
	},
	'arrow-up-right': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<line x1="7" y1="17" x2="17" y2="7" />
				<polyline points="7 7 17 7 17 17" />
			</>
		),
	},
	'arrow-up': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<line x1="12" y1="19" x2="12" y2="5" />
				<polyline points="5 12 12 5 19 12" />
			</>
		),
	},
	check: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: <polyline points="20 6 9 17 4 12" />,
	},
	'chevron-down': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: <polyline points="6 9 12 15 18 9" />,
	},
	'chevron-left': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: <polyline points="15 18 9 12 15 6" />,
	},
	'chevron-right': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: <polyline points="9 18 15 12 9 6" />,
	},
	'chevron-up-down': {
		viewBox: '0 0 24 24',
		strokeWidth: 1.5,
		content: (
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
			/>
		),
	},
	'chevron-up': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: <polyline points="18 15 12 9 6 15" />,
	},
	clipboard: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
				<rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
			</>
		),
	},
	code: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<polyline points="16 18 22 12 16 6" />
				<polyline points="8 6 2 12 8 18" />
			</>
		),
	},
	command: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
		),
	},
	copy: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
				<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
			</>
		),
	},
	'edit-2': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
	},
	'edit-3': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<path d="M12 20h9" />
				<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
			</>
		),
	},
	edit: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
				<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
			</>
		),
	},
	'eye-off': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
				<line x1="1" y1="1" x2="23" y2="23" />
			</>
		),
	},
	eye: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
				<circle cx="12" cy="12" r="3" />
			</>
		),
	},
	'external-link': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
				<polyline points="15 3 21 3 21 9" />
				<line x1="10" y1="14" x2="21" y2="3" />
			</>
		),
	},
	folder: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
		),
	},
	grid: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<rect x="3" y="3" width="7" height="7" />
				<rect x="14" y="3" width="7" height="7" />
				<rect x="14" y="14" width="7" height="7" />
				<rect x="3" y="14" width="7" height="7" />
			</>
		),
	},
	hash: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<line x1="4" y1="9" x2="20" y2="9" />
				<line x1="4" y1="15" x2="20" y2="15" />
				<line x1="10" y1="3" x2="8" y2="21" />
				<line x1="16" y1="3" x2="14" y2="21" />
			</>
		),
	},
	lock: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
				<path d="M7 11V7a5 5 0 0 1 10 0v4" />
			</>
		),
	},
	'log-in': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
				<polyline points="10 17 15 12 10 7" />
				<line x1="15" y1="12" x2="3" y2="12" />
			</>
		),
	},
	'log-out': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
				<polyline points="16 17 21 12 16 7" />
				<line x1="21" y1="12" x2="9" y2="12" />
			</>
		),
	},
	menu: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<line x1="3" y1="12" x2="21" y2="12" />
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="3" y1="18" x2="21" y2="18" />
			</>
		),
	},
	minus: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: <line x1="5" y1="12" x2="19" y2="12" />,
	},
	moon: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
	},
	plus: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</>
		),
	},
	search: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
			</>
		),
	},
	share: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
				<polyline points="16 6 12 2 8 6" />
				<line x1="12" y1="2" x2="12" y2="15" />
			</>
		),
	},
	sidebar: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
				<line x1="9" y1="3" x2="9" y2="21" />
			</>
		),
	},
	slash: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<circle cx="12" cy="12" r="10" />
				<line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
			</>
		),
	},
	sun: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<circle cx="12" cy="12" r="5" />
				<line x1="12" y1="1" x2="12" y2="3" />
				<line x1="12" y1="21" x2="12" y2="23" />
				<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
				<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
				<line x1="1" y1="12" x2="3" y2="12" />
				<line x1="21" y1="12" x2="23" y2="12" />
				<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
				<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
			</>
		),
	},
	'trash-2': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<polyline points="3 6 5 6 21 6" />
				<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
				<line x1="10" y1="11" x2="10" y2="17" />
				<line x1="14" y1="11" x2="14" y2="17" />
			</>
		),
	},
	trash: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<polyline points="3 6 5 6 21 6" />
				<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
			</>
		),
	},
	unlock: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
				<path d="M7 11V7a5 5 0 0 1 9.9-1" />
			</>
		),
	},
	'x-circle': {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<circle cx="12" cy="12" r="10" />
				<line x1="15" y1="9" x2="9" y2="15" />
				<line x1="9" y1="9" x2="15" y2="15" />
			</>
		),
	},
	x: {
		viewBox: '0 0 24 24',
		strokeWidth: 2,
		content: (
			<>
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</>
		),
	},
}
