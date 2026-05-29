import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";
import { populateFields, collectFieldValues, resetFields } from "./field-io";

/**
 * Inline accordion edit form. Pairs with <admin-card-table> via the
 * card-table's hot-row_edit_id attribute. When the user clicks a row,
 * the card-table calls openForRow() on this component, which slides
 * the form open underneath the clicked row, populates each
 * <admin-form-field> child from the row's data, and wires the
 * Save / Cancel / Delete buttons.
 *
 * No modal, no separate page — the editor lives inline in the same
 * card the data list lives in. One accordion open at a time.
 *
 * Usage:
 *   <admin-card-table id="bankAccountsList"
 *                     hot-list_url=".../v1/bank_accounts/list"
 *                     hot-row_edit_id="bankAccountsEdit"
 *                     ...></admin-card-table>
 *
 *   <admin-row-edit name="bankAccountsEdit"
 *                   hot-save_url=".../v1/bank_accounts/edit"
 *                   hot-delete_url=".../v1/bank_accounts/delete"
 *                   hot-payload_key="bankAccount"
 *                   hot-jwt="${jwtToken}">
 *     <admin-form-field hot-field="name" hot-label="Name" hot-required="1"
 *                       hot-col="col-md-6"></admin-form-field>
 *     <admin-form-field hot-field="bankSyncAPIType" hot-label="Sync type"
 *                       hot-control="select"
 *                       hot-options="paypal_webhooks:PayPal Webhooks"
 *                       hot-col="col-md-6"></admin-form-field>
 *   </admin-row-edit>
 */
export class AdminRowEdit extends HotComponent
{
	/** Edit endpoint. POSTed with { [payload_key]: { id, ...fields } }. */
	save_url: string;
	/** Optional delete endpoint. Hides the Delete button when blank. */
	delete_url: string;
	/** Wrapper key in the save payload (e.g. "bankAccount"). Empty → values posted flat. */
	payload_key: string;
	/** JWT bearer for the API calls. */
	jwt: string;
	/** Save button text. */
	save_text: string;
	/** Delete button text. */
	delete_text: string;
	/** Cancel button text. */
	cancel_text: string;
	/** Confirmation prompt for delete. */
	delete_confirm: string;

