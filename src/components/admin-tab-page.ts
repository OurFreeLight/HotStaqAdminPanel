import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

/**
 * Bootstrap nav-tabs primitive. Children are <admin-tab> elements, each
 * carrying a hot-label string + arbitrary content (form-fields, card-tables,
 * lists, etc.). The parent renders the .nav-tabs list and the .tab-content
 * frame; onPostPlace relocates each child .fl-atp-pane into the frame and
 * builds the nav from each pane's data-tab-label.
 *
 * Usage:
 *   <admin-tab-page name="settingsPage">
 *       <admin-tab name="general" hot-label="General">
 *           <admin-form-field hot-field="orgName" hot-label="Org name"></admin-form-field>
 *       </admin-tab>
 *       <admin-tab name="security" hot-label="Security">
 *           <admin-form-field hot-field="enable2FA" hot-control="checkbox"></admin-form-field>
 *       </admin-tab>
 *   </admin-tab-page>
 *
 * The active tab is read from the URL hash on mount (#general), and updated
 * on every tab click so refreshes / shared links land on the same tab.
 */
export class AdminTabPage extends HotComponent
{
	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);
		this.tag = "admin-tab-page";
	}

	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		const self = this;
		const root = document.getElementById (this.name);
		if (root == null) return (null);

		const nav   = root.querySelector (".fl-atp-nav")     as HTMLElement | null;
		const frame = root.querySelector (".fl-atp-content") as HTMLElement | null;
		if (nav == null || frame == null) return (null);

		// Relocate every child .fl-atp-pane into the content frame. The
		// framework appends admin-tab outputs as direct children of root.
		const panes: HTMLElement[] = [];
		Array.from (root.children).forEach ((child) =>
			{
				const el = child as HTMLElement;
				if (el === nav || el === frame) return;
				if (el.classList.contains ("fl-atp-pane"))
				{
					frame.appendChild (el);
					panes.push (el);
				}
			});
		// Children placed inside the frame area (e.g. by admin-detail-page's
		// auto-relocate that some pages chain) are also possible.
		Array.from (frame.children).forEach ((child) =>
			{
				const el = child as HTMLElement;
				if (el.classList.contains ("fl-atp-pane") && panes.indexOf (el) < 0)
					panes.push (el);
			});

		if (panes.length === 0) return (null);

		// Decide which tab starts active. URL hash wins; otherwise the first
		// pane. Hash matches against the pane's id.
		const hash = (window.location.hash || "").replace (/^#/, "");
		let activeIdx = 0;
		if (hash !== "")
		{
			for (let i = 0; i < panes.length; i++)
			{
				if (panes[i].id === hash) { activeIdx = i; break; }
			}
		}

		// Build nav items from each pane's data-tab-label. Keep the link
		// targets as fragment URLs so middle-click / right-click / share
		// produces a sensible URL.
		const navHtml = panes.map ((pane, i) =>
			{
				const label = pane.getAttribute ("data-tab-label") || pane.id;
				const cls   = "nav-link" + (i === activeIdx ? " active" : "");
				return `<li class="nav-item" role="presentation">`
					+ `<a class="${cls}" href="#${pane.id}" data-pane-id="${pane.id}" role="tab">`
					+ self.escapeHtml (label)
					+ `</a></li>`;
			}).join ("");
		nav.innerHTML = navHtml;

		panes.forEach ((pane, i) =>
			{
				pane.classList.add ("tab-pane");
				if (i === activeIdx) { pane.classList.add ("show", "active"); }
				else { pane.classList.remove ("show", "active"); }
			});

		// Delegated click on the nav. Lives on the .fl-atp-nav so it
		// survives if nav is re-rendered.
		nav.addEventListener ("click", (e) =>
			{
				const target = e.target as HTMLElement;
				const link = target.closest ("a[data-pane-id]") as HTMLElement | null;
				if (link == null) return;
				e.preventDefault ();
				const paneId = link.getAttribute ("data-pane-id");
				if (paneId == null) return;
				self.activateTab (root, paneId);
				// Update URL hash so refresh / share preserves the tab.
				try { history.replaceState (null, "", "#" + paneId); }
				catch (ex) { window.location.hash = paneId; }
			});

		return (null);
	}

	protected activateTab (root: HTMLElement, paneId: string): void
	{
		const nav   = root.querySelector (".fl-atp-nav")     as HTMLElement | null;
		const frame = root.querySelector (".fl-atp-content") as HTMLElement | null;
		if (nav == null || frame == null) return;

		Array.from (nav.querySelectorAll ("a[data-pane-id]")).forEach ((a) =>
			{
				const el = a as HTMLElement;
				if (el.getAttribute ("data-pane-id") === paneId) el.classList.add ("active");
				else el.classList.remove ("active");
			});
		Array.from (frame.children).forEach ((c) =>
			{
				const el = c as HTMLElement;
				if (!el.classList.contains ("fl-atp-pane")) return;
				if (el.id === paneId) el.classList.add ("show", "active");
				else el.classList.remove ("show", "active");
			});
	}

	protected escapeHtml (s: any): string
	{
		return String (s == null ? "" : s)
			.replace (/&/g, "&amp;").replace (/</g, "&lt;").replace (/>/g, "&gt;")
			.replace (/"/g, "&quot;").replace (/'/g, "&#39;");
	}

	output (): string | HotComponentOutput[]
	{
		if (this.name === "")
			throw new Error ("admin-tab-page: id (name) is required");

		return (`
			<div id="${this.name}" class="fl-admin-tab-page">
				<ul class="nav nav-tabs fl-atp-nav" role="tablist"></ul>
				<div class="tab-content fl-atp-content"></div>
			</div>`);
	}
}
