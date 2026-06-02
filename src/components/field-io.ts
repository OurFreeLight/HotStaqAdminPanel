/**
 * Shared populate/collect/reset helpers used by admin-detail-page,
 * admin-row-edit, and admin-add-panel. All three iterate `[hot-field]`
 * descendants and round-trip their values against a plain object —
 * the only meaningful difference between their old implementations was
 * which subset of the cases they covered. Centralizing here means:
 *
 *  - Each host component is ~30 lines lighter.
 *  - New field types (admin-rich-text, admin-related-picker) plug in
 *    once and immediately work in all three hosts.
 *  - The "marker class on the outer wrapper, custom IO inside" pattern
 *    is consistent across rich-text and related-picker (and any future
 *    composite field). No special-casing in the hosts.
 *
 * Conventions a custom field component must satisfy to opt in:
 *  - Outer element has `hot-field="<name>"`.
 *  - Outer element has a known marker class (e.g. fl-admin-rich-text).
 *  - The IO branch below knows how to read/write that wrapper's state.
 *
 * Plain inputs/selects/textareas/checkboxes keep their existing
 * .value / .checked behavior — no marker class needed.
 */

/**
 * Read the value out of an element addressable by hot-field.
 *
 * Returns the symbol SKIP_FIELD when the element is a self-managed
 * sub-component that posts its own data (e.g. admin-approval-panel
 * which writes on change and isn't part of the parent's save payload).
 * Callers should filter SKIP_FIELD before assigning into the payload
 * object.
 */
export const SKIP_FIELD = Symbol ("SKIP_FIELD");

declare const Quill: any;

function findRichTextQuill (wrapper: HTMLElement): any | null
{
	if (typeof Quill === "undefined") return (null);
	const inner = wrapper.querySelector (".fl-admin-rich-text-quill") as HTMLElement | null;
	if (inner == null) return (null);
	return (Quill.find (inner));
}

function richTextRead (wrapper: HTMLElement): string
{
	const q = findRichTextQuill (wrapper);
	if (q == null) return ("");
	try { return JSON.stringify (q.getContents ()); }
	catch (ex) { return (""); }
}

function richTextWrite (wrapper: HTMLElement, val: any): void
{
	let delta: any = null;
	let serialized = "";
	if (typeof val === "string" && val !== "")
	{
		serialized = val;
		try { delta = JSON.parse (val); } catch (ex) { delta = null; }
	}
	else if (val != null && typeof val === "object")
	{
		delta = val;
		try { serialized = JSON.stringify (val); } catch (ex) { serialized = ""; }
	}

	const q = findRichTextQuill (wrapper);
	if (q == null)
	{
		// Quill hasn't bound yet — happens when admin-detail-page's
		// fetchAndFill races admin-rich-text's onPostPlace. Stash the
		// value on data-initial-value; admin-rich-text reads it when
		// it finally binds Quill.
		if (serialized) wrapper.setAttribute ("data-initial-value", serialized);
		return;
	}
	// setContents (not updateContents) so re-populates don't stack.
	q.setContents (delta != null ? delta : [{ insert: "\n" }]);
}

function relatedPickerCache (wrapper: HTMLElement): { [id: string]: string }
{
	const ul = wrapper.querySelector (".fl-arp-chips") as HTMLElement | null;
	if (ul == null) return ({});
	const raw = ul.getAttribute ("data-display-cache");
	if (!raw) return ({});
	try { return (JSON.parse (raw)); } catch (ex) { return ({}); }
}

function relatedPickerSetCache (wrapper: HTMLElement, cache: { [id: string]: string }): void
{
	const ul = wrapper.querySelector (".fl-arp-chips") as HTMLElement | null;
	if (ul == null) return;
	ul.setAttribute ("data-display-cache", JSON.stringify (cache));
}