	/** The element that holds the form template (parked offscreen by default). */
	protected templateEl: HTMLElement | null = null;
	/** The id of the entity currently being edited. */
	protected currentId: string | null = null;
	/** The row element the form is currently anchored under. */
	protected anchorRow: HTMLElement | null = null;
	/** The card-table id we belong to (set by openForRow). */
	protected ownerListId: string | null = null;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag             = "admin-row-edit";
		this.save_url        = "";
		this.delete_url      = "";
		this.payload_key     = "";
		this.jwt             = "";
		this.save_text       = "Save";
		this.delete_text     = "Delete";
		this.cancel_text     = "Cancel";
		this.delete_confirm  = "Delete this record?";
	}

	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		const self = this;
		const root = document.getElementById (this.name);
		if (root == null)
			return (null);

		// Same auto-relocate trick as admin-add-panel: children appended
		// to root by the framework get moved into the form's .row.
		const row = root.querySelector (".fl-row-edit-form .row") as HTMLElement | null;
		if (row != null)
		{
			Array.from (root.children).forEach ((child) =>
				{
					// Skip the form chrome itself.
					if ((child as HTMLElement).classList.contains ("fl-row-edit-form")) return;
					row.appendChild (child as Element);
				});
		}

		// Wire buttons.
		const saveBtn   = root.querySelector (".fl-row-edit-save") as HTMLButtonElement | null;
		const cancelBtn = root.querySelector (".fl-row-edit-cancel") as HTMLButtonElement | null;
		const deleteBtn = root.querySelector (".fl-row-edit-delete") as HTMLButtonElement | null;

		if (saveBtn != null)
			saveBtn.addEventListener ("click", (e) => { e.preventDefault (); self.handleSave (); });
		if (cancelBtn != null)
			cancelBtn.addEventListener ("click", (e) => { e.preventDefault (); self.close (); });
		if (deleteBtn != null)
			deleteBtn.addEventListener ("click", (e) => { e.preventDefault (); self.handleDelete (); });

		// Expose imperative API on the DOM element so admin-card-table can
		// drive us without an import dance. Matches the .refreshList()
		// pattern admin-card-table exposes.
		(root as any).openForRow  = function (row: any, anchor: HTMLElement, ownerListId: string) { return self.openForRow (row, anchor, ownerListId); };
		(root as any).closeEditor = function () { return self.close (); };

		// Park ourselves under <body> from initial mount. This makes our
		// resting location stable and predictable across re-renders of
		// the partner card-table. Without this, the editor first lives
		// wherever the .hott placed its tag (typically as a sibling of
		// the card-table) — which works, but means closeEditor /
		// fetchAndRender have to deal with two possible homes (original
		// .hott site vs. body). Park-under-body makes "the editor is
		// always either here at body or under a row inside the list"
		// the only invariant the rest of the code has to track.
		if (root.parentNode !== document.body && document.body != null)
		{
			if (root.parentNode != null)
				root.parentNode.removeChild (root);
			document.body.appendChild (root);
		}

		return (null);
	}

	/** Move our form under the anchor row, populate fields, expand. */
	public openForRow (rowData: any, anchor: HTMLElement, ownerListId: string): void
	{
		const root = document.getElementById (this.name);
		if (root == null)
		{
			// If the editor element has been orphaned (e.g. an innerHTML
			// reset on the host list detached it before closeEditor could
			// move it back to body), there's nothing we can do here.
			// Surface it loudly so the next time this happens we can see
			// it in the console instead of guessing at silent no-ops.
			console.warn (`admin-row-edit (${this.name}): openForRow called but element not in document — was the editor orphaned by an innerHTML reset?`);
			return;
		}

		// If already open on the same row, treat as close.
		if (this.anchorRow === anchor && root.classList.contains ("show"))
		{
			this.close ();
			return;
		}

		this.currentId  = rowData ? (rowData.id || null) : null;
		this.anchorRow  = anchor;
		this.ownerListId = ownerListId;

		this.populateFields (root, rowData);
		this.placeUnderAnchor (root, anchor);
		this.expand (root);
		this.clearFeedback (root);
	}

	public close (): void
	{
		const root = document.getElementById (this.name);
		if (root == null) return;
		this.collapse (root);
		this.anchorRow = null;
		this.currentId = null;
		this.ownerListId = null;
	}

	protected placeUnderAnchor (root: HTMLElement, anchor: HTMLElement): void
	{
		// Insert root as a sibling immediately after the anchor row.
		// Keep it the *next* sibling so the accordion visually drops
		// under the row the user clicked.
		if (anchor.parentNode == null) return;
		if (root.parentNode != null && root.parentNode !== anchor.parentNode)
			root.parentNode.removeChild (root);
		else if (root === anchor.nextSibling)
			return;
		anchor.parentNode.insertBefore (root, anchor.nextSibling);
	}

	protected expand (root: HTMLElement): void
	{
		root.classList.add ("show");
		root.removeAttribute ("hidden");
	}

	protected collapse (root: HTMLElement): void
	{
		root.classList.remove ("show");
		root.setAttribute ("hidden", "");
		// Park back under the original template anchor (body) so it doesn't
		// take up DOM space inside the card-list when not in use.
		if (root.parentNode !== document.body && document.body != null)
		{
			if (root.parentNode != null)
				root.parentNode.removeChild (root);
			document.body.appendChild (root);
		}
	}

	protected clearFeedback (root: HTMLElement): void
	{
		const fb = root.querySelector (".fl-row-edit-feedback") as HTMLElement | null;
		if (fb) { fb.className = "fl-row-edit-feedback d-none"; fb.textContent = ""; }
	}

	protected showError (msg: string): void
	{
		const root = document.getElementById (this.name);
		if (root == null) return;
		const fb = root.querySelector (".fl-row-edit-feedback") as HTMLElement | null;
		if (fb) { fb.className = "fl-row-edit-feedback alert alert-danger"; fb.textContent = msg; }
	}

	protected populateFields (root: HTMLElement, rowData: any): void
	{
		// Reset everything first — the row data is authoritative and any
		// field absent from rowData should appear blank, not retain the
		// previously-edited row's value.
		resetFields (root);
		if (rowData != null)
			populateFields (root, rowData);
	}

	protected collectValues (root: HTMLElement): any
	{
		return (collectFieldValues (root));
	}

	protected refreshOwnerList (): void
	{
		if (!this.ownerListId) return;
		const list: any = document.getElementById (this.ownerListId);
		if (list != null && typeof list.refreshList === "function")
			list.refreshList ();
	}

	protected async handleSave (): Promise<void>
	{
		const root = document.getElementById (this.name);
		if (root == null || !this.currentId) return;

		const values = this.collectValues (root);
		values.id = this.currentId;
		const body: any = this.payload_key ? { [this.payload_key]: values } : values;

		const btn = root.querySelector (".fl-row-edit-save") as HTMLButtonElement | null;
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
				this.showError ("Save failed: " + msg);
				return;
			}
			this.refreshOwnerList ();
			this.close ();
		}
		catch (ex)
		{
			this.showError ("Save failed: " + (ex as Error).message);
		}
		finally
		{
			if (btn) btn.disabled = false;
		}
	}

	protected async handleDelete (): Promise<void>
	{
		if (!this.currentId) return;
		if (!window.confirm (this.delete_confirm)) return;
		try
		{
			const headers: any = { "Content-Type": "application/json" };
			if (this.jwt) headers["Authorization"] = "Bearer " + this.jwt;
			const res = await fetch (this.delete_url, {
				method: "POST", headers: headers, body: JSON.stringify ({ id: this.currentId })
			});
			if (!res.ok) { this.showError ("Delete failed: HTTP " + res.status); return; }
			this.refreshOwnerList ();
			this.close ();
		}
		catch (ex)
		{
			this.showError ("Delete failed: " + (ex as Error).message);
		}
	}

	output (): string | HotComponentOutput[]
	{
		if (this.name === "")
			throw new Error ("admin-row-edit: name is required");
		if (this.save_url === "")
			throw new Error ("admin-row-edit: hot-save_url is required");

		const deleteBtn = this.delete_url
			? `<button type="button" class="btn btn-sm btn-outline-danger fl-row-edit-delete">${this.delete_text}</button>`
			: "";

		// Render hidden by default; admin-card-table moves us under a row
		// and adds .show when the user clicks. Lives under <body> when
		// idle so it doesn't take up space inside the card-list.
		return (`
			<div id="${this.name}" class="fl-row-edit" hidden>
				<form class="fl-row-edit-form">
					<div class="fl-row-edit-feedback d-none"></div>
					<div class="row g-3">
						<!-- form-field children get moved here in onPostPlace -->
					</div>
					<div class="d-flex justify-content-end gap-2 mt-3 fl-row-edit-actions">
						${deleteBtn}
						<button type="button" class="btn btn-sm btn-link text-muted fl-row-edit-cancel">${this.cancel_text}</button>
						<button type="button" class="btn btn-sm btn-success fl-row-edit-save">${this.save_text}</button>
					</div>
				</form>
			</div>`);
	}
}
