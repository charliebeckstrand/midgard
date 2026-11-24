import { Example } from '../../../../kit/index.ts'
import Default from './default.tsx'
import Streaming from './streaming.tsx'
import WithActions from './with-actions.tsx'
import WithAttachments from './with-attachments.tsx'
import WithWysiwyg from './with-wysiwyg.tsx'

export default function PromptTab() {
	return (
		<>
			<Example of={Default} />
			<Example of={WithActions} />
			<Example of={WithAttachments} />
			<Example of={WithWysiwyg} />
			<Example of={Streaming} />
		</>
	)
}
