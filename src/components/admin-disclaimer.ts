import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

/**
 * Pinned info card — short headline + body text, indigo left border.
 * Pattern lifted from the DonorTiers "No governance influence"
 * disclaimer on /donorTiers. Useful for "no influence", "draft only",
 * "internal use", etc. notes that belong above the main content.
 *
 * Usage:
 *   <admin-disclaimer hot-heading="Disclaimer">
 *     The body text of the disclaimer goes here.
 *   </admin-disclaimer>
 */
export class AdminDisclaimer extends HotComponent
{
	/** Heading (h2.h6). */
	heading: string;
	/** Accent color for the left border. */
	accent: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag     = "admin-disclaimer";
		this.heading = "";
		this.accent  = "#4f46e5";
	}

	output (): string | HotComponentOutput[]
	{
		const heading = this.heading ? `<h2 class="h6 mb-2" style="letter-spacing:0.02em;">${this.heading}</h2>` : "";
		return `
			<div class="card fl-disclaimer mb-3" style="border-left:4px solid ${this.accent};">
				<div class="card-body">
					${heading}
					<div class="mb-0 text-muted" style="font-size:0.9rem;line-height:1.45;">
						${this.inner || ""}
					</div>
				</div>
			</div>`;
	}
}
