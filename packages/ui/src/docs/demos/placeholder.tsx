import { useEffect, useState } from 'react'
import { Button } from '../../components/button'
import { Placeholder, PlaceholderReveal } from '../../components/placeholder'
import { ContentReveal } from '../../primitives/content-reveal'

export const meta = { category: 'Feedback' }

export default function PlaceholderDemo() {
	return (
		<div className="max-w-md space-y-8">
			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Line (default)</p>
				<Placeholder />
				<Placeholder className="max-w-[70%]" />
				<Placeholder className="max-w-[50%]" />
			</section>

			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Rectangle</p>
				<Placeholder variant="rect" className="h-10" />
				<Placeholder variant="rect" className="h-24" />
			</section>

			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Circle</p>
				<div className="flex items-center gap-3">
					<Placeholder variant="circle" className="size-8" />
					<Placeholder variant="circle" className="size-10" />
					<Placeholder variant="circle" className="size-12" />
				</div>
			</section>

			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Composed layout</p>
				<div className="flex items-start gap-3">
					<Placeholder variant="circle" className="size-10" />
					<div className="flex-1 space-y-2">
						<Placeholder className="max-w-[40%]" />
						<Placeholder />
						<Placeholder className="max-w-[80%]" />
					</div>
				</div>
			</section>

			<section className="space-y-4">
				<p className="text-sm font-medium text-zinc-500">ContentReveal — crossfade</p>
				<RevealDemo />
			</section>

			<section className="space-y-4">
				<p className="text-sm font-medium text-zinc-500">ContentReveal — wait mode</p>
				<RevealDemo mode="wait" />
			</section>

			<section className="space-y-4">
				<p className="text-sm font-medium text-zinc-500">PlaceholderReveal (convenience)</p>
				<PlaceholderRevealDemo />
			</section>
		</div>
	)
}

function RevealDemo({ mode }: { mode?: 'crossfade' | 'wait' }) {
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
				mode={mode}
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
					<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
						JD
					</div>
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
			<PlaceholderReveal ready={ready} bars={3}>
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
