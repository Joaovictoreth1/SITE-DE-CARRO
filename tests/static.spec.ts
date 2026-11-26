import { expect, test } from "@playwright/test";

test("opens the simulator and updates metrics when Firebase and media are unavailable", async ({
  page,
}, testInfo) => {
  await page.route("https://**/*", (route) => route.abort());
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      document.documentElement.dataset.cspViolation = event.violatedDirective;
    });
  });
  const response = await page.goto("/");
  const policy = response?.headers()["content-security-policy"];
  const trigger = page.getByRole("button", {
    name: /^(Simulador|Acessar Sistema)$/,
  });
  await trigger.click();
  const panel = page.getByRole("dialog", { name: /Painel de Comando/ });
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Visitante")).toBeVisible();
  await expect(panel.locator("#session-timer")).toHaveText("00:01");
  await expect(
    panel.getByRole("progressbar", { name: "Rotação do motor" }),
  ).toHaveAttribute("value", /^\d{4}$/);
  await expect(panel.locator("#rpm-history")).toHaveAttribute(
    "points",
    /\d+,\d+ \d+,\d+/,
  );
  await testInfo.attach("simulador-sem-firebase", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("script-src 'self'");
  expect(policy).not.toMatch(/unsafe-(inline|eval)/);
  await expect(page.locator("html")).not.toHaveAttribute("data-csp-violation");
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("keeps the poster until a clip is requested and recovers from a media failure", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route("https://s3.amazonaws.com/**", (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.route("https://images.unsplash.com/**", (route) => route.abort());
  await page.goto("/");
  const clip = page.locator("#hero-clip");
  expect(await clip.getAttribute("src")).toBeNull();
  expect(requests).toHaveLength(0);
  const button = page.getByRole("button", { name: "Vídeo de fundo" }).first();
  await button.click();
  await expect(page.getByText("Vídeo indisponível.").first()).toBeVisible();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(clip).toBeHidden();
  expect(requests).toHaveLength(1);
});

test("plays an explicitly requested clip and releases it when stopped", async ({
  page,
}) => {
  await page.route("https://images.unsplash.com/**", (route) => route.abort());
  await page.route("https://s3.amazonaws.com/**", (route) =>
    route.fulfill({
      path: "tests/fixtures/clip.webm",
      contentType: "video/webm",
    }),
  );
  await page.goto("/");
  const button = page.getByRole("button", { name: "Vídeo de fundo" }).first();
  const clip = page.locator("#hero-clip");
  await button.click();
  await expect(clip).toHaveClass(/playing/);
  await expect(clip).toHaveJSProperty("paused", false);
  await button.click();
  await expect(clip).toBeHidden();
  await expect(clip).not.toHaveAttribute("src");
});

test("preserves the legacy URL’s query and fragment", async ({ page }) => {
  await page.route("https://**/*", (route) => route.abort());
  await page.goto("/s2k_engineering_terminal.html?origem=antiga#fev");
  await expect(page).toHaveURL(/\?origem=antiga#fev$/);
  await expect(
    page.getByRole("heading", { name: /Manifesto F\.E\.V\./ }),
  ).toBeVisible();
});

test("offers mobile navigation and fits the simulator at 320 pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://**/*", (route) => route.abort());
  await page.goto("/");
  const archive = page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: "Arquivo" });
  await expect(archive).toBeVisible();
  await archive.click();
  await expect(page).toHaveURL(/#history$/);
  await page.getByRole("button", { name: "Simulador" }).click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds?.width).toBeLessThan(320);
  expect(bounds?.height).toBeLessThan(640);
  await panel.getByRole("button", { name: "Fechar" }).click();
  await expect(panel).not.toBeVisible();
});

test.describe("without scripts", () => {
  test.use({ javaScriptEnabled: false });
  test("still serves the archive and manifesto links", async ({ page }) => {
    await page.route("https://**/*", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /Celeritas\s+Levitas/,
    );
    await page
      .getByRole("navigation")
      .getByRole("link", { name: /Manifesto/ })
      .click();
    await expect(page).toHaveURL(/#fev$/);
    await expect(
      page.getByRole("heading", { name: /Manifesto F\.E\.V\./ }),
    ).toBeVisible();
  });
});
