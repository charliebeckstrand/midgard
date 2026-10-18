import { defineMessages } from '../../primitives/intl/intl-messages'
import type { MessageSet } from '../../primitives/intl/types'

// The values of each file-upload message, by key.
type FileUploadValues = {
	upload: Record<never, never>
	uploadFile: Record<never, never>
	reset: Record<never, never>
	dropClick: Record<never, never>
	dropTap: Record<never, never>
	chooseDifferent: Record<never, never>
	chooseFile: Record<never, never>
	clear: { count: number }
	browse: Record<never, never>
	selected: { count: number }
	announced: { count: number; names: string }
}

/**
 * The messages of the file-upload controls: the labels and names of their
 * triggers, the prompt of the drop zone, the selection summary, and the
 * live-region text of a selection.
 *
 * @internal
 */
export const fileUploadMessages: MessageSet<FileUploadValues> = defineMessages<FileUploadValues>({
	upload: {
		id: 'ui.fileUpload.upload',
		defaultMessage: 'Upload',
		description: 'The label of the button that opens the file picker.',
	},
	uploadFile: {
		id: 'ui.fileUpload.uploadFile',
		defaultMessage: 'Upload file',
		description: 'The name of the file input of a drop zone.',
	},
	reset: {
		id: 'ui.fileUpload.reset',
		defaultMessage: 'Reset',
		description: 'The label of the button that clears the selected files.',
	},
	dropClick: {
		id: 'ui.fileUpload.dropClick',
		defaultMessage: 'Drop files here or click to browse',
		description: 'The prompt of an empty drop zone on a device with a mouse.',
	},
	dropTap: {
		id: 'ui.fileUpload.dropTap',
		defaultMessage: 'Drop files here or tap to browse',
		description: 'The prompt of an empty drop zone on a touch device.',
	},
	chooseDifferent: {
		id: 'ui.fileUpload.chooseDifferent',
		defaultMessage: 'Choose a different file',
		description:
			'The name of the drop zone after a selection. A press opens the file picker again.',
	},
	chooseFile: {
		id: 'ui.fileUpload.chooseFile',
		defaultMessage: 'Choose a file',
		description: 'The placeholder of an empty file field.',
	},
	clear: {
		id: 'ui.fileUpload.clear',
		defaultMessage: '{count, plural, one {Clear selected file} other {Clear selected files}}',
		description: 'The name of the button that clears the selected files of a file field.',
	},
	browse: {
		id: 'ui.fileUpload.browse',
		defaultMessage: 'Browse files',
		description: 'The name of the button that opens the file picker of a file field.',
	},
	selected: {
		id: 'ui.fileUpload.selected',
		defaultMessage: '{count, plural, one {# file selected} other {# files selected}}',
		description: 'The summary of a selection of more than one file.',
	},
	announced: {
		id: 'ui.fileUpload.announced',
		defaultMessage: '{count, plural, one {Selected {names}} other {Selected # files: {names}}}',
		description:
			'Spoken when the reader selects files. The names are the file names, joined by commas.',
	},
})
