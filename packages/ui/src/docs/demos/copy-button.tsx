'use client'

import { Link } from 'lucide-react'
import { CopyButton } from '../../components/copy-button'
import { Example } from '../components/example'

export const meta = { category: 'Other' }

export default function CopyButtonDemo() {
	return (
		<div className="space-y-8">
			<Example title="Default">
				<CopyButton
					value="Hello, world!"
					className="size-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
				/>
			</Example>
			<Example title="Custom icon">
				<CopyButton
					value="https://example.com"
					icon={<Link />}
					className="size-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
				/>
			</Example>
			<Example title="Custom timeout (5s)">
				<CopyButton
					value="Copied with a longer timeout!"
					timeout={5000}
					className="size-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
				/>
			</Example>
		</div>
	)
}
