import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";
import { collectFieldValues, resetFields, splitFilesFromValues } from "./field-io";

/**
 * Self-contained inline add form. Replaces the modal opened by
 * <admin-edit hot-type="add"> with a Bootstrap-collapse card that
 * lives directly on the page — header carries the "+ Add" toggle,
 * body holds the form fields. No cross-component DOM injection.
 *
 * Place this above an <admin-card-table>; when the user clicks the
 * header toggle, the form panel slides down. On Save, the paired
 * table is asked to refresh via `attached_list`.
 *
 * Usage:
 *   <admin-add-panel name="bankAccountsAdd"
 *                    hot-title="Add a bank account"
 *                    hot-attached_list="bankAccountsList"
 *                    hot-add_text="+ Add bank account"
 *                    hot-button_title="Create"
 *                    hot-onsave="<(values) => {...}Ra>">
 *     <admin-form-field hot-field="name" hot-label="Name" hot-required="1"
 *                       hot-col="col-md-6"></admin-form-field>
 *     <admin-form-field hot-field="bankSyncAPIType" hot-label="Sync type"
 *                       hot-control="select"
 *                       hot-options="paypal_webhooks:PayPal Webhooks"
 *                       hot-col="col-md-6"></admin-form-field>
 *   </admin-add-panel>
 */
export class AdminAddPanel extends HotComponent
{
	/** Title shown in the card header (next to the toggle button). */
	title: string;
	/** Submit button label. */
	button_title: string;
	/** Cancel button label. Empty hides the cancel button. */
	cancel_text: string;
	/** Optional id of the partner <admin-card-table>; refreshList() is called after a successful save. */
	attached_list: string;
	/** Text shown on the header toggle button. */
	add_text: string;
	/** "1" / "true" → panel starts expanded. */
	start_open: string;
	/** What to run when the user clicks Save. Receives a values object built from hot-field inputs. Return false to keep the panel open. */
	onsave: (values: any) => Promise<boolean | void>;
	/** Optional multipart upload endpoint (e.g. /v1/agreements/create). When set + the form has admin-file-upload fields, files are POSTed here first and the resulting uploadId is folded into the values object as values.hotstaq.uploads.uploadId before onsave fires. */
	upload_url: string;
	/** JWT bearer for the upload-phase POST (file upload uses the same auth as the normal save). */
	jwt: string;

