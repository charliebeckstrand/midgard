import { Button } from 'ui/button'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

/** Shows in place of a part of the docs that fails to render, with a button that reloads the page. */
export function PageError() {
	return (
		<Stack gap="md" className="p-6">
			<Heading>Could not load this page</Heading>
			<Text tone="muted">Reload the page to try again.</Text>
			<div>
				<Button variant="outline" onClick={() => location.reload()}>
					Reload
				</Button>
			</div>
		</Stack>
	)
}
