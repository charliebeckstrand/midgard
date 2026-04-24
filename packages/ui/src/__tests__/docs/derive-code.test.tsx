import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { deriveCode } from '../../docs/derive-code'

describe('deriveCode + __code', () => {
	it('renders the helper function snippet verbatim and infers imports', () => {
		function AreaDemo() {
			return null
		}

		;(AreaDemo as unknown as { __code: string }).__code = [
			'function AreaDemo() {',
			'\tconst [files, setFiles] = useState<File[]>([])',
			'',
			'\treturn (',
			'\t\t<Sizer>',
			'\t\t\t<FileUpload accept="image/*" onFiles={setFiles} />',
			'\t\t</Sizer>',
			'\t)',
			'}',
		].join('\n')

		const result = deriveCode(createElement(AreaDemo))

		expect(result).not.toBeNull()

		// Whole function body preserved verbatim (at column 0 for the outer <Example>).
		expect(result).toContain(
			'function AreaDemo() {\n\tconst [files, setFiles] = useState<File[]>([])',
		)
		expect(result).toContain('<FileUpload accept="image/*" onFiles={setFiles} />')

		// UI component imports scanned from the JSX.
		expect(result).toMatch(/import \{.*Sizer.*\} from 'ui\/sizer'/)
		expect(result).toMatch(/import \{.*FileUpload.*\} from 'ui\/file-upload'/)

		// React hook imports scanned from the body.
		expect(result).toMatch(/import \{.*useState.*\} from 'react'/)
	})
})
