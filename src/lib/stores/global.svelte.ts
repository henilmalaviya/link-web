import { browser } from '$app/environment';
import { PersistedState } from 'runed';

export type Workspace = {
	name: string;
	secret: string;
};

export type Link = {
	shortId: string;
	secret: string;
	workspaceName: string | null;
};

class User {
	workspaces = new PersistedState<Workspace[]>('workspaces', []);
	links = new PersistedState<Link[]>('links', []);
	currentWorkspaceName = new PersistedState<string | null>('currentWorkspace', null);
	currentWorkspaceSecret = $derived.by(() => {
		if (!this.currentWorkspaceName.current) return null;
		const workspace = this.workspaces.current.find(
			(w) => w.name === this.currentWorkspaceName.current
		);
		return workspace ? workspace.secret : null;
	});
	isWorkspaceSelected = $derived(this.currentWorkspaceName.current !== null);

	addWorkspace(name: string, secret: string) {
		this.workspaces.current = [...this.workspaces.current, { name, secret }];
	}

	removeWorkspace(name: string) {
		this.workspaces.current = this.workspaces.current.filter((w) => w.name !== name);
		if (this.currentWorkspaceName.current === name) {
			this.currentWorkspaceName.current = null;
		}
	}

	setCurrentWorkspace(name: string | null) {
		this.currentWorkspaceName.current = name;
	}

	addLink(shortId: string, secret: string, workspaceName: string | null) {
		this.links.current = [...this.links.current, { shortId, secret, workspaceName }];
	}

	removeLink(shortId: string) {
		this.links.current = this.links.current.filter((l) => l.shortId !== shortId);
	}

	getLink(shortId: string): Link | undefined {
		return this.links.current.find((l) => l.shortId === shortId);
	}
}

export const user = new User();

class Hydration {
	current = $state(false);

	constructor() {
		if (browser) {
			requestAnimationFrame(() => {
				this.current = true;
			});
		}
	}
}

export const isHydrated = new Hydration();
