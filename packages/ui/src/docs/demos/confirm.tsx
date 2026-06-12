import { useState } from 'react'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField } from '../../components/checkbox'
import { Confirm } from '../../components/confirm'
import { DialogBody } from '../../components/dialog'
import { Label } from '../../components/fieldset'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export function Demo() {
	const [discardOpen, setDiscardOpen] = useState(false)
	const [termsConditionsOpen, setTermsConditionsOpen] = useState(false)
	const [accepted, setAccepted] = useState(false)

	return (
		<>
			<Example title="Confirm">
				<Button color="amber" onClick={() => setDiscardOpen(true)}>
					Discard changes
				</Button>
				<Confirm
					open={discardOpen}
					onOpenChange={setDiscardOpen}
					onConfirm={() => setDiscardOpen(false)}
					description="You have unsaved changes that will be lost."
					confirm={{ label: 'Discard changes', color: 'amber' }}
					cancel={{ label: 'Keep editing' }}
				/>
			</Example>

			<Example title="With body content">
				<Button color="blue" onClick={() => setTermsConditionsOpen(true)}>
					Accept terms and conditions
				</Button>
				<Confirm
					open={termsConditionsOpen}
					onOpenChange={(open) => {
						setTermsConditionsOpen(open)
						if (!open) setAccepted(false)
					}}
					onConfirm={() => {
						setTermsConditionsOpen(false)
						setAccepted(false)
					}}
					title="Terms and Conditions"
					confirm={{ label: 'Accept', color: 'blue', disabled: !accepted }}
				>
					<DialogBody>
						<Stack gap="md">
							<Text>
								Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
								incididunt ut labore et dolore magna aliqua.
							</Text>
							<Text>
								Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip
								ex ea commodo consequat.
							</Text>
							<Text>
								Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
								fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa
								qui officia deserunt mollit anim id est laborum.
							</Text>
							<CheckboxField>
								<Checkbox color="blue" checked={accepted} onChange={() => setAccepted(!accepted)} />
								<Label>Accept terms and conditions</Label>
							</CheckboxField>
						</Stack>
					</DialogBody>
				</Confirm>
			</Example>
		</>
	)
}
