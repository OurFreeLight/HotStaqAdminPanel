// import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

// export class AdminCheckbox extends HotComponent
// {
// 	/**
// 	 * The associated database field.
// 	 */
// 	field: string;

// 	constructor (copy: HotComponent | HotStaq, api: HotAPI)
// 	{
// 		super (copy, api);

// 		this.tag = "admin-checkbox";
// 		this.field = "";
// 	}

// 	/**
// 	 * Corrects the placement of the text elements for modals.
// 	 */
// 	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
// 	{
// 		let placeHereArray = parentHtmlElement.querySelectorAll (`hot-place-here[type="modal"]`);

// 		if (placeHereArray.length > 0)
// 		{
// 			let placeHere = placeHereArray[0];
// 			parentHtmlElement.removeChild (htmlElement);
// 			placeHere.appendChild (htmlElement);
// 		}

// 		return (null);
// 	}

// 	output (): string | HotComponentOutput[]
// 	{
// 		let value: string = "";

// 		if (this.value != null)
// 		{
// 			if ((this.value === true) || (this.value === 1))
// 				value = "checked";
// 		}

// 		return (`<div>
// 			<label class="form-label">${this.inner}</label><input class="form-control" type = "checkbox" ${value} />
// 		</div>`);
// 	}
// }
