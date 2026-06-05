import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";
import { populateFields, collectFieldValues, resetFields, splitFilesFromValues } from "./field-io";

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
	/** Cancel button text when in readonly mode (shown as "Close"). */
	close_text: string;
	/** Confirmation prompt for delete. */
	delete_confirm: string;
	/** "1" to render the editor read-only: fields disabled, save/delete hidden, cancel relabeled to Close. */
	readonly: string;

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
		this.close_text      = "Close";
		this.delete_confirm  = "Delete this record?";
		this.readonly        = "";
	}

	/** True when the editor should render in read-only / view-only mode. */
	protected isReadonly (): boolean
	{
		return (this.readonly === "1" || this.readonly === "true");
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
		this.applyReadonly (root);
		this.placeUnderAnchor (root, anchor);
		this.expand (root);
		this.clearFeedback (root);

		// Notify integrations (e.g. an embedded comments panel) that a row's
		// editor opened, with the row id, so they can mount per-row content.
		try
		{
			root.dispatchEvent (new CustomEvent ("fl-row-edit-open", {
					bubbles: true,
					detail: { id: this.currentId, rowData: rowData }
				}));
		}
		catch (ex) { /* CustomEvent unsupported — integrations simply won't fire */ }
	}

	/**
	 * Apply the current readonly state to every form input, Quill, and
	 * related-picker, and toggle the save/delete buttons. Runs on every
	 * openForRow so Quill (which often initializes late) is caught even
	 * if it was still booting at first open.
	 */
	protected applyReadonly (root: HTMLElement): void
	{
		const ro = this.isReadonly ();
		const nodes = root.querySelectorAll ("[hot-field]");
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

		const saveBtn   = root.querySelector (".fl-row-edit-save")   as HTMLElement | null;
		const deleteBtn = root.querySelector (".fl-row-edit-delete") as HTMLElement | null;
		const cancelBtn = root.querySelector (".fl-row-edit-cancel") as HTMLElement | null;
		if (saveBtn   != null) saveBtn.style.display   = ro ? "none" : "";
		if (deleteBtn != null) deleteBtn.style.display = ro ? "none" : "";
		if (cancelBtn != null) cancelBtn.textContent   = ro ? this.close_text : this.cancel_text;
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

		const collected = this.collectValues (root);
		const split = splitFilesFromValues (collected);
		split.values.id = this.currentId;
		// Cleared fields: explicitly send `null` so the server knows to drop
		// the existing attachment. Without this the field would be omitted
		// and most edit-merge implementations preserve the old value.
		for (const k of split.cleared) split.values[k] = null;

		const body: any = this.payload_key ? { [this.payload_key]: split.values } : split.values;
		const fileCount = Object.keys (split.files).length;

		const btn = root.querySelector (".fl-row-edit-save") as HTMLButtonElement | null;
		if (btn) btn.disabled = true;
		try
		{
			let res: Response;
			if (fileCount > 0)
			{
				// Two-phase: multipart upload first, then JSON save with the
				// resulting uploadId echoed back in `hotstaq.uploads.uploadId`.
				// Mirrors hotstaq/src/Hot.ts:httpRequest's FILE_UPLOAD flow so
				// the server-side route logic doesn't need to change.
				const uploadId = await this.uploadFiles (split.files);
				if (uploadId == null) { this.showError ("Save failed: file upload returned no uploadId."); return; }
				body.hotstaq = body.hotstaq || {};
				body.hotstaq.uploads = body.hotstaq.uploads || {};
				body.hotstaq.uploads.uploadId = uploadId;
			}
			const headers: any = { "Content-Type": "application/json" };
			if (this.jwt) headers["Authorization"] = "Bearer " + this.jwt;
			res = await fetch (this.save_url, {
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

	/**
	 * Phase 1 of a FILE_UPLOAD save: POST the multipart form to save_url
	 * with the magic HotStaqUpload header. The server stashes the file and
	 * returns an uploadId we then echo back in the JSON phase.
	 */
	protected async uploadFiles (files: { [k: string]: any }): Promise<string | null>
	{
		const form = new FormData ();
		for (const k of Object.keys (files)) form.append (k, files[k]);
		const headers: any = { "HotStaqUpload": "true" };
		if (this.jwt) headers["Authorization"] = "Bearer " + this.jwt;
		const res = await fetch (this.save_url, { method: "POST", headers: headers, body: form });
		if (!res.ok) throw new Error ("multipart upload HTTP " + res.status);
		const json: any = await res.json ();
		if (json && json.error) throw new Error (json.error);
		if (json && json.hotstaq && json.hotstaq.uploads && json.hotstaq.uploads.uploadId)
			return (json.hotstaq.uploads.uploadId);
		return (null);
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