function relatedPickerRead (wrapper: HTMLElement): Array<{ id: string }>
{
	// Emits [{id}, …] (NOT bare ids) because DAO entity-edit endpoints
	// take relationship-link arrays in {id} shape — Issue.assignees,
	// Issue.reporters, Issue.expenses, Plan.issues, etc. Symmetric with
	// the {id, name} objects the populate side accepts.
	const ul = wrapper.querySelector (".fl-arp-chips") as HTMLElement | null;
	if (ul == null) return ([]);
	const out: Array<{ id: string }> = [];
	const chips = ul.querySelectorAll ("[data-id]");
	for (let i = 0; i < chips.length; i++)
	{
		const id = chips[i].getAttribute ("data-id");
		if (id) out.push ({ id: id });
	}
	return (out);
}

function relatedPickerRender (wrapper: HTMLElement, ids: string[], cache: { [id: string]: string }): void
{
	const ul = wrapper.querySelector (".fl-arp-chips") as HTMLElement | null;
	if (ul == null) return;
	// Wipe + redraw. Caller of populate is authoritative here.
	ul.innerHTML = "";
	for (let i = 0; i < ids.length; i++)
	{
		const id = ids[i];
		const name = cache[id] != null ? cache[id] : id;
		const li = document.createElement ("li");
		li.className = "fl-arp-chip";
		li.setAttribute ("data-id", id);
		li.innerHTML = `<span class="fl-arp-chip-label"></span><button type="button" class="fl-arp-chip-remove" aria-label="Remove">&times;</button>`;
		const label = li.querySelector (".fl-arp-chip-label") as HTMLElement;
		label.textContent = name;
		ul.appendChild (li);
	}
}

function relatedPickerWrite (wrapper: HTMLElement, val: any): void
{
	// Accepts:
	//   - array of {id, name} entity objects (preferred, fills cache)
	//   - array of ids (strings)
	//   - comma-separated string of ids
	let ids: string[] = [];
	const cache = relatedPickerCache (wrapper);
	const displayField = wrapper.getAttribute ("data-display-field") || "name";

	if (typeof val === "string")
	{
		ids = val.split (",").map (s => s.trim ()).filter (s => s !== "");
	}
	else if (Array.isArray (val))
	{
		for (let i = 0; i < val.length; i++)
		{
			const item = val[i];
			if (item == null) continue;
			if (typeof item === "string")
			{
				ids.push (item);
			}
			else if (typeof item === "object" && item.id != null)
			{
				ids.push (String (item.id));
				if (item[displayField] != null)
					cache[String (item.id)] = String (item[displayField]);
			}
		}
	}

	relatedPickerSetCache (wrapper, cache);
	relatedPickerRender (wrapper, ids, cache);
}

/**
 * Read a value off one [hot-field] element.
 * Returns SKIP_FIELD for self-managing sub-components that don't
 * contribute to the parent's save payload.
 */
export function collectField (elm: Element): any
{
	if (!(elm instanceof HTMLElement)) return (SKIP_FIELD);

	if (elm.classList.contains ("fl-admin-rich-text"))
		return (richTextRead (elm));

	if (elm.classList.contains ("fl-admin-related-picker"))
		return (relatedPickerRead (elm));

	if (elm.classList.contains ("fl-admin-approval-panel"))
		return (SKIP_FIELD);

	// admin-file-upload returns FILE_MARKER objects that the host save
	// handler unpacks into a multipart upload. See collectFieldValuesWithFiles
	// below for the host-side helper that splits these out of the JSON
	// payload before the save POST.
	if (elm.classList.contains ("fl-admin-file-upload"))
		return (fileUploadRead (elm));

	if (elm instanceof HTMLInputElement)
	{
		if (elm.type === "checkbox")     return (elm.checked);
		if (elm.type === "number")       return (elm.value === "" ? null : Number (elm.value));
		return (elm.value);
	}
	if (elm instanceof HTMLSelectElement)   return (elm.value);
	if (elm instanceof HTMLTextAreaElement) return (elm.value);
	return (SKIP_FIELD);
}

/**
 * Push a value into one [hot-field] element. `null`/`undefined` clears.
 */
