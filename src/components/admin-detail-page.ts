import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

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
	}

	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		const self = this;
		const page = document.getElementById (this.name);
		if (page == null) return (null);

		const id = self.readIdFromUrl ();
		if (!id)
		{
			self.showError (page, "No id provided in the URL.");
			return (null);
		}

		// Wire buttons.
		const saveBtn   = page.querySelector (".fl-detail-save") as HTMLButtonElement | null;
		const deleteBtn = page.querySelector (".fl-detail-delete") as HTMLButtonElement | null;

		if (saveBtn != null)
			saveBtn.addEventListener ("click", (e) => { e.preventDefault (); self.handleSave (page, id); });

		if (deleteBtn != null)
			deleteBtn.addEventListener ("click", (e) => { e.preventDefault (); self.handleDelete (id); });

		// Load existing record.
		self.fetchAndFill (page, id);

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
			const res = await fetch (this.get_url, {
				method: "POST", headers: headers, body: JSON.stringify ({ id: id })
			});
			if (!res.ok) { this.showError (page, "Could not load: HTTP " + res.status); return; }
			const obj = await res.json ();
			if (obj == null) { this.showError (page, "Record not found."); return; }
			this.populateFields (page, obj);
		}
		catch (ex)
		{
			this.showError (page, "Could not load: " + (ex as Error).message);
		}
	}

	protected populateFields (page: HTMLElement, obj: any): void
	{
		const nodes = page.querySelectorAll ("[hot-field]");
		for (let i = 0; i < nodes.length; i++)
		{
			const el = nodes[i] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
			const field = el.getAttribute ("hot-field");
			if (field == null || field === "") continue;
			const val = obj[field];
			if (val == null) continue;
			if (el instanceof HTMLInputElement && el.type === "checkbox")
				el.checked = val === true || val === "true" || val === 1;
			else
				el.value = String (val);
		}
	}

	protected collectValues (page: HTMLElement): any
	{
		const out: any = {};
		const nodes = page.querySelectorAll ("[hot-field]");
		for (let i = 0; i < nodes.length; i++)
		{
			const el = nodes[i] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
			const field = el.getAttribute ("hot-field");
			if (field == null || field === "") continue;
			if (el instanceof HTMLInputElement && el.type === "checkbox")
				out[field] = el.checked;
			else if (el instanceof HTMLInputElement && el.type === "number")
				out[field] = el.value === "" ? null : Number (el.value);
			else
				out[field] = el.value;
		}
		return out;
	}

	protected async handleSave (page: HTMLElement, id: string): Promise<void>
	{
		const values = this.collectValues (page);
		values.id = id;
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

	output (): string | HotComponentOutput[]
	{
		if (this.name === "")
			throw new Error ("admin-detail-page: id (name) is required");
		if (this.get_url === "" || this.save_url === "")
			throw new Error ("admin-detail-page: hot-get-url and hot-save-url are required");

		const deleteBtn = this.delete_url
			? `<button type="button" class="btn btn-outline-danger fl-detail-delete">${this.delete_text}</button>`
			: "";

		return (`
			<div id="${this.name}" class="fl-detail-page">
				<div class="container" style="max-width:880px;padding:1.5rem 1rem 7rem;">
					<div class="mb-3"><a href="${this.back_url}" class="text-muted small text-decoration-none">${this.back_text}</a></div>
					<h1 class="h3 mb-3">${this.title}</h1>
					<div class="fl-detail-feedback d-none"></div>
					<div class="card mb-3"><div class="card-body">
						<div class="row g-3">
							<hot-place-here name="detailBody"></hot-place-here>
						</div>
					</div></div>
				</div>
				<div class="fl-detail-save-bar">
					<div class="container d-flex justify-content-between align-items-center" style="max-width:880px;">
						${deleteBtn}
						<button type="button" class="btn btn-primary fl-detail-save ms-auto">${this.save_text}</button>
					</div>
				</div>
			</div>`);
	}
}
