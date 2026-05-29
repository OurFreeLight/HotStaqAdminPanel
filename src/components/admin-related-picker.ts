import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

/**
 * Multi-select picker for related entities (assignees, reporters,
 * linked issues, expenses, projects, etc.). Replaces the per-page
 * `add-relationship.hott` / `add-expense.hott` / `add-issue.hott` /
 * `add-user.hott` / `add-project.hott` components, which were all
 * variants of "type-to-search a list endpoint, click a result to add a
 * chip".
 *
 * Round-trips a flat array of ids through the shared field-io
 * populate/collect helpers. The outer wrapper carries `hot-field` and
 * the `fl-admin-related-picker` marker class. The internal ul holds
 * `<li data-id="…">` chips and a `data-display-cache='{"id":"name"}'`
 * attribute so the populate loop can render chip labels immediately
 * without a per-id GET.
 *
 * Usage:
 *   <admin-related-picker hot-field="assignees" hot-label="Assignees"
 *                         hot-list_url="/v1/relationships/list"
 *                         hot-jwt="${jwtToken}"
 *                         hot-placeholder="Search relationships…">
 *   </admin-related-picker>
 *
 * Server response shape expected: { data: [{id, name, ...}], length: N }.
 */
export class AdminRelatedPicker extends HotComponent
{
	/** Field name (required). */
	field: string;
	/** Visible label. */
	label: string;
	/** Search-list endpoint (required). */
	list_url: string;
	/** Key for the search term in the POST body. Defaults to "search". */
	list_payload_key: string;
	/** Entity field used as the chip label. Defaults to "name". */
	display_field: string;
	/** "1" (default) or "0". When "0", picking replaces instead of adds. */
	multi: string;
	/** JWT for the list endpoint. */
	jwt: string;
	/** Placeholder text for the search input. */
	placeholder: string;
	/** SSR initial value — comma-separated ids ("uuid,uuid,uuid"). Overwritten by populate loop on fetch return. */
	value: string;
	/** SSR display-name lookup ("uuid:Alice,uuid:Bob") seeding data-display-cache. */
	display_value: string;
	/** Bootstrap col class. */
	col: string;
	/** Debounce delay in ms between keystrokes and the search request. */
	debounce_ms: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag              = "admin-related-picker";
		this.field            = "";
		this.label            = "";
		this.list_url         = "";
		this.list_payload_key = "search";
		this.display_field    = "name";
		this.multi            = "1";
		this.jwt              = "";
		this.placeholder      = "Type to search…";
		this.value            = "";
		this.display_value    = "";
		this.col              = "";
		this.debounce_ms      = "200";
	}

	protected isMulti (): boolean
	{
		return (this.multi !== "0" && this.multi !== "false");
	}

	protected parseDisplayValue (): { [id: string]: string }
	{
		const out: { [id: string]: string } = {};
		if (!this.display_value) return (out);
		const parts = this.display_value.split (",");
		for (let i = 0; i < parts.length; i++)
		{
			const raw = parts[i].trim ();
			if (raw === "") continue;
			const colon = raw.indexOf (":");
			if (colon < 0) continue;
			out[raw.slice (0, colon)] = raw.slice (colon + 1);
		}
		return (out);
	}

	protected parseInitialIds (): string[]
	{
		if (!this.value) return ([]);
		return (this.value.split (",").map (s => s.trim ()).filter (s => s !== ""));
	}

	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		const wrappers = document.querySelectorAll (`.fl-admin-related-picker[hot-field="${this.field}"]`);
		for (let i = 0; i < wrappers.length; i++)
			this.wireOne (wrappers[i] as HTMLElement);
		return (null);
	}

	protected wireOne (wrapper: HTMLElement): void
	{
		if (wrapper.getAttribute ("data-wired") === "1") return;
		wrapper.setAttribute ("data-wired", "1");

		const self = this;
		const input       = wrapper.querySelector (".fl-arp-search") as HTMLInputElement | null;
		const suggestions = wrapper.querySelector (".fl-arp-suggestions") as HTMLElement | null;
		const chips       = wrapper.querySelector (".fl-arp-chips") as HTMLElement | null;
		if (input == null || suggestions == null || chips == null) return;

		let debounceTimer: any = null;
		const debounceMs = parseInt (this.debounce_ms, 10) || 200;

		input.addEventListener ("input", () =>
			{
				if (debounceTimer != null) clearTimeout (debounceTimer);
				debounceTimer = setTimeout (() => self.runSearch (wrapper, input.value), debounceMs);
			});

		input.addEventListener ("focus", () =>
			{
				if (input.value.trim () !== "")
					self.runSearch (wrapper, input.value);
			});

		input.addEventListener ("keydown", (e) =>
			{
				if (e.key === "Escape")
					self.clearSuggestions (suggestions);
			});

		// Click outside → close suggestions.
		document.addEventListener ("click", (e) =>
			{
				if (e.target instanceof Node && !wrapper.contains (e.target))
					self.clearSuggestions (suggestions);
			});

		// Chip remove buttons — event delegation since chips are
		// re-rendered by field-io.populateField on each populate.
		chips.addEventListener ("click", (e) =>
			{
				const target = e.target as HTMLElement;
				if (target == null) return;
				if (target.classList.contains ("fl-arp-chip-remove"))
				{
					const chip = target.closest ("[data-id]") as HTMLElement | null;
					if (chip != null) chip.remove ();
				}
			});
	}

	protected async runSearch (wrapper: HTMLElement, term: string): Promise<void>
	{
		const suggestions = wrapper.querySelector (".fl-arp-suggestions") as HTMLElement | null;
		if (suggestions == null) return;

		const trimmed = term.trim ();
		if (trimmed === "")
		{
			this.clearSuggestions (suggestions);
			return;
		}

		try
		{
			const headers: any = { "Content-Type": "application/json" };
			if (this.jwt) headers["Authorization"] = "Bearer " + this.jwt;
			const body: any = { offset: 0, limit: 20 };
			body[this.list_payload_key] = trimmed;
			const res = await fetch (this.list_url, {
				method: "POST", headers: headers, body: JSON.stringify (body)
			});
			if (!res.ok) { this.clearSuggestions (suggestions); return; }
			const json = await res.json ();
			const items: any[] = Array.isArray (json) ? json
				: (json && Array.isArray (json.data)) ? json.data
				: [];
			this.renderSuggestions (wrapper, suggestions, items);
		}
		catch (ex)
		{
			this.clearSuggestions (suggestions);
		}
	}

	protected renderSuggestions (wrapper: HTMLElement, suggestions: HTMLElement, items: any[]): void
	{
		const chips = wrapper.querySelector (".fl-arp-chips") as HTMLElement | null;
		const existing: Set<string> = new Set ();
		if (chips != null)
		{
			const have = chips.querySelectorAll ("[data-id]");
			for (let i = 0; i < have.length; i++)
			{
				const id = have[i].getAttribute ("data-id");
				if (id) existing.add (id);
			}
		}

		suggestions.innerHTML = "";
		if (items.length === 0)
		{
			const empty = document.createElement ("div");
			empty.className = "fl-arp-suggestion fl-arp-suggestion-empty";
			empty.textContent = "No matches";
			suggestions.appendChild (empty);
			suggestions.classList.add ("show");
			return;
		}

		for (let i = 0; i < items.length; i++)
		{
			const item = items[i];
			if (item == null || item.id == null) continue;
			const id = String (item.id);
			if (existing.has (id)) continue;
			const name = item[this.display_field] != null ? String (item[this.display_field]) : id;
			const row = document.createElement ("div");
			row.className = "fl-arp-suggestion";
			row.setAttribute ("data-id", id);
			row.setAttribute ("data-name", name);
			row.textContent = name;
			row.addEventListener ("click", (e) =>
				{
					e.preventDefault ();
					e.stopPropagation ();
					this.addChip (wrapper, id, name);
					const input = wrapper.querySelector (".fl-arp-search") as HTMLInputElement | null;
					if (input != null) input.value = "";
					this.clearSuggestions (suggestions);
				});
			suggestions.appendChild (row);
		}
		suggestions.classList.add ("show");
	}

	protected addChip (wrapper: HTMLElement, id: string, name: string): void
	{
		const chips = wrapper.querySelector (".fl-arp-chips") as HTMLElement | null;
		if (chips == null) return;

		if (!this.isMulti ())
		{
			// Single-select — wipe existing chips before adding.
			chips.innerHTML = "";
		}
		else if (chips.querySelector (`[data-id="${id.replace (/"/g, "")}"]`) != null)
		{
			return;
		}

		// Update display cache so subsequent populates can render the
		// name without a per-id GET.
		const cacheRaw = chips.getAttribute ("data-display-cache") || "{}";
		let cache: any = {};
		try { cache = JSON.parse (cacheRaw); } catch (ex) { cache = {}; }
		cache[id] = name;
		chips.setAttribute ("data-display-cache", JSON.stringify (cache));

		const li = document.createElement ("li");
		li.className = "fl-arp-chip";
		li.setAttribute ("data-id", id);
		li.innerHTML = `<span class="fl-arp-chip-label"></span><button type="button" class="fl-arp-chip-remove" aria-label="Remove">&times;</button>`;
		const label = li.querySelector (".fl-arp-chip-label") as HTMLElement;
		label.textContent = name;
		chips.appendChild (li);
	}

	protected clearSuggestions (suggestions: HTMLElement): void
	{
		suggestions.innerHTML = "";
		suggestions.classList.remove ("show");
	}

	output (): string | HotComponentOutput[]
	{
		if (this.field === "")
			throw new Error ("admin-related-picker: hot-field is required");
		if (this.list_url === "")
			throw new Error ("admin-related-picker: hot-list_url is required");

		const id          = `arp-${this.field}-${Math.random ().toString (36).slice (2, 7)}`;
		const labelHtml   = this.label
			? `<label for="${id}" class="form-label small mb-1">${this.label}</label>`
			: "";

		const cache       = this.parseDisplayValue ();
		const initialIds  = this.parseInitialIds ();
		const chipsHtml   = initialIds.map ((cid) =>
			{
				const name = cache[cid] != null ? cache[cid] : cid;
				const safeName = name.replace (/</g, "&lt;").replace (/>/g, "&gt;");
				return `<li class="fl-arp-chip" data-id="${cid}"><span class="fl-arp-chip-label">${safeName}</span><button type="button" class="fl-arp-chip-remove" aria-label="Remove">&times;</button></li>`;
			}).join ("");
		const cacheAttr = ` data-display-cache="${JSON.stringify (cache).replace (/"/g, "&quot;")}"`;

		const placeholderAttr = this.placeholder
			? ` placeholder="${this.placeholder.replace (/"/g, "&quot;")}"`
			: "";

		const inner = `
			<div class="fl-admin-related-picker" hot-field="${this.field}" data-display-field="${this.display_field}" data-multi="${this.isMulti () ? '1' : '0'}">
				${labelHtml}
				<div class="fl-arp-input-wrap position-relative">
					<input id="${id}" type="text" class="form-control form-control-sm fl-arp-search" autocomplete="off"${placeholderAttr}>
					<div class="fl-arp-suggestions"></div>
				</div>
				<ul class="fl-arp-chips list-unstyled"${cacheAttr}>${chipsHtml}</ul>
			</div>`;
		return (this.col ? `<div class="${this.col}">${inner}</div>` : inner);
	}
}
