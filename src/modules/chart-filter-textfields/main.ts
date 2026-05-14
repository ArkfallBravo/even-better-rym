import { runPage } from "~/shared/page-settings";

import { main } from "./app";

await runPage("chartFilterTextfields", async () => {
	await main();
});
