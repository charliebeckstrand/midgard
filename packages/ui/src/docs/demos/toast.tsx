'use client'

import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Toast } from '../../components/toast'
import { ToastProvider, useToast } from '../../providers/toast'
import { code } from '../code'
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
		<ToastProvider>
			<Stack gap="xl">
				<Example
					title="Setup"
					code={code`
						import { Toast } from 'ui/toast'
						import { ToastProvider, useToast } from 'ui/providers/toast'

						<ToastProvider duration={5000} maxToasts={5}>
							<App />
							<Toast position="bottom-right" />
						</ToastProvider>

						// Anywhere inside the provider:
						const { toast, dismiss } = useToast()
						toast({ title: 'Saved' })
					`}
				>
					<Text variant="muted">
						Wrap the app in <code>ToastProvider</code> to own the toast queue, and render{' '}
						<code>Toast</code> once inside the provider as the viewport. Any descendant can call{' '}
						<code>useToast()</code> to emit or dismiss toasts.
					</Text>
				</Example>

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
