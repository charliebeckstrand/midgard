import { Alert } from '../../../components/alert'
import { Banner } from '../../../components/banner'
import { LoadingDots, LoadingSpinner } from '../../../components/loading'
import {
	ProgressBar,
	ProgressBarSkeleton,
	ProgressGauge,
	ProgressGaugeSkeleton,
} from '../../../components/progress'
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
		skeleton: [
			{
				element: <ProgressBarSkeleton />,
				absentSlot: 'progress-bar',
			},
			{
				element: <ProgressGaugeSkeleton />,
				absentSlot: 'progress-gauge',
			},
		],
		density: [
			{
				render: (size) => <ProgressBar size={size} value={60} aria-label="Upload" />,
				slot: 'progress-bar',
			},
			{
				render: (size) => <ProgressGauge size={size} value={60} aria-label="Upload" />,
				slot: 'progress-gauge',
			},
		],
	},
	{
		// Two segments make an image, described by each part and the mark.
		name: 'progress-segments',
		element: (
			<ProgressBar
				key="pbs"
				max={435}
				segments={[
					{ value: 214, color: 'blue', label: 'Democrats' },
					{ value: 203, color: 'red', label: 'Republicans', from: 'end' },
				]}
				marks={[{ value: 218, label: '218 to win' }]}
				aria-label="House seats"
			/>
		),
	},
	{
		name: 'alert',
		element: (
			<Alert key="a" severity="success" title="Saved" description="Your changes are live." />
		),
		passthrough: [{ render: (props) => <Alert {...props} title="Saved" />, slot: 'alert' }],
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
