'use client'

import { Disclosure, DisclosureButton, DisclosurePanel } from '../../components/disclosure'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export default function DisclosureDemo() {
	return (
		<Stack gap={8}>
			<Example title="Default">
				<Disclosure>
					<DisclosureButton>Toggle details</DisclosureButton>
					<DisclosurePanel>
						<p className="pt-2 text-sm text-zinc-500">
							This content is revealed when the disclosure is opened. It animates in with a smooth
							height transition.
						</p>
					</DisclosurePanel>
				</Disclosure>
			</Example>

			<Example title="Default open">
				<Disclosure defaultOpen>
					<DisclosureButton>Toggle details</DisclosureButton>
					<DisclosurePanel>
						<p className="pt-2 text-sm text-zinc-500">
							This content is visible by default because the disclosure starts open.
						</p>
					</DisclosurePanel>
				</Disclosure>
			</Example>
		</Stack>
	)
}
