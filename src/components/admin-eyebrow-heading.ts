import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

/**
 * A page heading with a small uppercase "eyebrow" label above it.
 * Pattern lifted from the /live page on Freelight — the "Live Campaign
 * Page" label above the candidate name.
 *
 * Usage:
 *   <admin-eyebrow-heading hot-eyebrow="Campaign Project"
 *                          hot-heading="Q4 Outreach Plan"></admin-eyebrow-heading>
 */
export class AdminEyebrowHeading extends HotComponent
{
	/** The small uppercase label rendered above the heading. */
	eyebrow: string;
	/** The h1 text. */
	heading: string;
	/** Optional muted subtitle rendered below the heading. */
	subtitle: string;
	/** "center" | "start" (default). */
	align: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag      = "admin-eyebrow-heading";
		this.eyebrow  = "";
		this.heading  = "";
		this.subtitle = "";
		this.align    = "start";
	}

	output (): string | HotComponentOutput[]
	{
		const alignClass = this.align === "center" ? "text-center" : "";
		const eyebrow = this.eyebrow
			? `<div class="text-uppercase text-muted small mb-2" style="letter-spacing:0.08em;">${this.eyebrow}</div>`
			: "";
		const subtitle = this.subtitle
			? `<p class="text-muted mb-0">${this.subtitle}</p>`
			: "";
		return `
			<div class="fl-eyebrow-heading mb-3 ${alignClass}">
				${eyebrow}
				<h1 class="h3 mb-1">${this.heading || this.inner || ""}</h1>
				${subtitle}
			</div>`;
	}
}
