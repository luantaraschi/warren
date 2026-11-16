/**
 * Reproduction for warren-55f1. The plan chip in the plan-run detail header
 * carried a broken class list: `border-(--color-primary-border,` and
 * `var(--color-border-strong))` are halves of one arbitrary value that
 * Tailwind never compiled, and a class sort later moved them apart. The
 * chip drew a border with no color class, unlike its twin PR chip in the
 * child walk, which uses `border-(--color-border-strong)`.
 *
 * The chip only shows the right color once warren-28bc moves the global
 * `border-color` rule into `@layer base`; before that, every border drew
 * `--color-border`. Desktop only: the chip is the same on a phone. Asserts
 * on computed style, never pixels.
 */

import { expect, test } from "@playwright/test";

import { harnessCases, openCase } from "../harness.ts";

const SEED = "warren-55f1";

const { fixture, cases } = harnessCases();

for (const c of cases.filter((x) => x.page.id === "plan-run-detail" && x.viewport === "desktop")) {
	test.describe(`${SEED} ${c.name}`, () => {
		test.use({ viewport: c.size, colorScheme: c.theme });

		test("the plan chip draws --color-border-strong like the PR chip", async ({ page }) => {
			await openCase(page, c, fixture);
			const chip = page.locator("header").getByText(fixture.ids.planRun.planId, { exact: true });
			await expect(chip).toBeVisible();
			const strong = await page.evaluate(() => {
				const probe = document.createElement("div");
				probe.style.borderStyle = "solid";
				probe.style.borderColor = "var(--color-border-strong)";
				document.body.append(probe);
				const resolved = getComputedStyle(probe).borderTopColor;
				probe.remove();
				return resolved;
			});
			const border = await chip.evaluate((node: HTMLElement) => {
				const style = getComputedStyle(node);
				return { width: style.borderTopWidth, color: style.borderTopColor };
			});
			expect(border, "plan chip border").toEqual({ width: "1px", color: strong });
		});
	});
}