export function populateField (elm: Element, val: any): void
{
	if (!(elm instanceof HTMLElement)) return;

	if (elm.classList.contains ("fl-admin-rich-text"))
	{
		richTextWrite (elm, val);
		return;
	}

	if (elm.classList.contains ("fl-admin-related-picker"))
	{
		relatedPickerWrite (elm, val);
		return;
	}

	if (elm.classList.contains ("fl-admin-approval-panel"))
	{
		// Self-managing — admin-approval-panel loads its own state from
		// its hot-id attribute on mount, and posts directly on change.
		return;
	}

	if (elm.classList.contains ("fl-admin-file-upload"))
	{
		fileUploadWrite (elm, val);
		return;
	}

	// Expanded relationship fields come back as { id, name, ... } when
	// the parent admin-detail-page sends expanded=1 (so related-pickers
	// can render chip labels without a per-id GET). For a plain select
	// or input that's just storing an id reference, unwrap to the .id.
	if (val != null && typeof val === "object" && !Array.isArray (val) && typeof (val as any).id === "string")
		val = (val as any).id;

	if (elm instanceof HTMLInputElement)
	{
		if (elm.type === "checkbox")
		{
			elm.checked = (val === true || val === "true" || val === 1);
			return;
		}
		// HTML date inputs require the literal "YYYY-MM-DD" format and
		// silently drop to empty string for ISO timestamps like
		// "2026-12-15T00:00:00.000Z" — common shape from PostgreSQL
		// DATE/TIMESTAMP columns. Coerce here so the editor pre-fills
		// instead of going blank.
		if (elm.type === "date" && typeof val === "string" && val.length >= 10 && val.charAt (4) === "-")
		{
			elm.value = val.slice (0, 10);
			return;
		}
		if (elm.type === "datetime-local" && typeof val === "string" && val.length >= 16)
		{
			// "YYYY-MM-DDTHH:MM" — strip the seconds/ms/Z that ISO carries.
			elm.value = val.slice (0, 16);
			return;
		}
		elm.value = (val == null ? "" : String (val));
		return;
	}
	if (elm instanceof HTMLSelectElement)   { elm.value = (val == null ? "" : String (val)); return; }
	if (elm instanceof HTMLTextAreaElement) { elm.value = (val == null ? "" : String (val)); return; }
}

/**
 * Clear one [hot-field] element back to its empty state.
 */
export function resetField (elm: Element): void
{
	if (!(elm instanceof HTMLElement)) return;

	if (elm.classList.contains ("fl-admin-rich-text"))
	{
		richTextWrite (elm, null);
		return;
	}
	if (elm.classList.contains ("fl-admin-related-picker"))
	{
		relatedPickerRender (elm, [], relatedPickerCache (elm));
		return;
	}
	if (elm.classList.contains ("fl-admin-approval-panel"))
		return;

	if (elm.classList.contains ("fl-admin-file-upload"))
	{
		fileUploadReset (elm);
		return;
	}

	if (elm instanceof HTMLInputElement)
	{
		if (elm.type === "checkbox") elm.checked = false;
		else elm.value = "";
		return;
	}
	if (elm instanceof HTMLSelectElement)   { elm.selectedIndex = 0; return; }
	if (elm instanceof HTMLTextAreaElement) { elm.value = ""; return; }
}

/**
 * Marker returned by collectField for file-upload wrappers. The host save
 * handler uses splitFilesFromValues to pull these out before posting.
 */
export const FILE_FIELD_MARKER = "__fl_file_field__";

/** Read the current selection / clear flag off an admin-file-upload wrapper. */
function fileUploadRead (wrapper: HTMLElement): any
{
	const file: any = (wrapper as any).__afuFile;
	const cleared: boolean = (wrapper as any).__afuCleared === true;
	if (file != null)
		return ({ [FILE_FIELD_MARKER]: true, file: file, cleared: false });
	if (cleared)
		return ({ [FILE_FIELD_MARKER]: true, file: null, cleared: true });
	return (SKIP_FIELD);
}

