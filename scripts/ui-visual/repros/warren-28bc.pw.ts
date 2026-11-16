/**
 * Reproduction for warren-28bc. `src/ui/src/index.css` set
 * `* { border-color: var(--color-border) }` outside any cascade layer.
 * Tailwind v4 emits its utilities inside `@layer utilities`, and an
 * unlayered declaration beats every layered one, so each border color
 * utility lost to it: `border-(--color-border-strong)` controls, the
 * `border-(--color-danger)` that marks an invalid Cost cap on Dispatch,
 * and the `border-transparent` badges all drew `--color-border`.
 *
 * The fix moves the rule into `@layer base`, where a utility wins. The
 * spec compares each element's computed border color with the color its
 * class names, resolved in the same page and theme. Desktop only: the
 * cascade does not depend on the viewport. Asserts on computed style,
 * never pixels.
 */

import { expect, type Locator, type Page, test } from "@playwright/test";

import { harnessCases, openCase } from "../harness.ts";

const SEED = "warren-28bc";

const { fixture, cases } = harnessCases();

/** The computed color of `color`, read from a scratch element in `page`. */
function resolveColor(page: Page, color: string): Promise<string> {
	return page.evaluate((value) => {
		const probe = document.createElement("div");
		probe.style.borderStyle = "solid";
		probe.style.borderColor = value;
		document.body.append(probe);
		const resolved = getComputedStyle(probe).borderTopColor;
		probe.remove();
		return resolved;
	}, color);
}

function borderColor(el: Locator): Promise<string> {
	return el.evaluate((node: HTMLElement) => getComputedStyle(node).borderTopColor);
}

for (const c of cases.filter((x) => x.page.id === "dispatch" && x.viewport === "desktop")) {
	test.describe(`${SEED} ${c.name}`, () => {
		test.use({ viewport: c.size, colorScheme: c.theme });

		test("a border-(--color-border-strong) control draws --color-border-strong", async ({
			page,
		}) => {
			await openCase(page, c, fixture);
			const costCap = page.getByPlaceholder("unset");
			await expect(costCap).toHaveClass(/border-\(--color-border-strong\)/);
			expect(await borderColor(costCap), "Cost cap border").toBe(
				await resolveColor(page, "var(--color-border-strong)"),
			);
		});

		test("an invalid Cost cap draws --color-danger", async ({ page }) => {
			await openCase(page, c, fixture);
			const costCap = page.getByPlaceholder("unset");
			await costCap.fill("-5");
			await expect(costCap).toHaveClass(/border-\(--color-danger\)/);
			const danger = await resolveColor(page, "var(--color-danger)");
			await expect.poll(() => borderColor(costCap), { message: "Cost cap border" }).toBe(danger);
		});
	});
}

for (const c of cases.filter((x) => x.page.id === "setup" && x.viewport === "desktop")) {
	test.describe(`${SEED} ${c.name}`, () => {
		test.use({ viewport: c.size, colorScheme: c.theme });

		test("a border-transparent badge draws no border color", async ({ page }) => {
			await openCase(page, c, fixture);
			const badges = page.locator(".border-transparent");
			await expect(badges.first()).toBeVisible();
			const transparent = await resolveColor(page, "transparent");
			const colors = await badges.evaluateAll((nodes) =>
				nodes.map((node) => getComputedStyle(node).borderTopColor),
			);
			expect(colors.length, "border-transparent badges on Setup").toBeGreaterThan(0);
			expect(new Set(colors), "border-transparent badge borders").toEqual(new Set([transparent]));
		});
	});
}
