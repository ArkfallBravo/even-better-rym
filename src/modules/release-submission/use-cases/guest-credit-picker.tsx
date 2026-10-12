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
import { useEffect, useState } from "preact/hooks";

import type { ResolveData } from "~/shared/services/types";
import { waitForElement } from "~/shared/utils/dom";

import { buildArtistToken } from "../utils/artist-shortcuts";
import { addCreditLine, removeCreditLine } from "../utils/credit-lines";
import type { GuestArtist, GuestChoice } from "../utils/guest-credits";
import {
	describeGuestChoice,
	formatCreditTracks,
	GUEST_ROLE,
	getGuestArtists,
} from "../utils/guest-credits";
import { closeShortcutPopup } from "../utils/page-functions";
import {
	continueArtistSearch,
	startArtistSearch,
	watchArtistResultClicks,
} from "../utils/shortcut-popup";
import { isVariousArtistsRelease } from "../utils/track-artist-links";
import { PickerButton, PickerRow } from "./picker-row";
import { useImportSession } from "./use-import-session";

const PICKER_ID = "ebr-guest-credit-picker";

export default async function injectGuestCreditPicker() {
	const credits = await waitForElement("#creditsx");
	const container = document.createElement("div");
	credits.after(container);
	render(<GuestCreditPicker />, container);
}

// Returns the guests to credit for an import, or undefined on a Various
// Artists release, whose tracks are linked to their own artists instead.
function getGuestSession(data: ResolveData): GuestArtist[] | undefined {
	const releaseArtists = data.artists ?? [];
	const tracks = data.tracks ?? [];
	if (isVariousArtistsRelease(releaseArtists)) {
		return undefined;
	}
	const guests = getGuestArtists(tracks, releaseArtists);
	return guests.length === 0 ? undefined : guests;
}

// Removes the credit line a guest's choice added, if any.
function removeChoiceCredit(choice: GuestChoice | undefined): void {
	if (choice !== undefined && choice.kind !== "skipped") {
		removeCreditLine(choice.line);
	}
}

// Credits the guest on their tracks, linked to the RYM artist id or as plain
// text when there is none, and returns the credit line's number.
function addGuestCredit(
	guest: GuestArtist,
	id: string | undefined,
): string | undefined {
	return addCreditLine({
		id,
		name: guest.name,
		role: GUEST_ROLE,
		tracks: formatCreditTracks(guest.positions),
	});
}

function GuestCreditPicker() {
	const { count, session } = useImportSession(getGuestSession);
	if (session === undefined) {
		return null;
	}
	return <GuestCreditPanel key={count} guests={session} />;
}

type GuestCreditPanelProps = {
	guests: GuestArtist[];
};

function GuestCreditPanel({ guests }: Readonly<GuestCreditPanelProps>) {
	const [activeName, setActiveName] = useState<string | undefined>();
	const [choices, setChoices] = useState(new Map<string, GuestChoice>());

	useEffect(() => {
		const guest = guests.find(({ name }) => name === activeName);
		if (guest === undefined) {
			return undefined;
		}
		return watchArtistResultClicks((assocId) => {
			removeChoiceCredit(choices.get(guest.name));
			const nextChoices = new Map(choices).set(guest.name, {
				kind: "linked",
				token: buildArtistToken(assocId),
				line: addGuestCredit(guest, assocId),
			});
			const nextName = guests.find(({ name }) => !nextChoices.has(name))?.name;
			setChoices(nextChoices);
			setActiveName(nextName);
			continueArtistSearch(PICKER_ID, nextName);
		});
	}, [guests, choices, activeName]);

	const handleLink = (name: string) => {
		setActiveName(name);
		startArtistSearch(PICKER_ID, name);
	};
	const setChoice = (guest: GuestArtist, choice: GuestChoice) => {
		setChoices(new Map(choices).set(guest.name, choice));
		if (guest.name === activeName) {
			setActiveName(undefined);
			closeShortcutPopup();
		}
	};
	const handleText = (guest: GuestArtist) => {
		removeChoiceCredit(choices.get(guest.name));
		setChoice(guest, { kind: "text", line: addGuestCredit(guest, undefined) });
	};
	const handleSkip = (guest: GuestArtist) => {
		removeChoiceCredit(choices.get(guest.name));
		setChoice(guest, { kind: "skipped" });
	};

	return (
		<div id={PICKER_ID} style={{ marginTop: "1em" }}>
			<b>Guest credits</b>
			{guests.map((guest) => (
				<PickerRow
					key={guest.name}
					name={guest.name}
					status={describeGuestChoice(guest, choices.get(guest.name))}
					active={guest.name === activeName}
				>
					<PickerButton value="Link" onClick={() => handleLink(guest.name)} />
					<PickerButton value="Text" onClick={() => handleText(guest)} />
					<PickerButton value="Skip" onClick={() => handleSkip(guest)} />
				</PickerRow>
			))}
		</div>
	);
}
