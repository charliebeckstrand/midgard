import { ROOT_REDUCED_MOTION_CLASS } from '../../../../core/motion/root'
import { REDUCED_MOTION_QUERY } from '../../../../utilities/media-query'

// The `reduced-motion` instance of `vitest.browser.config.ts` opens its page
// for a reader who asks for reduced motion (`REDUCED_MOTION_CONTEXT_OPTIONS`).
// Each case of `browser/reduced-motion/` reads the result of the platform
// setting. If the page does not ask for reduced motion, those cases read full
// motion, and a case that checks a result of full motion could pass. If the
// root has the class of the Motion setting, the class reduces the motion, and
// the platform path goes untested. This guard stops the file before its first
// case in each of the two conditions.
if (!matchMedia(REDUCED_MOTION_QUERY).matches) {
	throw new Error(
		`The reduced-motion suite expects a page that matches ${REDUCED_MOTION_QUERY}. ` +
			'Run the files of `browser/reduced-motion/` in the `reduced-motion` instance ' +
			'(`pnpm test:reduced-motion`), whose page has `reducedMotion: reduce` ' +
			'(`REDUCED_MOTION_CONTEXT_OPTIONS` in `vitest.browser.config.ts`).',
	)
}

if (document.documentElement.classList.contains(ROOT_REDUCED_MOTION_CLASS)) {
	throw new Error(
		`The root has the \`${ROOT_REDUCED_MOTION_CLASS}\` class of the Motion setting. ` +
			'A case of `browser/reduced-motion/` reads the platform setting only. ' +
			'Put a case of the Motion setting in another instance, with `holdRootClass`.',
	)
}
