import { CodeBlock } from 'ui/code'

const snippet = `
import { Button } from 'ui/button'

export function Example() {
	return <Button color="blue">Click me</Button>
}
`

export default function CodeBlockExample() {
	return <CodeBlock code={snippet} />
}
