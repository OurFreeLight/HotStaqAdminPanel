import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

declare const Quill: any;

/**
 * Wraps a Quill 2.x editor as a [hot-field] form field that
 * round-trips a Quill Delta JSON string through admin-detail-page /
 * admin-row-edit / admin-add-panel. The outer wrapper carries the
 * `hot-field` attribute and the `fl-admin-rich-text` marker class, so
 * the shared field-io populate/collect helpers recognize it.
 *
 * Quill must already be loaded on the page (the DAO footer.hott loads
 * `quill.min.js` and `quill.snow.css` globally). This component is a
 * thin wrapper — it does not bundle Quill.
 *
 * Usage:
 *   <admin-rich-text hot-field="description" hot-label="Description"
 *                    hot-height="280px" hot-toolbar="basic"
 *                    hot-value="${quillDeltaJson}"></admin-rich-text>
 *
 * The optional `hot-value` is the initial Delta JSON for SSR — useful
 * when the parent page has the value at render time and wants to skip
 * the populate fetch round-trip flash.
 */
export class AdminRichText extends HotComponent
{
	/** The field name (used for hot-field and the label's `for` attribute). */
	field: string;
	/** The visible label text. */
	label: string;
	/** Editor height (e.g. "280px"). */
	height: string;
	/** "basic" | "full" — picks a toolbar preset. */
	toolbar: string;
	/** Placeholder shown in the editor body when empty. */
	placeholder: string;
	/** Initial Quill Delta JSON. Overwritten by the populate loop if a value comes back from fetch. */
	value: string;
	/** Bootstrap col class for grid use. */
	col: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag         = "admin-rich-text";
		this.field       = "";
		this.label       = "";
		this.height      = "260px";
		this.toolbar     = "basic";
		this.placeholder = "";
		this.value       = "";
		this.col         = "";
	}

	protected toolbarConfig (): any[]
	{
		if (this.toolbar === "full")
		{
			return ([
				[{ header: [false, 1, 2, 3] }],
				["bold", "italic", "underline", "strike"],
				[{ list: "ordered" }, { list: "bullet" }],
				[{ indent: "-1" }, { indent: "+1" }],
				["link", "blockquote", "code-block"],
				["clean"]
			]);
		}
		// basic (default) — matches the existing DAO footer Quill init.
		return ([
			[{ header: [false, 1, 2, 3] }],
			["bold", "italic", "underline"],
			["code-block"]
		]);
	}

	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		if (typeof Quill === "undefined")
			return (null);

		// Find our wrapper from the outer document — within an
		// admin-detail-page or admin-row-edit, the wrapper is the closest
		// .fl-admin-rich-text under us with our field name.
		const wrappers = document.querySelectorAll (`.fl-admin-rich-text[hot-field="${this.field}"]`);
		for (let i = 0; i < wrappers.length; i++)
		{
			const wrapper = wrappers[i] as HTMLElement;
			const innerEl = wrapper.querySelector (".fl-admin-rich-text-quill") as HTMLElement | null;
			if (innerEl == null) continue;
			// Idempotent: SPA re-fires can call onPostPlace again.
			if (Quill.find (innerEl) != null) continue;
			const q = new Quill (innerEl, {
				modules: { toolbar: this.toolbarConfig () },
				placeholder: this.placeholder || undefined,
				theme: "snow"
			});
			const initialJson = (wrapper.getAttribute ("data-initial-value") || "").trim ();
			if (initialJson !== "")
			{
				try { q.setContents (JSON.parse (initialJson)); }
				catch (ex) { /* leave editor empty */ }
			}
		}
		return (null);
	}

	output (): string | HotComponentOutput[]
	{
		if (this.field === "")
			throw new Error ("admin-rich-text: hot-field is required");

		const id            = `rt-${this.field}-${Math.random ().toString (36).slice (2, 7)}`;
		const labelHtml     = this.label
			? `<label for="${id}" class="form-label small mb-1">${this.label}</label>`
			: "";
		// Stash the SSR value on a data attribute, not as Quill innerHTML —
		// Delta JSON would be HTML-interpreted otherwise.
		const initialAttr = this.value
			? ` data-initial-value="${this.value.replace (/"/g, "&quot;")}"`
			: "";

		const inner = `
			<div class="fl-admin-rich-text" hot-field="${this.field}" data-toolbar="${this.toolbar}"${initialAttr}>
				${labelHtml}
				<div id="${id}" class="fl-admin-rich-text-quill" style="height:${this.height};"></div>
			</div>`;
		return (this.col ? `<div class="${this.col}">${inner}</div>` : inner);
	}
}
