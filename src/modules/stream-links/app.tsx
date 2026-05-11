import { render } from "preact";

import { waitForElement } from "~/shared/utils/dom";

import { StreamLinks } from "./stream-links";

export const main = async () => {
	const app = document.createElement("div");
	app.id = "even-better-rym";

	const isVisible = (el: HTMLElement) => el.offsetParent !== null;

	let mounted = false;
	try {
		const siblingElement = await waitForElement<HTMLElement>(
			'.hide-for-small a[href^="buy"]',
		);
		if (isVisible(siblingElement)) {
			siblingElement.after(app);
			mounted = true;
		}
	} catch {
		// fall through to mobile branch
	}

	if (!mounted) {
		// Mobile: pick the visible `#media_link_button_container_top`. RYM ships
		// two of them (one in each column); the desktop one lives in a sidebar
		// that's hidden on small screens, so anchor to whichever is actually
		// laid out.
		await waitForElement("#media_link_button_container_top");
		const containers = document.querySelectorAll<HTMLElement>(
			"#media_link_button_container_top",
		);
		const visible =
			Array.from(containers).find((el) => el.offsetParent !== null) ??
			containers[containers.length - 1];

		if (visible) {
			visible.before(app);
		} else {
			const siblingElement = await waitForElement(".page_release_art_frame");
			siblingElement.after(app);
		}
	}

	render(<StreamLinks />, app);
};
