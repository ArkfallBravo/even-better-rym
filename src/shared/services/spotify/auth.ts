// ----------------------------------------------------------------------- //
//
// MODULE  : auth.ts
//
// PURPOSE : Spotify Web API client-credentials token request
//
// CREATED : 2/16/2021
//
// ----------------------------------------------------------------------- //

import { fetch } from "~/shared/utils/fetch";
import type { FetchRequest } from "~/shared/utils/messaging";

import type { TokenResponse } from "./codecs";

const client_id = import.meta.env.VITE_SPOTIFY_ID as string;
const client_secret = import.meta.env.VITE_SPOTIFY_SECRET as string;

export const tokenRequest: FetchRequest["data"] = {
	method: "POST",
	url: "https://accounts.spotify.com/api/token",
	body: "grant_type=client_credentials",
	headers: {
		Authorization: `Basic ${btoa([client_id, client_secret].join(":"))}`,
		"Content-Type": "application/x-www-form-urlencoded",
	},
};

export const requestToken = async (): Promise<TokenResponse> =>
	JSON.parse(await fetch(tokenRequest)) as TokenResponse;
