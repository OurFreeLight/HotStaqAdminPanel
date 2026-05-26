import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

/**
 * Inline collapsible "Add" panel. Replaces the modal opened by
 * <admin-edit hot-type="add">. Built on Bootstrap's collapse so it
 * slides down below a trigger button without overlaying the page.
 *
 * Pairs with <admin-card-table>: the table's "+ Add" button toggles
 * this panel via Bootstrap's data-bs-toggle="collapse" data-bs-target.
 * Slot for form fields lives at `hot-place-here name="panelBody"`.
 *
 * Usage:
 *   <admin-add-panel name="bankAccountsAdd" hot-title="Add bank account"
 *                    hot-onsave="<(values) => {
 *                       const r = await Hot.jsonRequest(`${config.baseUrl}/v1/bank_accounts/create`,
 *                                  { bankAccount: values }, '${jwtToken}');
 *                       if (r && r.error) { alertError(r.error); return false; }
 *                    }Ra>"
 *                    hot-attached_list="bankAccountsList">
 *     <admin-form-field hot-field="name" hot-label="Name" hot-required="1"
 *                       hot-col="col-md-6"></admin-form-field>
 *     ...
 *   </admin-add-panel>
 */
export class AdminAddPanel extends HotComponent
{
	/** Title shown at the top of the panel. */
	title: string;
	/** Submit button label. */
	button_title: string;
	/** Cancel button label. Empty disables the cancel button. */
	cancel_text: string;
	/** Optional id of the related <admin-card-table>; the toggle button gets injected into its header. */
	attached_list: string;
	/** Where to render the toggle button (a hot-place-here name on the page). Leave blank when attached_list is set. */
	add_place_here: string;
	/** Text shown on the toggle button. */
	add_text: string;
	/** When set to "1" / "true", panel starts expanded. */
	start_open: string;
	/** What to run when the user clicks Save. Receives a values object built from hot-field inputs. Return false to keep the panel open. */
	onsave: (values: any) => Promise<boolean | void>;

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
		this.add_place_here  = "";
		this.add_text        = "+ Add";
		this.start_open      = "0";
		this.onsave          = null;
	}

	/**
	 * Wires the submit + cancel handlers after the DOM is in place.
	 * Browsers handle the collapse open/close via Bootstrap data-attrs
	 * on the toggle button — we don't need to manage that ourselves.
	 */
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		const self = this;
		const panel = document.getElementById (this.panelId);
		if (panel == null)
			return (null);

		const submitBtn = panel.querySelector (`.fl-add-panel-submit`) as HTMLButtonElement | null;
		const cancelBtn = panel.querySelector (`.fl-add-panel-cancel`) as HTMLButtonElement | null;

		if (submitBtn != null)
		{
			submitBtn.addEventListener ("click", async (e) =>
				{
					e.preventDefault ();
					const values = self.collectFieldValues (panel);
					submitBtn.disabled = true;
					try
					{
						let keepOpen: any = false;
						if (typeof self.onsave === "function")
							keepOpen = await self.onsave (values);

						if (keepOpen === false || keepOpen == null)
						{
							self.resetFields (panel);
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
					self.resetFields (panel);
					self.collapsePanel ();
				});
		}

		return (null);
	}

	/** Read every hot-field-marked input inside the panel into a plain object. */
	protected collectFieldValues (panel: HTMLElement): any
	{
		const out: any = {};
		const nodes = panel.querySelectorAll ("[hot-field]");
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
		return (out);
	}

	protected resetFields (panel: HTMLElement): void
	{
		const nodes = panel.querySelectorAll ("[hot-field]");
		for (let i = 0; i < nodes.length; i++)
		{
			const el = nodes[i] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
			if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = false;
			else if (el instanceof HTMLSelectElement) el.selectedIndex = 0;
			else el.value = "";
		}
	}

	protected collapsePanel (): void
	{
		const panel = document.getElementById (this.panelId);
		if (panel == null) return;
		// Bootstrap collapse hide — works without importing Bootstrap JS
		// directly by toggling the .show class and aria-expanded on any
		// trigger pointed at us.
		panel.classList.remove ("show");
		const triggers = document.querySelectorAll (`[data-bs-target="#${this.panelId}"]`);
		triggers.forEach (t => t.setAttribute ("aria-expanded", "false"));
	}

	/**
	 * Best-effort refresh of the paired <admin-card-table>. The table
	 * exposes a `refreshList` method on the rendered element when its
	 * data is loaded; calling it re-fetches without a page reload.
	 */
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
		const titleHtml = this.title ? `<h2 class="h6 fl-add-panel-title mb-3">${this.title}</h2>` : "";
		const cancelHtml = this.cancel_text
			? `<button type="button" class="btn btn-sm btn-link text-muted fl-add-panel-cancel">${this.cancel_text}</button>`
			: "";

		const panelHtml = `
			<div id="${this.panelId}" class="collapse fl-add-panel${showClass}">
				<div class="card-body border-top bg-body-tertiary fl-add-panel-body">
					${titleHtml}
					<form id="${this.formId}" class="fl-add-panel-form">
						<div class="row g-2 align-items-end">
							<hot-place-here name="panelBody"></hot-place-here>
						</div>
						<div class="d-flex justify-content-end gap-2 mt-3">
							${cancelHtml}
							<button type="submit" class="btn btn-sm btn-success fl-add-panel-submit">${this.button_title}</button>
						</div>
					</form>
				</div>
			</div>`;

		const outputs: HotComponentOutput[] = [{ html: panelHtml, documentSelector: "body" }];

		// If a partner card-table is named, inject the toggle button into
		// its header slot. Otherwise honour an explicit add_place_here.
		const toggleBtn = `<button type="button" class="btn btn-sm btn-primary fl-add-panel-toggle" data-bs-toggle="collapse" data-bs-target="#${this.panelId}" aria-expanded="${showClass ? "true" : "false"}" aria-controls="${this.panelId}">${this.add_text}</button>`;

		if (this.attached_list !== "")
		{
			outputs.push ({
				html: toggleBtn,
				documentSelector: `[data-card-table-add-slot="${this.attached_list}"]`
			});
		}
		else if (this.add_place_here !== "")
		{
			outputs.push ({
				html: toggleBtn,
				documentSelector: `hot-place-here[name="${this.add_place_here}"]`
			});
		}

		return (outputs);
	}
}
