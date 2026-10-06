import { Button } from 'ui/button'
import { Heading, type HeadingLevel } from 'ui/heading'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

/**
 * Shows in place of a part of the docs that fails to render, with a button
 * that reloads the page. In the shell, the header holds the `h1` of the page,
 * so the error takes `level` 2. In place of the shell, it takes `level` 1.
 */
export function PageError({ level }: { level: HeadingLevel }) {
	return (
		<Stack gap="md" className="p-6">
			<Heading level={level}>Could not load this page</Heading>
			<Text tone="muted">Reload the page to try again.</Text>
			<div>
				<Button variant="outline" onClick={() => location.reload()}>
					Reload
				</Button>
			</div>
		</Stack>
	)
}
