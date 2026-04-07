'use client'

import { Disclosure, DisclosureButton, DisclosurePanel } from '../../components/disclosure'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

export default function DisclosureDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Disclosure, DisclosureButton, DisclosurePanel } from 'ui/disclosure'

					<Disclosure>
						<DisclosureButton>Toggle details</DisclosureButton>
						<DisclosurePanel>
							<p>Revealed content goes here.</p>
						</DisclosurePanel>
					</Disclosure>
				`}
			>
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
			<Example
				title="Default open"
				code={code`
					import { Disclosure, DisclosureButton, DisclosurePanel } from 'ui/disclosure'

					<Disclosure defaultOpen>
						<DisclosureButton>Toggle details</DisclosureButton>
						<DisclosurePanel>
							<p>This content is visible by default.</p>
						</DisclosurePanel>
					</Disclosure>
				`}
			>
				<Disclosure defaultOpen>
					<DisclosureButton>Toggle details</DisclosureButton>
					<DisclosurePanel>
						<p className="pt-2 text-sm text-zinc-500">
							This content is visible by default because the disclosure starts open.
						</p>
					</DisclosurePanel>
				</Disclosure>
			</Example>
		</div>
	)
}
