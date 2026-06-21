import { Button } from '../../../components/button'
import { Flex } from '../../../components/flex'
import { Stack } from '../../../components/stack'
import { Toast } from '../../../components/toast'
import { ToastProvider, useToast } from '../../../providers/toast'
import { code } from '../../code'
import { Example } from '../../components/example'

export const meta = { name: 'Toast Provider' }

function BasicExample() {
	const { toast } = useToast()

	return (
		<Button color="blue" onClick={() => toast({ title: 'Event created' })}>
			Show toast
		</Button>
	)
}

function SeverityExample() {
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
						severity: 'secondary',
					})
				}
			>
				Secondary
			</Button>
			<Button
				color="green"
				onClick={() =>
					toast({
						title: 'Saved',
						description: 'Your changes have been saved.',
						severity: 'success',
					})
				}
			>
				Success
			</Button>
			<Button
				color="amber"
				onClick={() =>
					toast({ title: 'Warning', description: 'Storage is almost full.', severity: 'warning' })
				}
			>
				Warning
			</Button>
			<Button
				color="red"
				onClick={() =>
					toast({ title: 'Error', description: 'Something went wrong.', severity: 'error' })
				}
			>
				Error
			</Button>
		</Flex>
	)
}

function PersistExample() {
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

function ActionsExample() {
	const { toast, dismiss } = useToast()

	const handleClick = () => {
		const id = crypto.randomUUID()

		const handleUndo = () => {
			dismiss({ id })

			toast({ title: 'Action undone', severity: 'success' })
		}

		toast({
			id,
			title: 'Message deleted',
			description: 'The message has been removed.',
			severity: 'success',
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

// `useToast` requires a `ToastProvider` ancestor and a `<Toast />` viewport to
// render the queue — neither shows up when the deriver walks an `<Example>`'s
// children, so these snippets are authored. The viewport is portalled, so it
// can sit anywhere inside the provider; mount one per app.
const SETUP_CODE = code`
	import { ToastProvider, useToast } from 'ui/providers/toast'
	import { Toast } from 'ui/toast'
	import { Button } from 'ui/button'

	function App() {
		return (
			<ToastProvider>
				{/* your app */}
				<Page />
				<Toast />
			</ToastProvider>
		)
	}

	function Page() {
		const { toast } = useToast()

		return <Button color="blue" onClick={() => toast({ title: 'Event created' })}>Show toast</Button>
	}
`

const SEVERITY_CODE = code`
	import { useToast } from 'ui/providers/toast'

	const { toast } = useToast()

	// severity defaults to 'default'; also 'secondary' | 'success' | 'warning' | 'error'
	toast({ title: 'Saved', description: 'Your changes have been saved.', severity: 'success' })
`

const PERSIST_CODE = code`
	import { useToast } from 'ui/providers/toast'

	const { toast } = useToast()

	// Persisted toasts ignore the auto-dismiss timer and stay until dismissed.
	toast({ title: 'Attention:', description: 'This toast will stay until dismissed.', persist: true })
`

const ACTIONS_CODE = code`
	import { useToast } from 'ui/providers/toast'
	import { Button } from 'ui/button'

	const { toast, dismiss } = useToast()

	const id = crypto.randomUUID()

	toast({
		id,
		title: 'Message deleted',
		description: 'The message has been removed.',
		severity: 'success',
		duration: 7000,
		actions: (
			<Button
				color="amber"
				onClick={() => {
					dismiss({ id })
					toast({ title: 'Action undone', severity: 'success' })
				}}
			>
				Undo
			</Button>
		),
	})
`

export function Demo() {
	return (
		<ToastProvider>
			<Stack gap="xl">
				<Example title="Setup" code={SETUP_CODE}>
					<BasicExample />
				</Example>

				<Example title="Severity" code={SEVERITY_CODE}>
					<SeverityExample />
				</Example>

				<Example title="Persist" code={PERSIST_CODE}>
					<PersistExample />
				</Example>

				<Example title="With action" code={ACTIONS_CODE}>
					<ActionsExample />
				</Example>
			</Stack>
			<Toast />
		</ToastProvider>
	)
}
