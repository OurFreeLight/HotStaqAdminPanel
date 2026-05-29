import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

/**
 * Moderation + approval-status panel. Replaces the per-page legacy
 * components `add-approval.hott` and `mod-flags.hott`, which were
 * always rendered side-by-side anyway.
 *
 * Self-managing — on each control change, posts directly to
 * /v1/<route_name>/setApprovalStatus or /v1/<route_name>/setFlag. Not
 * part of the parent save payload (the shared field-io collect path
 * returns SKIP_FIELD for elements with the `fl-admin-approval-panel`
 * marker class, so it never appears in the parent fetch save body).
 *
 * Renders different controls based on hot-user_type:
 *  - moderator / admin → select inputs that POST on change
 *  - user (default)    → read-only text rendering
 *
 * Usage:
 *   <admin-approval-panel hot-route_name="issues"
 *                         hot-user_type="${userType}"
 *                         hot-jwt="${jwtToken}"
 *                         hot-id="${issue.id}"
 *                         hot-approval_status="${issue.approvalStatus}"
 *                         hot-flag_data='${moderatorFlagJson}'>
 *   </admin-approval-panel>
 *
 * `hot-flag_data` is the JSON-serialized moderatorFlag object, e.g.
 * `{"flags":["spam","against_rules"],"response":"RequestChanges"}`.
 * Omit / leave empty when no flag is set.
 */
