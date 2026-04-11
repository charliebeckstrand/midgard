'use client'

import { ChevronRight } from 'lucide-react'
import { Disclosure, DisclosureButton, DisclosurePanel } from '../components/disclosure'
import { Divider } from '../components/divider'
import { Heading } from '../components/heading'
import { Icon } from '../components/icon'
import { PropsTable } from './components/api-reference'
import type { Demo } from './registry'

export function DemoPage({ demo }: { demo: Demo }) {
	return (
		<div className="mx-auto w-full space-y-6 px-2 lg:p-6 lg:px-6">
			<Heading>{demo.name}</Heading>
			<demo.component />
			{demo.api && (
				<>
					<Divider />
					<Disclosure>
						<DisclosureButton className="-mt-4 -ml-2">
							<Icon
								icon={<ChevronRight />}
								className="transition-transform in-data-open:rotate-90"
							/>
							API Reference
						</DisclosureButton>
						<DisclosurePanel>
							<div className="pt-4">
								<PropsTable api={demo.api} />
							</div>
						</DisclosurePanel>
					</Disclosure>
				</>
			)}
		</div>
	)
}