	protected panelId: string;
	protected formId: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag             = "admin-add-panel";
		this.title           = "";
		this.button_title    = "Save";
		this.cancel_text     = "Cancel";
		this.attached_list   = "";
		this.add_text        = "+ Add";
		this.start_open      = "0";
		this.onsave          = null;
		this.upload_url      = "";
		this.jwt             = "";
	}

	/**
	 * Wire submit + cancel handlers after the DOM is in place.
	 * Bootstrap's data-bs-toggle handles open/close automatically.
	 *
	 * Also relocates any child elements (admin-form-fields, etc.) that
	 * the framework appended to the card root into the collapse panel's
	 * form-row. Without this, children would render OUTSIDE the
	 * collapsible body (siblings of the card-header and the collapse
	 * div), visible on the page even when the panel is collapsed.
	 */
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		const self = this;
		const root = document.getElementById (this.name);
		if (root == null)
			return (null);

		const submitBtn = root.querySelector (".fl-add-panel-submit") as HTMLButtonElement | null;
		const cancelBtn = root.querySelector (".fl-add-panel-cancel") as HTMLButtonElement | null;

		// Auto-relocate stray children into the form-row. The framework
		// appends children that lack `hot-place-parent` directly under
		// compHtmlElement2 (the card root). Move them inside the form.
		const row = root.querySelector (".fl-add-panel-form .row") as HTMLElement | null;
		const collapse = document.getElementById (this.panelId);
		const header = root.querySelector (":scope > .card-header") as HTMLElement | null;
		if (row != null)
		{
			Array.from (root.children).forEach ((child) =>
				{
					if (child === header || child === collapse) return;
					row.appendChild (child as Element);
				});
		}

		if (submitBtn != null)
		{
			submitBtn.addEventListener ("click", async (e) =>
				{
					e.preventDefault ();
					const collected = self.collectFieldValues (root);
					// If there are admin-file-upload fields, do the multipart
					// upload phase before onsave fires. Onsave only sees the
					// JSON-shaped values + a hotstaq.uploads.uploadId the
					// server will pair with the staged upload.
					const split = splitFilesFromValues (collected);
					for (const k of split.cleared) split.values[k] = null;
					let values = split.values;
					if (Object.keys (split.files).length > 0)
					{
						if (!self.upload_url)
						{
							console.error ("admin-add-panel: file fields present but hot-upload_url is not set on", self.name);
							submitBtn.disabled = false;
							return;
						}
						try
						{
							const uploadId = await self.uploadFiles (split.files);
							if (uploadId == null)
							{
								console.error ("admin-add-panel: upload returned no uploadId");
								submitBtn.disabled = false;
								return;
							}
							values.hotstaq = values.hotstaq || {};
							values.hotstaq.uploads = values.hotstaq.uploads || {};
							values.hotstaq.uploads.uploadId = uploadId;
						}
						catch (ex)
						{
							console.error ("admin-add-panel: file upload failed:", ex);
							submitBtn.disabled = false;
							return;
						}
					}
					submitBtn.disabled = true;
					try
					{
						// The framework's handleAttributes assigns
						// hot-onsave as a raw string. HotStaq's `<...>Ra>`
						// template processor has already rewritten the body
						// into a `return Hot.CurrentPage.callAsyncFunction(...)`
						// call; we just need to wrap it as a Function. Same
						// pattern admin-edit uses (admin-edit.js:309-311).
						if (typeof self.onsave === "string")
							self.onsave = new Function (self.onsave) as any;

						let keepOpen: any = false;
						if (typeof self.onsave === "function")
							keepOpen = await self.onsave (values);

						if (keepOpen === false || keepOpen == null)
						{
							self.resetFields (root);
							self.collapsePanel ();
							self.refreshAttachedList ();
						}
					}
					catch (ex)
					{
						console.error ("admin-add-panel onsave threw:", ex);
					}
					finally
					{
						submitBtn.disabled = false;
					}
				});
		}

		if (cancelBtn != null)
		{
			cancelBtn.addEventListener ("click", (e) =>
				{
					e.preventDefault ();
					self.resetFields (root);
					self.collapsePanel ();
				});
		}

		return (null);
	}

	protected collectFieldValues (root: HTMLElement): any
	{
		return (collectFieldValues (root));
	}

	protected resetFields (root: HTMLElement): void
	{
		resetFields (root);
	}

	/**
	 * Multipart upload phase. POSTs files to upload_url with the magic
	 * HotStaqUpload header. Server returns an uploadId we then echo back
	 * in the JSON save body so the route can pair them.
	 */
	protected async uploadFiles (files: { [k: string]: any }): Promise<string | null>
	{
		const form = new FormData ();
		for (const k of Object.keys (files)) form.append (k, files[k]);
		const headers: any = { "HotStaqUpload": "true" };
		if (this.jwt) headers["Authorization"] = "Bearer " + this.jwt;
		const res = await fetch (this.upload_url, { method: "POST", headers: headers, body: form });
		if (!res.ok) throw new Error ("multipart upload HTTP " + res.status);
		const json: any = await res.json ();
		if (json && json.error) throw new Error (json.error);
		if (json && json.hotstaq && json.hotstaq.uploads && json.hotstaq.uploads.uploadId)
			return (json.hotstaq.uploads.uploadId);
		return (null);
	}

	protected collapsePanel (): void
	{
		const panel = document.getElementById (this.panelId);
		if (panel == null) return;
		panel.classList.remove ("show");
		const triggers = document.querySelectorAll (`[data-bs-target="#${this.panelId}"]`);
		triggers.forEach (t => t.setAttribute ("aria-expanded", "false"));
	}

	protected refreshAttachedList (): void
	{
		if (this.attached_list === "") return;
		const list: any = document.getElementById (this.attached_list);
		if (list != null && typeof list.refreshList === "function")
			list.refreshList ();
	}

	output (): string | HotComponentOutput[]
	{
		if (this.name === "")
			throw new Error ("admin-add-panel: name is required");

		this.panelId = `${this.name}Panel`;
		this.formId  = `${this.name}Form`;

		const showClass = (this.start_open === "1" || this.start_open === "true") ? " show" : "";
		const ariaExp = showClass ? "true" : "false";
		const titleHtml = this.title ? `<strong class="fl-add-panel-title">${this.title}</strong>` : `<span></span>`;
		const cancelHtml = this.cancel_text
			? `<button type="button" class="btn btn-sm btn-link text-muted fl-add-panel-cancel">${this.cancel_text}</button>`
			: "";

		// Single self-contained card. Header has the toggle, body is the
		// collapse panel containing the form. Bootstrap's data-bs-toggle
		// drives the open/close — no JS wiring needed for that.
		return (`
			<div id="${this.name}" class="card fl-add-panel mb-3">
				<div class="card-header d-flex justify-content-between align-items-center">
					${titleHtml}
					<button type="button" class="btn btn-sm btn-primary fl-add-panel-toggle"
						data-bs-toggle="collapse" data-bs-target="#${this.panelId}"
						aria-expanded="${ariaExp}" aria-controls="${this.panelId}">${this.add_text}</button>
				</div>
				<div id="${this.panelId}" class="collapse fl-add-panel-body${showClass}">
					<div class="card-body border-top">
						<form id="${this.formId}" class="fl-add-panel-form">
							<!--
								Default top-alignment (no align-items-end).
								align-items-end was pushing label/input rows
								down on the col with fewer children — e.g.
								the Sync-type col has help text below the
								input, the Name col doesn't, so the Name
								label rendered lower than the Sync label.
								Top-alignment keeps labels on the same line.
							-->
							<div class="row g-3">
								<hot-place-here name="panelBody"></hot-place-here>
							</div>
							<div class="d-flex justify-content-end gap-2 mt-3">
								${cancelHtml}
								<button type="submit" class="btn btn-sm btn-success fl-add-panel-submit">${this.button_title}</button>
							</div>
						</form>
					</div>
				</div>
			</div>`);
	}
}
