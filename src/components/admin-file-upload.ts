import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

/**
 * File-upload field. Pairs with HotStaq route methods declared as
 * `type: HotEventMethod.FILE_UPLOAD`. The host save handler (admin-add-panel
 * or admin-row-edit) detects a selected File on the element and routes the
 * save through the two-phase multipart-then-JSON flow described in
 * `hotstaq/src/Hot.ts:httpRequest`.
 *
 * Visible state:
 *   - current attachment link (if hot-download_url + hot-value set)
 *   - file input
 *   - "Clear" button (only when something is selected or already attached)
 *
 * Usage (e.g. /agreements):
 *   <admin-file-upload hot-field="file"
 *                      hot-label="Agreement PDF"
 *                      hot-accept="application/pdf,.pdf"
 *                      hot-download_url="${config.baseUrl}/v1/agreements/getFile"
 *                      hot-col="col-md-12"></admin-file-upload>
 *
 * Populate contract: when the parent calls populateFields, the file-upload
 * reads `id` from the row's data and rebuilds the download link as
 * `${download_url}?id=${id}`. The host doesn't need to know anything
 * about file upload internals.
 *
 * Collect contract: collectField walks the [hot-field] tree as usual; for
 * this element it returns `{ __file: File }` when a file is selected,
 * `{ __clearFile: true }` when the clear button was clicked since the
 * last populate, or `null` (skip) otherwise. The host then strips these
 * markers, pulls the File into the multipart map, and reassembles the
 * JSON payload accordingly.
 */
export class AdminFileUpload extends HotComponent
{
	field: string;
	label: string;
	accept: string;
	download_url: string;
	col: string;
	id_param: string;
	hint: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag          = "admin-file-upload";
		this.field        = "";
		this.label        = "";
		this.accept       = "";
		this.download_url = "";
		this.col          = "";
		this.id_param     = "id";
		this.hint         = "";
	}

	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		const self = this;
		const wrappers = document.querySelectorAll (`.fl-admin-file-upload[hot-field="${self.field}"]`);
		if (wrappers.length === 0) return (null);

		for (let i = 0; i < wrappers.length; i++)
		{
			const wrapper = wrappers[i] as HTMLElement;
			if ((wrapper as any).__afuWired) continue;
			(wrapper as any).__afuWired = true;

			const input   = wrapper.querySelector (".fl-afu-input")   as HTMLInputElement | null;
			const clear   = wrapper.querySelector (".fl-afu-clear")   as HTMLButtonElement | null;
			const link    = wrapper.querySelector (".fl-afu-link")    as HTMLAnchorElement | null;
			const status  = wrapper.querySelector (".fl-afu-status")  as HTMLElement | null;
			if (input == null) continue;

			input.addEventListener ("change", () =>
				{
					(wrapper as any).__afuFile = (input.files && input.files[0]) ? input.files[0] : null;
					(wrapper as any).__afuCleared = false;
					if (status != null)
					{
						const f = (wrapper as any).__afuFile;
						status.textContent = f ? `Selected: ${f.name}` : "";
					}
				});

			if (clear != null)
			{
				clear.addEventListener ("click", (e) =>
					{
						e.preventDefault ();
						(wrapper as any).__afuFile = null;
						(wrapper as any).__afuCleared = true;
						input.value = "";
						if (link != null) { link.classList.add ("d-none"); link.href = ""; }
						if (status != null) status.textContent = "Cleared.";
					});
			}
		}
		return (null);
	}

	output (): string | HotComponentOutput[]
	{
		if (this.field === "")
			throw new Error ("admin-file-upload: hot-field is required");

		const id = `afu-${this.field}-${Math.random ().toString (36).slice (2, 7)}`;
		const labelHtml = this.label
			? `<label for="${id}" class="form-label small mb-1">${this.label}</label>`
			: "";
		const hintHtml = this.hint
			? `<div class="form-text small text-muted">${this.hint.replace (/</g, "&lt;")}</div>`
			: "";
		const acceptAttr = this.accept ? ` accept="${this.accept.replace (/"/g, "&quot;")}"` : "";

		// data-download-url + data-id-param let populate rebuild the link
		// once the row id is known, without the host page caring.
		const inner = `
			<div class="fl-admin-file-upload" hot-field="${this.field}"
				data-download-url="${this.download_url}"
				data-id-param="${this.id_param}">
				${labelHtml}
				<div class="fl-afu-current mb-1">
					<a class="fl-afu-link small d-none" target="_blank" rel="noopener">View current file</a>
				</div>
				<input id="${id}" type="file" class="fl-afu-input form-control form-control-sm"${acceptAttr} />
				<div class="d-flex justify-content-between align-items-center mt-1">
					<span class="fl-afu-status small text-muted"></span>
					<button type="button" class="fl-afu-clear btn btn-link btn-sm text-muted">Clear</button>
				</div>
				${hintHtml}
			</div>`;
		return (this.col ? `<div class="${this.col}">${inner}</div>` : inner);
	}
}
