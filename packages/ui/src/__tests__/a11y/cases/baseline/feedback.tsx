import { Alert } from '../../../../components/alert'
import { ProgressBar } from '../../../../components/progress'
import { Spinner } from '../../../../components/spinner'
import type { Case } from '../types'

/** Feedback — spinners, progress, and inline alerts. */
export const feedbackCases: readonly Case[] = [
	['spinner', <Spinner key="s" />],
	[
		// Determinate progressbar named via aria-label (no associated visible
		// label in this canonical form).
		'progress',
		<ProgressBar key="pb" value={60} aria-label="Upload progress" />,
	],
	[
		'alert',
		<Alert key="a" severity="success" title="Saved" description="Your changes are live." />,
	],
]
