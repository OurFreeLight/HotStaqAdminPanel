import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

/**
 * Freelight-style card list. Renders campaign / project / member rows
 * as cards on every viewport, with optional inline action buttons and
 * a sub-line below the primary label.
 *
 * Replaces the click-row-opens-modal flow of <admin-table> + <admin-edit>:
 * when `hot-detail-route` is set, the whole row becomes a link to the
 * configured detail URL (e.g. "/budget/:id"). When `hot-detail-route` is
 * empty, the row renders without navigation — the caller is expected to
 * provide their own inline action buttons via `hot-row-actions`.
 *
 * Usage:
 *   <admin-card-table id="bankAccountsList" hot-list-url="/v1/bank_accounts/list"
 *                     hot-detail-route="/bankAccount/:id"
 *                     hot-primary-field="name" hot-subline-field="bankSyncAPIType"
 *                     hot-empty-text="No bank accounts yet.">
 *   </admin-card-table>
 *
 * The component exposes a `.refreshList()` method on the rendered DOM
 * element so callers (the paired admin-add-panel, an edit-save callback,
 * etc.) can re-fetch without a page reload.
 */
export class AdminCardTable extends HotComponent
{
	/** Optional title shown in the card header. */
	title: string;
	/** Endpoint that returns { length, data: [...] } — usually the entity's list route. */
	list_url: string;
	/** JWT token to send as Authorization bearer. Empty for public endpoints. */
	jwt: string;
	/** Body params to POST with the list call (JSON). */
	list_params: string;
	/** Field name on each row used as the primary card label (default "name"). */
	primary_field: string;
	/** Optional second-line field rendered in muted text under the primary label. */
	subline_field: string;
	/** Pattern for the row's click target. ":id" interpolates row.id. Empty disables row navigation. */
	detail_route: string;
	/** Text shown when the list is empty. */
	empty_text: string;
	/** Text shown while the list is loading. */
	loading_text: string;
	/** Inner HTML template for the right-side action area, with ":id" placeholder. */
	row_actions: string;
	/** Slot name where the partner admin-add-panel injects its toggle button. */
	add_slot: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag           = "admin-card-table";
		this.title         = "";
		this.list_url      = "";
		this.jwt           = "";
		this.list_params   = "{}";
		this.primary_field = "name";
		this.subline_field = "";
		this.detail_route  = "";
		this.empty_text    = "No items yet.";
		this.loading_text  = "Loading…";
		this.row_actions   = "";
		this.add_slot      = "";
	}

	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		const self = this;
		const container = document.getElementById (this.name);
		if (container == null)
			return (null);

		// Expose a refreshList() method on the rendered element so the
		// partner add-panel (and any other caller) can re-fetch when a
		// row changes.
		(container as any).refreshList = function () { return self.fetchAndRender (); };

		// Initial load.
		self.fetchAndRender ();

		return (null);
	}

	protected async fetchAndRender (): Promise<void>
	{
		const container = document.getElementById (this.name);
		const list = container ? container.querySelector (".fl-card-list") as HTMLElement : null;
		if (list == null) return;

		try
		{
			let payload: any = {};
			try { payload = JSON.parse (this.list_params || "{}"); } catch (e) { payload = {}; }

			const headers: any = { "Content-Type": "application/json" };
			if (this.jwt) headers["Authorization"] = "Bearer " + this.jwt;

			const res = await fetch (this.list_url, {
				method: "POST", headers: headers, body: JSON.stringify (payload)
			});

			if (!res.ok)
			{
				list.innerHTML = `<div class="text-danger small p-3">Could not load: HTTP ${res.status}</div>`;
				return;
			}

			const result = await res.json ();
			const rows: any[] = (result && Array.isArray (result.data)) ? result.data : (Array.isArray (result) ? result : []);

			if (rows.length === 0)
			{
				list.innerHTML = `<div class="text-muted small text-center py-4">${this.empty_text}</div>`;
				return;
			}

			list.innerHTML = rows.map ((row) => this.renderRow (row)).join ("");
		}
		catch (ex)
		{
			list.innerHTML = `<div class="text-danger small p-3">Could not load: ${(ex as Error).message}</div>`;
		}
	}

	protected escapeHtml (s: any): string
	{
		return String (s == null ? "" : s)
			.replace (/&/g, "&amp;").replace (/</g, "&lt;").replace (/>/g, "&gt;")
			.replace (/"/g, "&quot;").replace (/'/g, "&#39;");
	}

	protected interpolate (template: string, row: any): string
	{
		if (!template) return "";
		return template.replace (/:(\w+)/g, (_m, key) => this.escapeHtml (row[key] || ""));
	}

	protected renderRow (row: any): string
	{
		const primaryRaw = row[this.primary_field];
		const primary = this.escapeHtml (primaryRaw != null && primaryRaw !== "" ? primaryRaw : (row.id || ""));
		const sublineRaw = this.subline_field ? row[this.subline_field] : "";
		const subline = sublineRaw ? `<div class="fl-card-row-sub text-muted small">${this.escapeHtml (sublineRaw)}</div>` : "";

		const inner = `
			<div class="fl-card-row-main">
				<div class="fl-card-row-label">${primary}</div>
				${subline}
			</div>
			<div class="fl-card-row-actions">${this.interpolate (this.row_actions, row)}</div>`;

		if (this.detail_route)
		{
			const href = this.interpolate (this.detail_route, row);
			return `<a href="${href}" class="fl-card-row fl-card-row-link list-group-item list-group-item-action">${inner}</a>`;
		}
		return `<div class="fl-card-row list-group-item">${inner}</div>`;
	}

	output (): string | HotComponentOutput[]
	{
		if (this.name === "")
			throw new Error ("admin-card-table: id (name) is required");
		if (this.list_url === "")
			throw new Error ("admin-card-table: hot-list-url is required");

		const titleHtml = this.title ? `<strong>${this.title}</strong>` : "";
		const addSlotAttr = this.add_slot ? ` data-card-table-add-slot="${this.add_slot}"` : ` data-card-table-add-slot="${this.name}"`;

		return (`
			<div id="${this.name}" class="card fl-card-table mb-4">
				<div class="card-header d-flex justify-content-between align-items-center">
					${titleHtml}
					<div class="fl-card-table-actions"${addSlotAttr}></div>
				</div>
				<div class="fl-card-list list-group list-group-flush">
					<div class="text-muted small text-center py-4">${this.loading_text}</div>
				</div>
			</div>`);
	}
}
