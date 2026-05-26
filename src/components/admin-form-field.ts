import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

/**
 * A labeled form field. Wraps a single <input>, <select>, or <textarea>
 * with a proper <label>, an optional required-marker, and helper text.
 *
 * Replaces the boilerplate of hand-rolling label + input + small help
 * div across every Add/Edit form. Inspired by the Freelight pages
 * (volunteers.hott, yard-signs.hott, members.hott) where every field
 * already follows this pattern.
 *
 * Usage:
 *   <admin-form-field hot-field="name" hot-label="First name" hot-required="1"
 *                     hot-placeholder="e.g. Jane" hot-autocomplete="given-name">
 *   </admin-form-field>
 *
 *   <admin-form-field hot-field="status" hot-label="Status" hot-control="select"
 *                     hot-options="active,suspended,invited"></admin-form-field>
 *
 *   <admin-form-field hot-field="description" hot-label="Description"
 *                     hot-control="textarea" hot-rows="3"
 *                     hot-help="Shown on the public page."></admin-form-field>
 */
export class AdminFormField extends HotComponent
{
	/** The field name (used for hot-field and the label's `for` attribute). */
	field: string;
	/** The visible label text. */
	label: string;
	/** "1" / "true" to render the red required marker after the label. */
	required: string;
	/** input type when control is "input" (text, email, tel, number, date, etc). */
	type: string;
	/** Control kind: "input" (default) | "select" | "textarea" | "checkbox". */
	control: string;
	/** Placeholder text (ignored for type=date / control=select / checkbox). */
	placeholder: string;
	/** Autocomplete attribute value (given-name, email, tel, street-address, etc). */
	autocomplete: string;
	/** Small helper text shown below the input. */
	help: string;
	/** Comma-separated options when control="select". Each item can be "value:label" or just "value". */
	options: string;
	/** Rows for control="textarea". */
	rows: string;
	/** Minimum value for type=number. */
	min: string;
	/** Step for type=number. */
	step: string;
	/** Max length for input/textarea. */
	maxlength: string;
	/** Bootstrap column class for grid use, e.g. "col-md-6". Empty => no wrapper col. */
	col: string;
	/** Size: "sm" (default in the new theme) | "md". */
	size: string;
	/** Extra CSS classes for the input element itself. */
	css_class: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag           = "admin-form-field";
		this.field         = "";
		this.label         = "";
		this.required      = "0";
		this.type          = "text";
		this.control       = "input";
		this.placeholder   = "";
		this.autocomplete  = "";
		this.help          = "";
		this.options       = "";
		this.rows          = "3";
		this.min           = "";
		this.step          = "";
		this.maxlength     = "";
		this.col           = "";
		this.size          = "sm";
		this.css_class     = "";
	}

	/**
	 * Field renders inside the surrounding flow — no modal-body-relocation
	 * trick like admin-text does. The new components are designed for
	 * detail pages and inline add panels, not modals.
	 */
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		return (null);
	}

	private renderInput (id: string, sizeClass: string, classes: string): string
	{
		const minAttr  = this.min  ? ` min="${this.min}"`  : "";
		const stepAttr = this.step ? ` step="${this.step}"` : "";
		const maxAttr  = this.maxlength ? ` maxlength="${this.maxlength}"` : "";
		const acAttr   = this.autocomplete ? ` autocomplete="${this.autocomplete}"` : "";
		const phAttr   = (this.type === "date" || this.placeholder === "")
			? "" : ` placeholder="${this.placeholder.replace (/"/g, "&quot;")}"`;
		return `<input id="${id}" hot-field="${this.field}" type="${this.type}" class="form-control${sizeClass}${classes}"${minAttr}${stepAttr}${maxAttr}${acAttr}${phAttr} />`;
	}

	private renderSelect (id: string, sizeClass: string, classes: string): string
	{
		const opts = (this.options || "").split (",").map ((raw) =>
			{
				const part = raw.trim ();
				if (part === "") return "";
				const colon = part.indexOf (":");
				const val   = colon >= 0 ? part.slice (0, colon) : part;
				const lbl   = colon >= 0 ? part.slice (colon + 1) : part;
				return `<option value="${val.replace (/"/g, "&quot;")}">${lbl}</option>`;
			}).join ("");
		return `<select id="${id}" hot-field="${this.field}" class="form-select${sizeClass}${classes}">${opts}</select>`;
	}

	private renderTextarea (id: string, sizeClass: string, classes: string): string
	{
		const phAttr = this.placeholder ? ` placeholder="${this.placeholder.replace (/"/g, "&quot;")}"` : "";
		const maxAttr = this.maxlength ? ` maxlength="${this.maxlength}"` : "";
		return `<textarea id="${id}" hot-field="${this.field}" rows="${this.rows}" class="form-control${sizeClass}${classes}"${maxAttr}${phAttr}></textarea>`;
	}

	private renderCheckbox (id: string): string
	{
		return `<div class="form-check"><input id="${id}" hot-field="${this.field}" type="checkbox" class="form-check-input" /><label for="${id}" class="form-check-label">${this.label}</label></div>`;
	}

	output (): string | HotComponentOutput[]
	{
		if (this.field === "")
			throw new Error ("admin-form-field: hot-field is required");

		const id        = `ff-${this.field}-${Math.random ().toString (36).slice (2, 7)}`;
		const sizeClass = this.size === "sm" ? " form-control-sm" : "";
		const classes   = this.css_class ? " " + this.css_class : "";

		// Checkbox is a special case — the label sits next to the box,
		// not above. Skip the rest of the wrapping.
		if (this.control === "checkbox")
		{
			const inner = this.renderCheckbox (id);
			return (this.col ? `<div class="${this.col}">${inner}</div>` : inner);
		}

		let control = "";
		if (this.control === "select")        control = this.renderSelect   (id, sizeClass, classes);
		else if (this.control === "textarea") control = this.renderTextarea (id, sizeClass, classes);
		else                                  control = this.renderInput    (id, sizeClass, classes);

		const requiredMarker = (this.required === "1" || this.required === "true")
			? ` <span class="text-danger" aria-label="required">*</span>`
			: "";

		const helpHtml = this.help
			? `<div class="form-text small">${this.help}</div>`
			: "";

		const fieldHtml = `
			<label for="${id}" class="form-label small mb-1">${this.label}${requiredMarker}</label>
			${control}
			${helpHtml}`;

		return (this.col ? `<div class="${this.col}">${fieldHtml}</div>` : `<div>${fieldHtml}</div>`);
	}
}
