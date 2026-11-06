// ----------------------------------------------------------------------- //
//
// MODULE  : guest-credit-picker.tsx
//
// PURPOSE : Panel for picking each imported guest artist's RYM link and
//           crediting them as a guest on their tracks
//
// CREATED : 10/12/2026
//
// ----------------------------------------------------------------------- //

import { render } from "preact";
import { waitForElement } from "~/shared/utils/dom";
import { ArtistAssociationsProvider } from "./artist-associations";
import { CreditPickers } from "./credit-pickers";

export default async function injectGuestCreditPicker() {
	const credits = await waitForElement("#creditsx");
	const container = document.createElement("div");
	container.style.clear = "both";
	container.style.paddingTop = "0.5em";
	credits.after(container);
	render(
		<ArtistAssociationsProvider>
			<CreditPickers />
		</ArtistAssociationsProvider>,
		container,
	);
}
