import { Code } from 'ui/code'
import { CopyButton, type CopyButtonProps } from 'ui/copy-button'

const link = 'https://example.com/invite/7f3k9q'

export default function CopyButtonPlayground(props: CopyButtonProps) {
	return (
		<>
			<Code>{link}</Code>
			<CopyButton {...props} text={link} aria-label="Copy invite link" />
		</>
	)
}
