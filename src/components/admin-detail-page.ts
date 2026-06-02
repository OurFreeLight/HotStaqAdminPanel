import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";
import { populateFields, collectFieldValues } from "./field-io";

/**
 * Full-page detail chrome for an entity. Replaces the modal opened by
 * <admin-edit hot-type="edit"> with a dedicated page (e.g. /budget/:id)
 * that has its own back link, sections, and a sticky save bar at the
 * bottom.
 *
 * The page is responsible for placing <admin-form-field>s inside the
 * `<hot-place-here name="detailBody">` slot. This component handles:
 *   - reading ?id from the URL
 *   - GET'ing the entity via hot-get-url and populating form fields by
 *     matching hot-field names against the response keys
 *   - POST'ing values to hot-save-url on Save click
 *   - DELETE'ing via hot-delete-url on Delete click (with confirm)
 *   - showing a back link to hot-back-url
 *
 * Usage:
 *   <admin-detail-page name="budgetDetail"
 *                      hot-title="Budget"
 *                      hot-back-url="/budgets"
 *                      hot-back-text="← All budgets"
 *                      hot-get-url="/v1/budgets/get"
 *                      hot-save-url="/v1/budgets/edit"
 *                      hot-delete-url="/v1/budgets/delete"
 *                      hot-payload-key="budget"
 *                      hot-jwt="${jwtToken}">
 *     <admin-form-field hot-field="name" hot-label="Name" hot-required="1"></admin-form-field>
 *     ...
 *   </admin-detail-page>
 */
