import { useEffect, useState } from 'react'
import { Avatar } from '../../components/avatar'
import { Button } from '../../components/button'
import { Placeholder, PlaceholderReveal } from '../../components/placeholder'
import { ContentReveal } from '../../primitives/content-reveal'
import { Example } from '../example'

export const meta = { category: 'Feedback' }

function CrossfadeRevealDemo() {
	const [ready, setReady] = useState(false)

	useEffect(() => {
		if (!ready) return

		const timer = setTimeout(() => setReady(false), 4000)

		return () => clearTimeout(timer)
	}, [ready])

	return (
		<div className="space-y-3">
			<Button variant="outline" size="sm" onClick={() => setReady(!ready)}>
				{ready ? 'Reset' : 'Simulate load'}
			</Button>
			<ContentReveal
				ready={ready}
				placeholder={
					<div className="flex items-start gap-3">
						<Placeholder variant="circle" className="size-10" />
						<div className="flex-1 space-y-2">
							<Placeholder className="max-w-[40%]" />
							<Placeholder />
							<Placeholder className="max-w-[80%]" />
							<Placeholder className="max-w-[50%]" />
						</div>
					</div>
				}
			>
				<div className="flex items-start gap-3">
					<Avatar initials="JD" className="size-10" />
					<div className="flex-1 space-y-1">
						<p className="text-sm font-semibold text-zinc-900 dark:text-white">Jane Doe</p>
						<p className="text-sm text-zinc-600 dark:text-zinc-400">
							Senior Engineer at Acme Corp. Working on design systems and component libraries.
						</p>
						<p className="text-sm text-zinc-500">San Francisco, CA</p>
					</div>
				</div>
			</ContentReveal>
		</div>
	)
}

function WaitRevealDemo() {
	const [ready, setReady] = useState(false)

	useEffect(() => {
		if (!ready) return

		const timer = setTimeout(() => setReady(false), 4000)

		return () => clearTimeout(timer)
	}, [ready])

	return (
		<div className="space-y-3">
			<Button variant="outline" size="sm" onClick={() => setReady(!ready)}>
				{ready ? 'Reset' : 'Simulate load'}
			</Button>
			<ContentReveal
				ready={ready}
				mode="wait"
				placeholder={
					<div className="flex items-start gap-3">
						<Placeholder variant="circle" className="size-10" />
						<div className="flex-1 space-y-2">
							<Placeholder className="max-w-[40%]" />
							<Placeholder />
							<Placeholder className="max-w-[80%]" />
						</div>
					</div>
				}
			>
				<div className="flex items-start gap-3">
					<Avatar initials="JD" className="size-10" />
					<div className="flex-1 space-y-1">
						<p className="text-sm font-semibold text-zinc-900 dark:text-white">Jane Doe</p>
						<p className="text-sm text-zinc-600 dark:text-zinc-400">
							Senior Engineer at Acme Corp. Working on design systems and component libraries.
						</p>
						<p className="text-sm text-zinc-500">San Francisco, CA</p>
					</div>
				</div>

				<div className="mt-4 space-y-2">
					<p className="text-sm font-medium text-zinc-900 dark:text-white">Recent activity</p>
					<ul className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
						<li>Merged PR #42 — Refactor token pipeline</li>
						<li>Reviewed PR #38 — Add color palette docs</li>
						<li>Opened issue #45 — Audit focus ring contrast</li>
					</ul>
				</div>
			</ContentReveal>
		</div>
	)
}

function PlaceholderRevealDemo() {
	const [ready, setReady] = useState(false)

	useEffect(() => {
		if (!ready) return

		const timer = setTimeout(() => setReady(false), 4000)

		return () => clearTimeout(timer)
	}, [ready])

	return (
		<div className="space-y-3">
			<Button variant="outline" size="sm" onClick={() => setReady(!ready)}>
				{ready ? 'Reset' : 'Simulate load'}
			</Button>
			<PlaceholderReveal ready={ready} bars={4}>
				<div className="space-y-1">
					<p className="text-sm text-zinc-900 dark:text-white">
						The quick brown fox jumps over the lazy dog. This paragraph demonstrates a smooth
						transition from placeholder bars to real text content.
					</p>
					<p className="text-sm text-zinc-500">Published 2 hours ago</p>
				</div>
			</PlaceholderReveal>
		</div>
	)
}

export default function PlaceholderDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Line (default)"
				code={`import { Placeholder } from 'ui/placeholder'

<Placeholder />
<Placeholder className="max-w-[70%]" />
<Placeholder className="max-w-[50%]" />`}
			>
				<div className="flex flex-col gap-2">
					<Placeholder />
					<Placeholder className="max-w-[70%]" />
					<Placeholder className="max-w-[50%]" />
				</div>
			</Example>

			<Example
				title="Rectangle"
				code={`import { Placeholder } from 'ui/placeholder'

<Placeholder variant="rect" className="h-10" />
<Placeholder variant="rect" className="h-24" />`}
			>
				<div className="flex flex-col gap-2">
					<Placeholder variant="rect" className="h-10" />
					<Placeholder variant="rect" className="h-24" />
				</div>
			</Example>

			<Example
				title="Circle"
				code={`import { Placeholder } from 'ui/placeholder'

<Placeholder variant="circle" className="size-8" />
<Placeholder variant="circle" className="size-10" />
<Placeholder variant="circle" className="size-12" />`}
			>
				<div className="flex items-center gap-2">
					<Placeholder variant="circle" className="size-8" />
					<Placeholder variant="circle" className="size-10" />
					<Placeholder variant="circle" className="size-12" />
				</div>
			</Example>

			<Example
				title="Composed layout"
				code={`import { Placeholder } from 'ui/placeholder'

<div className="flex items-start gap-3">
	<Placeholder variant="circle" className="size-10" />
	<div className="flex-1 space-y-2">
		<Placeholder className="max-w-[40%]" />
		<Placeholder />
		<Placeholder className="max-w-[80%]" />
	</div>
</div>`}
			>
				<div className="flex items-start gap-3">
					<Placeholder variant="circle" className="size-10" />
					<div className="flex-1 space-y-2">
						<Placeholder className="max-w-[40%]" />
						<Placeholder />
						<Placeholder className="max-w-[80%]" />
					</div>
				</div>
			</Example>

			<Example
				title="ContentReveal — crossfade"
				code={`import { ContentReveal } from 'ui/primitives'

<ContentReveal
	ready={ready}
	placeholder={<Placeholder />}
>
	<p>Loaded content</p>
</ContentReveal>`}
			>
				<CrossfadeRevealDemo />
			</Example>

			<Example
				title="ContentReveal — wait mode"
				code={`import { ContentReveal } from 'ui/primitives'

<ContentReveal
	ready={ready}
	mode="wait"
	placeholder={<Placeholder />}
>
	<p>Loaded content</p>
</ContentReveal>`}
			>
				<WaitRevealDemo />
			</Example>

			<Example
				title="PlaceholderReveal (convenience)"
				code={`import { PlaceholderReveal } from 'ui/placeholder'

<PlaceholderReveal ready={ready} bars={4}>
	<p>Content revealed after loading.</p>
</PlaceholderReveal>`}
			>
				<PlaceholderRevealDemo />
			</Example>
		</div>
	)
}
