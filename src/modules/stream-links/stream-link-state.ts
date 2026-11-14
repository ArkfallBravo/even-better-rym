// ----------------------------------------------------------------------- //
//
// MODULE  : stream-link-state.ts
//
// PURPOSE : Choosing between RYM's streaming link and an autofound one
//
// CREATED : 11/14/2026
//
// ----------------------------------------------------------------------- //

import type { Searchable, Service } from "~/shared/services/types";
import { parseError } from "~/shared/utils/error";
import type { OneShot } from "~/shared/utils/one-shot";
import { complete, failed } from "~/shared/utils/one-shot";

import type { PageData } from "./use-page-data";

export type StreamLinkState = OneShot<Error, StreamLinkCompleteState>;
type StreamLinkCompleteState =
	| { _tag: "exists" | "found"; url: string }
	| { _tag: "not-found" };

// Returns RYM's link for a service, or a search result when RYM has none or
// none of its links is upvoted in the user's region.
export async function getStreamLinkState(
	service: Service & Searchable,
	releaseData: PageData,
): Promise<StreamLinkState> {
	const existingLink = releaseData.links[service.id];
	const hasUpvotedLink = !releaseData.servicesWithoutUpvotedLink.includes(
		service.id,
	);
	if (existingLink !== undefined && hasUpvotedLink) {
		return complete({ _tag: "exists", url: existingLink });
	}

	try {
		const foundLink = await service.search(releaseData.metadata);
		if (foundLink !== undefined) {
			return complete({ _tag: "found", url: foundLink });
		}
		return existingLink === undefined
			? complete({ _tag: "not-found" })
			: complete({ _tag: "exists", url: existingLink });
	} catch (error: unknown) {
		return existingLink === undefined
			? failed(parseError(error))
			: complete({ _tag: "exists", url: existingLink });
	}
}