export class AdminDetailPage extends HotComponent
{
	/** Heading shown at the top of the page. */
	title: string;
	/** URL the back link points at. */
	back_url: string;
	/** Text on the back link. */
	back_text: string;
	/** GET-by-id endpoint. POSTed with { id: <id> }. */
	get_url: string;
	/** Edit/save endpoint. POSTed with { [payload_key]: { id, ...fields } }. */
	save_url: string;
	/** Optional delete endpoint. Hides the Delete button when blank. */
	delete_url: string;
	/** Wrapper key in the save payload (most DAO routes expect { budget: {...} } / { issue: {...} } etc). */
	payload_key: string;
	/** JWT bearer for the API calls. */
	jwt: string;
	/** URL query param that holds the entity id (default: "id"). */
	id_param: string;
	/** Save button text. */
	save_text: string;
	/** Delete button text. */
	delete_text: string;
	/** Confirmation prompt for delete. */
	delete_confirm: string;
	/** "1" / "true" → send {expanded: true} on the get fetch. Required for related-picker populates that need {id,name} objects, not bare ids. */
	expanded: string;
	/** "1" / "true" → omit the get fetch entirely (create-mode pages without an existing id). */
	skip_fetch: string;
	/** "1" / "true" → render the page in read-only / view-only mode (no save bar, all fields disabled). */
	readonly: string;
	/** When set (e.g. "name"), the page heading IS the editable field for that key. No separate H1 + duplicate form-field — the heading itself is the input. */
	title_field: string;
	/** Placeholder text for the title input when title_field is set. */
	title_placeholder: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag             = "admin-detail-page";
		this.title           = "";
		this.back_url        = "/";
		this.back_text       = "← Back";
		this.get_url         = "";
		this.save_url        = "";
		this.delete_url      = "";
		this.payload_key     = "";
		this.jwt             = "";
		this.id_param        = "id";
		this.save_text       = "Save";
		this.delete_text     = "Delete";
		this.delete_confirm  = "Are you sure you want to delete this?";
		this.expanded        = "0";
		this.skip_fetch      = "0";
		this.readonly        = "";
		this.title_field     = "";
		this.title_placeholder = "Untitled";
	}

	protected isTrue (s: string): boolean
	{
		return (s === "1" || s === "true");
	}

	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		const self = this;
		const page = document.getElementById (this.name);
		if (page == null) return (null);

		// Auto-relocate stray children into the .row.g-3 slot. The
		// framework appends children that lack `hot-place-parent` directly
		// under the root element. Move them inside the form body so they
		// don't render outside the card.
		const slot = page.querySelector (".fl-detail-page-body") as HTMLElement | null;
		if (slot != null)
		{
			Array.from (page.children).forEach ((child) =>
				{
					const el = child as HTMLElement;
					// Skip the chrome the component renders itself.
					if (el.classList.contains ("container")) return;
					if (el.classList.contains ("fl-detail-save-bar")) return;
					slot.appendChild (el);
				});
		}

		const id = self.readIdFromUrl ();
		const skipFetch = self.isTrue (self.skip_fetch);

		if (!id && !skipFetch)
		{
			self.showError (page, "No id provided in the URL.");
			return (null);
		}

		// Wire buttons.
		const saveBtn   = page.querySelector (".fl-detail-save") as HTMLButtonElement | null;
		const deleteBtn = page.querySelector (".fl-detail-delete") as HTMLButtonElement | null;

		if (saveBtn != null)
			saveBtn.addEventListener ("click", (e) => { e.preventDefault (); self.handleSave (page, id); });

		if (deleteBtn != null && id)
			deleteBtn.addEventListener ("click", (e) => { e.preventDefault (); self.handleDelete (id); });

		// Load existing record (skip when in create-mode).
		if (id && !skipFetch)
			self.fetchAndFill (page, id);
		else
			self.applyReadonly (page);

		return (null);
	}

	protected readIdFromUrl (): string
	{
		const params = new URLSearchParams (window.location.search);
		return params.get (this.id_param) || "";
	}

	protected showError (page: HTMLElement, msg: string): void
	{
		const fb = page.querySelector (".fl-detail-feedback") as HTMLElement | null;
		if (fb) { fb.className = "fl-detail-feedback alert alert-danger"; fb.textContent = msg; }
	}

	protected showSuccess (page: HTMLElement, msg: string): void
	{
		const fb = page.querySelector (".fl-detail-feedback") as HTMLElement | null;
		if (fb)
		{
			fb.className = "fl-detail-feedback alert alert-success";
			fb.textContent = msg;
			setTimeout (() => { fb.className = "fl-detail-feedback d-none"; fb.textContent = ""; }, 2500);
		}
	}

	protected async fetchAndFill (page: HTMLElement, id: string): Promise<void>
	{
		try
		{
			const headers: any = { "Content-Type": "application/json" };
			if (this.jwt) headers["Authorization"] = "Bearer " + this.jwt;
			const body: any = { id: id };
			if (this.isTrue (this.expanded)) body.expanded = true;
			const res = await fetch (this.get_url, {
				method: "POST", headers: headers, body: JSON.stringify (body)
			});
			if (!res.ok) { this.showError (page, "Could not load: HTTP " + res.status); return; }
			const obj = await res.json ();
			if (obj == null) { this.showError (page, "Record not found."); return; }
			populateFields (page, obj);
			this.applyReadonly (page);
		}
		catch (ex)
		{
			this.showError (page, "Could not load: " + (ex as Error).message);
		}
	}

	protected async handleSave (page: HTMLElement, id: string): Promise<void>
	{
		const values = collectFieldValues (page);
		if (id) values.id = id;
		const body: any = this.payload_key ? { [this.payload_key]: values } : values;

		const btn = page.querySelector (".fl-detail-save") as HTMLButtonElement | null;
		if (btn) btn.disabled = true;
		try
		{
			const headers: any = { "Content-Type": "application/json" };
			if (this.jwt) headers["Authorization"] = "Bearer " + this.jwt;
			const res = await fetch (this.save_url, {
				method: "POST", headers: headers, body: JSON.stringify (body)
			});
			if (!res.ok)
			{
				let msg = "HTTP " + res.status;
				try { const j = await res.json (); if (j && j.error) msg = j.error; } catch (e) {}
				this.showError (page, "Save failed: " + msg);
				return;
			}
			// Create flow: response body is the new id; navigate to the
			// canonical detail URL so subsequent saves are edits, not new
			// creates. Edit flow: stay put and flash a success indicator.
			if (!id)
			{
				let newId: string | null = null;
				try { const j = await res.json (); newId = (typeof j === "string") ? j : (j && j.id ? j.id : null); } catch (e) {}
				if (newId)
				{
					const url = new URL (window.location.href);
					url.searchParams.set (this.id_param, newId);
					window.location.href = url.toString ();
					return;
				}
			}
			this.showSuccess (page, "Saved.");
		}
		catch (ex)
		{
			this.showError (page, "Save failed: " + (ex as Error).message);
		}
		finally
		{
			if (btn) btn.disabled = false;
		}
	}

	protected async handleDelete (id: string): Promise<void>
	{
		if (!window.confirm (this.delete_confirm)) return;
		try
		{
			const headers: any = { "Content-Type": "application/json" };
			if (this.jwt) headers["Authorization"] = "Bearer " + this.jwt;
			const res = await fetch (this.delete_url, {
				method: "POST", headers: headers, body: JSON.stringify ({ id: id })
			});
			if (!res.ok) { alert ("Delete failed: HTTP " + res.status); return; }
			window.location.href = this.back_url;
		}
		catch (ex)
		{
			alert ("Delete failed: " + (ex as Error).message);
		}
	}

	/**
	 * Apply the current readonly state to every form input, Quill, and
	 * related-picker. Runs after fetchAndFill so the populated values
	 * stick before disabling.
	 */
	protected applyReadonly (page: HTMLElement): void
	{
		const ro = this.isTrue (this.readonly);
		const nodes = page.querySelectorAll ("[hot-field]");
		for (let i = 0; i < nodes.length; i++)
		{
			const el = nodes[i] as HTMLElement;
			if (el.classList.contains ("fl-admin-rich-text"))
			{
				const inner = el.querySelector (".fl-admin-rich-text-quill") as HTMLElement | null;
				const QuillRef = (window as any).Quill;
				if (inner != null && typeof QuillRef !== "undefined")
				{
					const q = QuillRef.find (inner);
					if (q != null && typeof q.enable === "function") q.enable (!ro);
				}
				const tb = el.querySelector (".ql-toolbar") as HTMLElement | null;
				if (tb != null) tb.style.display = ro ? "none" : "";
				continue;
			}
			if (el.classList.contains ("fl-admin-related-picker"))
			{
				const search = el.querySelector (".fl-arp-search") as HTMLInputElement | null;
				if (search != null) { search.disabled = ro; search.style.display = ro ? "none" : ""; }
				el.querySelectorAll (".fl-arp-chip-remove, .fl-arp-remove").forEach (
					(b) => { (b as HTMLElement).style.display = ro ? "none" : ""; });
				continue;
			}
			if (el.classList.contains ("fl-admin-approval-panel"))
			{
				el.style.display = ro ? "none" : "";
				continue;
			}
			if (el.classList.contains ("fl-admin-file-upload"))
			{
				const input = el.querySelector (".fl-afu-input") as HTMLInputElement | null;
				if (input != null) { input.disabled = ro; input.style.display = ro ? "none" : ""; }
				const clear = el.querySelector (".fl-afu-clear") as HTMLElement | null;
				if (clear != null) clear.style.display = ro ? "none" : "";
				continue;
			}
			if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)
				el.disabled = ro;
		}
	}

	output (): string | HotComponentOutput[]
	{
		if (this.name === "")
			throw new Error ("admin-detail-page: id (name) is required");
		const ro = this.isTrue (this.readonly);
		if (this.save_url === "" && !ro)
			throw new Error ("admin-detail-page: hot-save_url is required");
		if (this.get_url === "" && !this.isTrue (this.skip_fetch))
			throw new Error ("admin-detail-page: hot-get_url is required unless hot-skip_fetch=1");

		const deleteBtn = this.delete_url
			? `<button type="button" class="btn btn-outline-danger fl-detail-delete">${this.delete_text}</button>`
			: "";

		// In readonly mode, omit the entire save bar (no save, no delete).
		const saveBar = ro
			? ""
			: `<div class="fl-detail-save-bar">
					<div class="container d-flex justify-content-between align-items-center" style="max-width:880px;">
						${deleteBtn}
						<button type="button" class="btn btn-primary fl-detail-save ms-auto">${this.save_text}</button>
					</div>
				</div>`;

		// readonly pages don't need the extra bottom padding the save bar
		// would otherwise overlap.
		const containerStyle = ro
			? "max-width:880px;padding:1.5rem 1rem 3rem;"
			: "max-width:880px;padding:1.5rem 1rem 7rem;";

		// Either a static H1 (when title_field is empty) or a giant input
		// the user can edit directly (when title_field is set). The input
		// has the same hot-field marker as any other form field so
		// populate / collect picks it up — there is no duplicate form
		// field elsewhere on the page.
		const titleEl = this.title_field
			? `<input type="text" hot-field="${this.title_field}" class="fl-detail-title-input" placeholder="${this.title_placeholder}" />`
			: (this.title ? `<h1 class="h3 mb-3">${this.title}</h1>` : "");

		return (`
			<div id="${this.name}" class="fl-detail-page">
				<div class="container" style="${containerStyle}">
					<div class="mb-3"><a href="${this.back_url}" class="text-muted small text-decoration-none">${this.back_text}</a></div>
					${titleEl}
					<div class="fl-detail-feedback d-none"></div>
					<div class="card mb-3"><div class="card-body">
						<div class="row g-3 fl-detail-page-body">
							<hot-place-here name="detailBody"></hot-place-here>
						</div>
					</div></div>
				</div>
				${saveBar}
			</div>`);
	}
}
