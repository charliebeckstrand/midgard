type Props = { pending: boolean }

export function SubmitButton({ pending }: Props) {
	return (
		<button type="submit" disabled={pending}>
			{pending ? 'Saving…' : 'Save'}
		</button>
	)
}
