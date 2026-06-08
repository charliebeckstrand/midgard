import { Alert } from '../../../components/alert'
import { Banner } from '../../../components/banner'
import { LoadingDots, LoadingSpinner } from '../../../components/loading'
import { ProgressBar } from '../../../components/progress'
import type { Case } from './types'

/** Feedback — loading indicators, progress, and inline alerts and banners. */
export const feedbackCases: readonly Case[] = [
	['loading-spinner', <LoadingSpinner key="s" />],
	['loading-dots', <LoadingDots key="ld" />],
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
	[
		// Page-level banner (Alert-based); closable, with a named dismiss control.
		'banner',
		<Banner
			key="bn"
			severity="info"
			title="New version available"
			description="Refresh to update."
		/>,
	],
]
