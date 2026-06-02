import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

/**
 * One tab pane inside <admin-tab-page>. Renders a Bootstrap .tab-pane that
 * the parent relocates into the tab-content frame. The pane carries the
 * label on a data attribute so the parent can build its nav from the
 * relocated panes (no DOM coupling between parent and child beyond the
 * marker classes).
 *
 * Children placed inside <admin-tab> are NOT auto-relocated by this
 * component — the framework already places them inside our rendered div
 * via the hot-place-here slot below.
 *
 * Usage:
 *   <admin-tab name="general" hot-label="General">
 *       <admin-form-field hot-field="name" hot-label="Name"></admin-form-field>
 *   </admin-tab>
 */
export class AdminTab extends HotComponent
{
	/** Displayed in the parent's nav-tabs button. */
	label: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);
		this.tag   = "admin-tab";
		this.label = "";
	}

	output (): string | HotComponentOutput[]
	{
		if (this.name === "")
			throw new Error ("admin-tab: id (name) is required");
		if (this.label === "")
			throw new Error ("admin-tab: hot-label is required");

		return (`
			<div id="${this.name}" class="fl-atp-pane tab-pane fade" role="tabpanel" data-tab-label="${this.label.replace (/"/g, "&quot;")}">
				<hot-place-here name="tabBody"></hot-place-here>
			</div>`);
	}
}
