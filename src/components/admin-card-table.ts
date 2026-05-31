import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

/**
 * Freelight-style card list. Renders entity rows as cards with an
 * optional sub-line and right-side actions.
 *
 * Three modes for "click a row":
 *   1. hot-row_edit_id="<panel id>"  — accordion edit (recommended)
 *      Click a row → the named <admin-row-edit> slides open beneath
 *      it with the row's data pre-filled. No modal, no page nav.
 *   2. hot-detail_route="/budget?id=:id" — navigation
 *      Whole row is an <a> to the configured URL. Use for entities
 *      whose full edit lives on its own page.
 *   3. neither — read-only list. The caller can still provide inline
 *      action buttons via hot-row_actions.
 *
 * Exposes a `.refreshList()` method on the rendered DOM element so
 * the paired admin-add-panel / admin-row-edit can trigger a fresh
 * fetch after a write.
 *
 * Usage (accordion mode):
 *   <admin-card-table id="bankAccountsList"
 *                     hot-list_url=".../v1/bank_accounts/list"
 *                     hot-primary_field="name"
 *                     hot-subline_field="bankSyncAPIType"
 *                     hot-row_edit_id="bankAccountsEdit"
 *                     hot-empty_text="No bank accounts yet."></admin-card-table>
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
	/** Pattern for the row's click target. ":id" interpolates row.id. When set, rows are <a> links. */
	detail_route: string;
	/** The id of an <admin-row-edit> to open when a row is clicked (accordion mode). */
	row_edit_id: string;
	/** Text shown when the list is empty. */
	empty_text: string;
	/** Text shown while the list is loading. */
	loading_text: string;
	/** Inner HTML template for the right-side action area, with ":id" placeholder. */
	row_actions: string;
	/** Slot name where the partner admin-add-panel injects its toggle button. */
	add_slot: string;

	/** Rows from the latest fetch, indexed by id. Used by accordion-mode click. */
	protected rowsById: { [id: string]: any } = {};

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
		this.row_edit_id   = "";
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

		(container as any).refreshList = function () { return self.fetchAndRender (); };

		// Delegated click handler for accordion mode. Lives on the
		// card-list container so it survives re-renders.
		if (this.row_edit_id !== "")
		{
			const list = container.querySelector (".fl-card-list") as HTMLElement | null;
			if (list != null)
			{
				list.addEventListener ("click", (e) =>
					{
						const target = e.target as HTMLElement;
						// Scope `.fl-card-row` lookup to OUR list — otherwise
						// when two card-tables share a row-edit and the editor
						// is currently parented inside the OTHER list, clicks
						// inside the editor will closest() up to that other
						// list's row, look the id up in OUR rowsById (miss),
						// and silently bail. Restricting closest() to this
						// list keeps each card-table's handler authoritative
						// over its own rows.
						let row = target.closest (".fl-card-row") as HTMLElement | null;
						if (row != null && !list.contains (row)) row = null;
						if (row == null) return;
						// Don't fire on a click inside the actions area
						// (e.g. an inline action button has its own handler).
						if (target.closest (".fl-card-row-actions") != null) return;
						e.preventDefault ();
						const id = row.getAttribute ("data-row-id");
						if (id == null || id === "")
						{
							console.warn (`[admin-card-table:${self.name}] row clicked but data-row-id missing`, row);
							return;
						}
						const rowData = self.rowsById[id];
						if (rowData == null)
						{
							console.warn (`[admin-card-table:${self.name}] data-row-id="${id}" not in rowsById (size=${Object.keys (self.rowsById).length})`, row);
							return;
						}
						const editor: any = document.getElementById (self.row_edit_id);
						if (editor == null || typeof editor.openForRow !== "function") return;
						editor.openForRow (rowData, row, self.name);
					});
			}
		}

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

			// Cache by id for the accordion-mode click handler.
			this.rowsById = {};
			rows.forEach ((r) => { if (r && r.id) this.rowsById[r.id] = r; });

			// CRITICAL: close the editor BEFORE rewriting the list's
			// innerHTML, but only if it's actually parented inside OUR
			// list — otherwise two card-tables that share a row-edit
			// (e.g. /proposals drafts + accepted) will keep slamming the
			// editor closed every time the partner list re-fetches, and
			// the user sees only the first click "work" before the
			// partner's fetch resolves and yanks the editor out from
			// under them.
			if (this.row_edit_id !== "")
			{
				const editor: any = document.getElementById (this.row_edit_id);
				if (editor != null && list.contains (editor)
					&& typeof editor.closeEditor === "function")
				{
					editor.closeEditor ();
				}
			}

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

		// Mode 1: accordion edit. Whole row is a button-like div with
		// data-row-id; the delegated click handler in onPostPlace
		// opens the paired admin-row-edit.
		if (this.row_edit_id !== "")
		{
			return `<div class="fl-card-row fl-card-row-clickable list-group-item list-group-item-action" data-row-id="${this.escapeHtml (row.id || "")}" role="button" tabindex="0">${inner}</div>`;
		}
		// Mode 2: navigate to a detail page.
		if (this.detail_route)
		{
			const href = this.interpolate (this.detail_route, row);
			return `<a href="${href}" class="fl-card-row fl-card-row-link list-group-item list-group-item-action">${inner}</a>`;
		}
		// Mode 3: read-only row.
		return `<div class="fl-card-row list-group-item">${inner}</div>`;
	}

	output (): string | HotComponentOutput[]
	{
		if (this.name === "")
			throw new Error ("admin-card-table: id (name) is required");
		if (this.list_url === "")
			throw new Error ("admin-card-table: hot-list_url is required");

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