/** Update the "current file" link from the populated value (entity id or {id}). */
function fileUploadWrite (wrapper: HTMLElement, val: any): void
{
	(wrapper as any).__afuFile = null;
	(wrapper as any).__afuCleared = false;
	const input = wrapper.querySelector (".fl-afu-input") as HTMLInputElement | null;
	if (input != null) input.value = "";
	const status = wrapper.querySelector (".fl-afu-status") as HTMLElement | null;
	if (status != null) status.textContent = "";

	const link = wrapper.querySelector (".fl-afu-link") as HTMLAnchorElement | null;
	if (link == null) return;
	const dlUrl = wrapper.getAttribute ("data-download-url") || "";
	const idParam = wrapper.getAttribute ("data-id-param") || "id";

	// val can be the entity's id (string) or the full row object (so we
	// can read row.id). The host populateFields passes obj[field] which
	// for file_url-style schemas is usually a string already; for the
	// "always re-derive from row id" path the host can pass {id: row.id}.
	let id: string = "";
	if (typeof val === "string") id = val;
	else if (val != null && typeof val === "object" && val.id) id = String (val.id);

	if (dlUrl !== "" && id !== "")
	{
		link.href = dlUrl + (dlUrl.indexOf ("?") >= 0 ? "&" : "?") + idParam + "=" + encodeURIComponent (id);
		link.classList.remove ("d-none");
	}
	else
	{
		link.href = "";
		link.classList.add ("d-none");
	}
}

function fileUploadReset (wrapper: HTMLElement): void
{
	(wrapper as any).__afuFile = null;
	(wrapper as any).__afuCleared = false;
	const input = wrapper.querySelector (".fl-afu-input") as HTMLInputElement | null;
	if (input != null) input.value = "";
	const link = wrapper.querySelector (".fl-afu-link") as HTMLAnchorElement | null;
	if (link != null) { link.classList.add ("d-none"); link.href = ""; }
	const status = wrapper.querySelector (".fl-afu-status") as HTMLElement | null;
	if (status != null) status.textContent = "";
}

/**
 * Walk a collected-values object and pull out file markers. Returns
 *   { values, files, cleared }
 * where:
 *  - values   has the file markers removed (caller posts this as JSON)
 *  - files    is the multipart map { fieldName: File } for the upload phase
 *  - cleared  lists field names the user explicitly cleared (so the save
 *             handler can decide whether to send a sentinel like null)
 */
export function splitFilesFromValues (collected: any): { values: any, files: { [k: string]: any }, cleared: string[] }
{
	const values: any = {};
	const files: { [k: string]: any } = {};
	const cleared: string[] = [];
	if (collected == null) return ({ values, files, cleared });
	for (const k of Object.keys (collected))
	{
		const v = collected[k];
		if (v != null && typeof v === "object" && v[FILE_FIELD_MARKER] === true)
		{
			if (v.file != null) files[k] = v.file;
			if (v.cleared === true) cleared.push (k);
			// Do NOT copy v into values — the JSON payload should not carry the marker.
			continue;
		}
		values[k] = v;
	}
	return ({ values, files, cleared });
}

/**
 * Walk all [hot-field] descendants of root and populate from obj[field].
 * Fields missing from obj are left untouched (NOT cleared) so callers
 * can do partial populates without wiping unset fields.
 */
export function populateFields (root: HTMLElement, obj: any): void
{
	if (obj == null) return;
	const nodes = root.querySelectorAll ("[hot-field]");
	for (let i = 0; i < nodes.length; i++)
	{
		const el = nodes[i];
		const field = el.getAttribute ("hot-field");
		if (field == null || field === "") continue;
		if (!(field in obj)) continue;
		populateField (el, obj[field]);
	}
}

/**
 * Walk all [hot-field] descendants of root and return an object of
 * { field: value }. Skips fields whose IO is self-managed.
 */
export function collectFieldValues (root: HTMLElement): any
{
	const out: any = {};
	const nodes = root.querySelectorAll ("[hot-field]");
	for (let i = 0; i < nodes.length; i++)
	{
		const el = nodes[i];
		const field = el.getAttribute ("hot-field");
		if (field == null || field === "") continue;
		const val = collectField (el);
		if (val === SKIP_FIELD) continue;
		out[field] = val;
	}
	return (out);
}

/**
 * Walk all [hot-field] descendants of root and reset each to empty.
 */
export function resetFields (root: HTMLElement): void
{
	const nodes = root.querySelectorAll ("[hot-field]");
	for (let i = 0; i < nodes.length; i++)
		resetField (nodes[i]);
}
