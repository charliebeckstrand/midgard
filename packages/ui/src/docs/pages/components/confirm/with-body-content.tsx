import { useState } from 'react'
import { Button } from 'ui/button'
import { Checkbox, CheckboxField } from 'ui/checkbox'
import { Confirm } from 'ui/confirm'
import { DialogBody } from 'ui/dialog'
import { Label } from 'ui/fieldset'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

export default function WithBodyContent() {
	const [open, setOpen] = useState(false)

	const [accepted, setAccepted] = useState(false)

	return (
		<>
			<Button
				color="blue"
				onClick={() => {
					setAccepted(false)
					setOpen(true)
				}}
			>
				Accept terms and conditions
			</Button>
			<Confirm
				open={open}
				onOpenChange={setOpen}
				onConfirm={() => setOpen(false)}
				title="Terms and conditions"
				confirm={{ label: 'Accept', color: 'blue', disabled: !accepted }}
			>
				<DialogBody>
					<Stack gap="md">
						<Text>
							You own the files that you upload. You give us permission to store them, copy them for
							backups, and show them to the people that you share them with.
						</Text>
						<Text>
							A paid plan renews each month until you cancel it. You can cancel at any time from the
							billing page.
						</Text>
						<CheckboxField>
							<Checkbox
								color="blue"
								checked={accepted}
								onChange={(event) => setAccepted(event.target.checked)}
							/>
							<Label>I accept the terms and conditions</Label>
						</CheckboxField>
					</Stack>
				</DialogBody>
			</Confirm>
		</>
	)
}
