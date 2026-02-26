import { browser } from '$app/environment';

class GlobalState {
	hydrated = $state(false);

	constructor() {
		if (browser) {
			requestAnimationFrame(() => {
				this.hydrated = true;
			});
		}
	}
}

export const globalState = new GlobalState();
