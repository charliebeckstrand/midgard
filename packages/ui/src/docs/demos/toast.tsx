'use client'

import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Toast, useToast } from '../../components/toast'
import { Example } from '../components/example'

export const meta = { category: 'Feedback' }

function ToastButtons() {
	const { toast } = useToast()

	return (
		<Flex wrap gap="sm">
			<Button color="blue" onClick={() => toast({ title: 'Event created' })}>
				Default
			</Button>
			<Button
				onClick={() =>
					toast({
						title: 'Draft saved',
						description: 'Your draft has been saved locally.',
						type: 'secondary',
					})
				}
			>
				Secondary
			</Button>
			<Button
				color="green"
				onClick={() =>
					toast({ title: 'Saved', description: 'Your changes have been saved.', type: 'success' })
				}
			>
				Success
			</Button>
			<Button
				color="amber"
				onClick={() =>
					toast({ title: 'Warning', description: 'Storage is almost full.', type: 'warning' })
				}
			>
				Warning
			</Button>
			<Button
				color="red"
				onClick={() =>
					toast({ title: 'Error', description: 'Something went wrong.', type: 'error' })
				}
			>
				Error
			</Button>
		</Flex>
	)
}

function PersistToastButton() {
	const { toast } = useToast()

	return (
		<Button
			color="blue"
			onClick={() =>
				toast({
					title: 'Attention:',
					description: 'This toast will stay until dismissed.',
					persist: true,
				})
			}
		>
			Persist
		</Button>
	)
}

function ActionToastButton() {
	const { toast } = useToast()

	return (
		<Button
			color="green"
			onClick={() =>
				toast({
					title: 'Message deleted',
					description: 'The message has been removed.',
					type: 'success',
					duration: 7000,
					actions: <Button>Undo</Button>,
				})
			}
		>
			With action
		</Button>
	)
}

export default function ToastDemo() {
	return (
		<Toast>
			<Stack gap="xl">
				<Example title="Types">
					<ToastButtons />
				</Example>

				<Example title="Persist">
					<PersistToastButton />
				</Example>

				<Example title="With action">
					<ActionToastButton />
				</Example>
			</Stack>
		</Toast>
	)
}
