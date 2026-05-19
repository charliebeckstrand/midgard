'use client'

import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Toast } from '../../components/toast'
import { ToastProvider, useToast } from '../../providers/toast'
import { Example } from '../components/example'

export const meta = { category: 'Feedback' }

function ToastButtonsExample() {
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

function PersistToastButtonExample() {
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

function ActionToastButtonExample() {
	const { toast, dismiss } = useToast()

	const handleClick = () => {
		const id = crypto.randomUUID()

		const handleUndo = () => {
			dismiss({ id })

			toast({ title: 'Action undone', type: 'success' })
		}

		toast({
			id,
			title: 'Message deleted',
			description: 'The message has been removed.',
			type: 'success',
			duration: 7000,
			actions: (
				<Button color="amber" onClick={handleUndo}>
					Undo
				</Button>
			),
		})
	}

	return (
		<Button color="green" onClick={handleClick}>
			With action
		</Button>
	)
}

export default function ToastDemo() {
	return (
		<ToastProvider>
			<Stack gap="xl">
				<Example title="Types">
					<ToastButtonsExample />
				</Example>

				<Example title="Persist">
					<PersistToastButtonExample />
				</Example>

				<Example title="With action">
					<ActionToastButtonExample />
				</Example>
			</Stack>
			<Toast />
		</ToastProvider>
	)
}
