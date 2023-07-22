import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

export class AdminText extends HotComponent
{
	/**
	 * If set to 1, this will not output the field.
	 */
	no_output: string;
	/**
	 * The classes to set for the input.
	 * @default "form-control"
	 */
	class: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-text";
		this.no_output = "0";
		this.class = "form-control"
	}

	/**
	 * Corrects the placement of the text elements for modals.
	 */
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		let placeHereArray = parentHtmlElement.querySelectorAll (`hot-place-here[type="modal"]`);

		// Search for the input box in the modal we attached to, then store the 
		// found input box into the fieldElements array.
		if (placeHereArray.length > 0)
		{
			let placeHere = placeHereArray[0];
			parentHtmlElement.removeChild (htmlElement);
			placeHere.appendChild (htmlElement);

			// @ts-ignore
			parentHtmlElement.hotComponent.fieldElements[this.field] = htmlElement.querySelector ("input");
		}

		return (null);
	}

	output (): string | HotComponentOutput[]
	{
		let value: string = "";

		if (this.value != null)
			value = this.value;

		if (this.no_output === "1")
			return (`<div><input class="${this.class}" type = "hidden" value = "${value}" /></div>`);

		const field = this.htmlElements[0].getAttribute ("hot-field");
		let field_type = this.htmlElements[0].getAttribute ("hot-field-type");

		if (field_type == null)
			field_type = "text";

		return (`<div>
			<label class="form-label">${this.inner}</label>
			<input class="${this.class}" type = "text" hot-field = "${field}" hot-field-type = "${field_type}" value = "${value}" />
		</div>`);
	}
}
