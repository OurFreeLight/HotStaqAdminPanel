import { HotStaq, Hot, HotAPI, HotComponent, IHotComponent } from "hotstaq";

export class AdminButton extends HotComponent
{
	constructor (copy: IHotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-button";
	}

    async buttonClicked ()
    {
    }

	async output ()
	{
		return (`<button id = "${this.htmlElements[0].id}" onclick = "this.buttonClicked ();"></button>`);
	}
}

Hot.CurrentPage.processor.addComponent (AdminButton);