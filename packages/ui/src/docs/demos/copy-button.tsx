'use client'

import { CopyIcon } from 'lucide-react'
import { CopyButton } from '../../components/copy-button'
import { Example } from '../components/example'

export const meta = { category: 'Other' }

export default function CopyButtonDemo() {
	return (
		<div className="space-y-8">
			<Example title="Default">
				<CopyButton value="Hello, world!" />
			</Example>
			<Example title="Sizes">
				<div className="flex items-center gap-4">
					<CopyButton value="Large" size="lg" />
					<CopyButton value="Medium (default)" size="md" />
					<CopyButton value="Small" size="sm" />
					<CopyButton value="Extra small" size="xs" />
				</div>
			</Example>
			<Example title="Custom icon">
				<CopyButton value="https://example.com" icon={<CopyIcon />} />
			</Example>
		</div>
	)
}
