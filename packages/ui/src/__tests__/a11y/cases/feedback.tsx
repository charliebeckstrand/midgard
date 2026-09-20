import { Alert } from '../../../components/alert'
import { Banner } from '../../../components/banner'
import { LoadingDots, LoadingSpinner } from '../../../components/loading'
import { ProgressBar } from '../../../components/progress'
import type { Case } from './types'

/** Feedback: loading indicators, progress, and inline alerts and banners. */
export const feedbackCases: readonly Case[] = [
	{ name: 'loading-spinner', element: <LoadingSpinner key="s" /> },
	{ name: 'loading-dots', element: <LoadingDots key="ld" /> },
	{
		// Determinate progressbar named via aria-label (no associated visible
		// label in this canonical form).
		name: 'progress',
		element: <ProgressBar key="pb" value={60} aria-label="Upload progress" />,
	},
	{
		name: 'alert',
		element: (
			<Alert key="a" severity="success" title="Saved" description="Your changes are live." />
		),
	},
	{
		// Page-level banner (Alert-based); closable, with a named dismiss control.
		name: 'banner',
		element: (
			<Banner
				key="bn"
				severity="info"
				title="New version available"
				description="Refresh to update."
			/>
		),
	},
]
