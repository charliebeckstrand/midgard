// The message parser of FormatJS without its parser. The Next build of each app
// gives this module in place of `@formatjs/icu-messageformat-parser` (the
// `turbopack.resolveAlias` of `appConfig` in `auth`), because the message
// loader (`scripts/intl-loader.ts`) gives each message precompiled. The types
// and the guards stay, and `parse` throws. The list holds each value that the
// `no-parser` entry exports.
export {
	_Parser,
	createLiteralElement,
	createNumberElement,
	isArgumentElement,
	isDateElement,
	isDateTimeSkeleton,
	isLiteralElement,
	isNumberElement,
	isNumberSkeleton,
	isPluralElement,
	isPoundElement,
	isSelectElement,
	isStructurallySame,
	isTagElement,
	isTimeElement,
	parse,
	SKELETON_TYPE,
	TYPE,
} from '@formatjs/icu-messageformat-parser/no-parser.js'