export class AdminApprovalPanel extends HotComponent
{
	/** API route name segment, e.g. "issues" / "plans" (required). */
	route_name: string;
	/** "user" | "moderator" | "admin" — gates which controls render. */
	user_type: string;
	/** JWT for the API calls (required for the setApprovalStatus / setFlag calls). */
	jwt: string;
	/** Entity id (required). */
	id: string;
	/** API base URL prefix, e.g. "" (same-origin) or "https://api.example.com". */
	base_url: string;
	/** Initial approval status. */
	approval_status: string;
	/** Initial moderatorFlag, as a JSON string. */
	flag_data: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag             = "admin-approval-panel";
		this.route_name      = "";
		this.user_type       = "user";
		this.jwt             = "";
		this.id              = "";
		this.base_url        = "";
		this.approval_status = "";
		this.flag_data       = "";
	}

	protected isMod (): boolean
	{
		return (this.user_type === "mod" || this.user_type === "moderator" || this.user_type === "admin");
	}

	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		const wrappers = document.querySelectorAll (`.fl-admin-approval-panel[data-route-name="${this.route_name}"][data-entity-id="${this.id}"]`);
		for (let i = 0; i < wrappers.length; i++)
			this.wireOne (wrappers[i] as HTMLElement);
		return (null);
	}

	protected wireOne (wrapper: HTMLElement): void
	{
		if (wrapper.getAttribute ("data-wired") === "1") return;
		wrapper.setAttribute ("data-wired", "1");

		const self = this;

		// Approval status select.
		const apprSel = wrapper.querySelector (".fl-ap-approval-select") as HTMLSelectElement | null;
		if (apprSel != null)
		{
			apprSel.addEventListener ("change", () =>
				{
					self.postApprovalStatus (apprSel.value);
				});
		}

		// Flag dropdown — add to list.
		const flagAdd = wrapper.querySelector (".fl-ap-flag-add") as HTMLSelectElement | null;
		const flagList = wrapper.querySelector (".fl-ap-flag-list") as HTMLElement | null;
		if (flagAdd != null && flagList != null)
		{
			flagAdd.addEventListener ("change", () =>
				{
					const val = flagAdd.value;
					if (val === "") return;
					if (flagList.querySelector (`[data-flag-value="${val.replace (/"/g, "")}"]`) != null)
					{
						flagAdd.value = "";
						return;
					}
					const text = flagAdd.options[flagAdd.selectedIndex].text;
					const li = document.createElement ("li");
					li.className = "fl-ap-flag-chip";
					li.setAttribute ("data-flag-value", val);
					li.innerHTML = `<span class="fl-ap-flag-label"></span><button type="button" class="fl-ap-flag-remove" aria-label="Remove">&times;</button>`;
					(li.querySelector (".fl-ap-flag-label") as HTMLElement).textContent = text;
					flagList.appendChild (li);
					flagAdd.value = "";
					self.postFlagStatus (wrapper);
				});
		}

		// Flag list — remove buttons (event delegation).
		if (flagList != null)
		{
			flagList.addEventListener ("click", (e) =>
				{
					const target = e.target as HTMLElement;
					if (target == null) return;
					if (target.classList.contains ("fl-ap-flag-remove"))
					{
						const chip = target.closest ("[data-flag-value]") as HTMLElement | null;
						if (chip != null)
						{
							chip.remove ();
							self.postFlagStatus (wrapper);
						}
					}
				});
		}

		// Flag response select.
		const flagResp = wrapper.querySelector (".fl-ap-flag-response") as HTMLSelectElement | null;
		if (flagResp != null)
		{
			flagResp.addEventListener ("change", () =>
				{
					self.postFlagStatus (wrapper);
				});
		}
	}

	protected async postApprovalStatus (status: string): Promise<void>
	{
		try
		{
			const headers: any = { "Content-Type": "application/json" };
			if (this.jwt) headers["Authorization"] = "Bearer " + this.jwt;
			await fetch (`${this.base_url}/v1/${this.route_name}/setApprovalStatus`, {
				method: "POST", headers: headers,
				body: JSON.stringify ({ id: this.id, approvalStatus: status })
			});
		}
		catch (ex)
		{
			console.error ("admin-approval-panel: setApprovalStatus failed:", ex);
		}
	}

	protected async postFlagStatus (wrapper: HTMLElement): Promise<void>
	{
		const flags: string[] = [];
		const chips = wrapper.querySelectorAll (".fl-ap-flag-list [data-flag-value]");
		for (let i = 0; i < chips.length; i++)
		{
			const v = chips[i].getAttribute ("data-flag-value");
			if (v) flags.push (v);
		}
		const respSel = wrapper.querySelector (".fl-ap-flag-response") as HTMLSelectElement | null;
		const response = respSel != null ? respSel.value : "None";

		try
		{
			const headers: any = { "Content-Type": "application/json" };
			if (this.jwt) headers["Authorization"] = "Bearer " + this.jwt;
			await fetch (`${this.base_url}/v1/${this.route_name}/setFlag`, {
				method: "POST", headers: headers,
				body: JSON.stringify ({
					id: this.id,
					moderatorFlag: { flags: flags, response: response }
				})
			});
		}
		catch (ex)
		{
			console.error ("admin-approval-panel: setFlag failed:", ex);
		}
	}

	protected renderApprovalControl (status: string): string
	{
		if (this.isMod ())
		{
			const opts = ["AwaitingReview", "InReview", "Approved", "Rejected"].map ((v) =>
				{
					const sel = (v === status) ? " selected" : "";
					const label = v.replace (/([A-Z])/g, " $1").trim ();
					return `<option value="${v}"${sel}>${label}</option>`;
				}).join ("");
			return `<select class="form-select form-select-sm fl-ap-approval-select">${opts}</select>`;
		}
		const display = status || "AwaitingReview";
		return `<div class="fw-bold fl-ap-approval-display">${display.replace (/([A-Z])/g, " $1").trim ()}</div>`;
	}

	protected renderFlagControls (flagData: any): string
	{
		const flags: string[]   = (flagData && Array.isArray (flagData.flags)) ? flagData.flags : [];
		const response: string  = (flagData && typeof flagData.response === "string") ? flagData.response : "None";

		const FLAG_TYPES: Array<[string, string]> = [
			["not_to_standards", "Not to Standards"],
			["inappropriate",   "Inappropriate"],
			["against_rules",   "Against Rules"],
			["spam",            "Spam"]
		];

		const chipsHtml = flags.map ((v) =>
			{
				const labelEntry = FLAG_TYPES.find (f => f[0] === v);
				const label = labelEntry != null ? labelEntry[1] : v;
				const safeLabel = label.replace (/</g, "&lt;").replace (/>/g, "&gt;");
				return `<li class="fl-ap-flag-chip" data-flag-value="${v}"><span class="fl-ap-flag-label">${safeLabel}</span><button type="button" class="fl-ap-flag-remove" aria-label="Remove">&times;</button></li>`;
			}).join ("");

		if (this.isMod ())
		{
			const flagOpts = FLAG_TYPES.map (f => `<option value="${f[0]}">${f[1]}</option>`).join ("");
			const respOpts = ["None", "RequestChanges", "Hide", "Delete"].map ((v) =>
				{
					const sel = (v === response) ? " selected" : "";
					const label = v.replace (/([A-Z])/g, " $1").trim ();
					return `<option value="${v}"${sel}>${label}</option>`;
				}).join ("");

			return `
				<select class="form-select form-select-sm fl-ap-flag-add">
					<option value="">Add a flag…</option>
					${flagOpts}
				</select>
				<ul class="fl-ap-flag-list list-unstyled mt-2 mb-2">${chipsHtml}</ul>
				<label class="form-label small mb-1">Moderator Response</label>
				<select class="form-select form-select-sm fl-ap-flag-response">${respOpts}</select>`;
		}

		return `
			<ul class="fl-ap-flag-list list-unstyled mb-2">${chipsHtml}</ul>
			<div class="fw-bold fl-ap-flag-response-display">${response}</div>`;
	}

	output (): string | HotComponentOutput[]
	{
		if (this.route_name === "")
			throw new Error ("admin-approval-panel: hot-route_name is required");
		if (this.id === "")
			throw new Error ("admin-approval-panel: hot-id is required");

		let flagData: any = null;
		if (this.flag_data && this.flag_data !== "" && this.flag_data !== "null")
		{
			try { flagData = JSON.parse (this.flag_data); }
			catch (ex) { flagData = null; }
		}

		return (`
			<div class="fl-admin-approval-panel card mt-3" data-route-name="${this.route_name}" data-entity-id="${this.id}">
				<div class="card-body">
					<div class="row g-3">
						<div class="col-md-6">
							<label class="form-label small mb-1">Approval Status</label>
							${this.renderApprovalControl (this.approval_status)}
						</div>
						<div class="col-md-6">
							<label class="form-label small mb-1">Moderator Flags</label>
							${this.renderFlagControls (flagData)}
						</div>
					</div>
				</div>
			</div>`);
	}
}
