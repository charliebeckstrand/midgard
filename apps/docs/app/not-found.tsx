export default function NotFound() {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="text-center">
				<div className="text-3xl font-black text-zinc-900 dark:text-white">404</div>
				<p className="mt-2 text-zinc-500 dark:text-zinc-400">This document doesn&apos;t exist.</p>
				<a href="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
					Back to docs
				</a>
			</div>
		</div>
	)
}
