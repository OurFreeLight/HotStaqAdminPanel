import { HotStaq, Hot, HotAPI, HotComponent } from "hotstaq";

export class AdminButton extends HotComponent
{
	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-button";
	}

	async buttonClicked (): Promise<void>
	{
	}

	output (): string
	{
		return (`<button id = "${this.htmlElements[0].id}" onclick = "this.buttonClicked ();"></button>`);
	}
}
