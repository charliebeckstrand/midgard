'use client'

import type { ReactNode } from 'react'
import { Disclosure, DisclosureButton, DisclosurePanel } from '../components/disclosure'
import { Heading } from '../components/heading'
import { CodeBlock } from './code-block'

export function Example({
	title,
	actions,
	code,
	children,
}: {
	title?: ReactNode
	actions?: ReactNode
	code?: string
	children: ReactNode
}) {
	return (
		<div className="space-y-2">
			{(title || actions) && (
				<div className="flex items-center justify-between gap-2">
					{title && <Heading level={3}>{title}</Heading>}
					{actions}
				</div>
			)}
			<div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
				<div className="p-4">{children}</div>
				{code && (
					<Disclosure>
						<div className="border-t border-zinc-200 dark:border-zinc-800">
							<DisclosureButton className="flex text-sm px-4 py-2">
								{({ open }) => (open ? 'Hide code' : 'Show code')}
							</DisclosureButton>
						</div>
						<DisclosurePanel>
							<div className="border-t border-zinc-200 dark:border-zinc-800">
								<CodeBlock code={code} />
							</div>
						</DisclosurePanel>
					</Disclosure>
				)}
			</div>
		</div>
	)
}
