'use client'

import type { ReactNode } from 'react'
import { Disclosure, DisclosureButton, DisclosurePanel } from '../components/disclosure'
import { Heading } from '../components/heading'
import { CodeBlock } from './code-block'

export function Example({
	title,
	code,
	children,
}: {
	title?: ReactNode
	code?: string
	children: ReactNode
}) {
	return (
		<div className="space-y-2">
			{title && <Heading level={3}>{title}</Heading>}
			<div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
				<div className="p-4">{children}</div>
				{code && (
					<Disclosure>
						<DisclosureButton className="flex w-full items-center gap-1.5 border-t border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:border-zinc-800 dark:hover:text-zinc-300">
							{({ open }) => (open ? 'Hide code' : 'Show code')}
						</DisclosureButton>
						<DisclosurePanel>
							<div className="border-t border-zinc-200 [&_pre]:rounded-none [&_pre]:rounded-b-lg dark:border-zinc-800">
								<CodeBlock code={code} />
							</div>
						</DisclosurePanel>
					</Disclosure>
				)}
			</div>
		</div>
	)
}
