import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const password = "synthetic-test-pass!";
const newEmail = () => `operator-${randomUUID()}@example.test`;

async function enter(page: Page, email: string, create = false) {
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  if (create)
    await dialog.getByRole("button", { name: "Criar uma conta" }).click();
  await dialog.getByLabel("E-mail").fill(email);
  await dialog.getByLabel("Senha").fill(password);
  await dialog
    .getByRole("button", {
      name: create ? "Criar conta" : "Entrar",
      exact: true,
    })
    .click();
  return dialog;
}

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", (route) => route.abort());
  await page.goto("/");
});

test("creates an operator and handles concurrent registration on the same account", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const email = newEmail();
  await enter(page, email, true);
  await expect(page.getByRole("dialog")).not.toBeVisible();

  const otherContext = await browser.newContext({ baseURL });
  try {
    const second = await otherContext.newPage();
    await second.route("https://**/*", (route) => route.abort());
    await second.goto("/");
    await enter(second, email);

    await Promise.all(
      [page, second].map((tab) =>
        tab.getByRole("button", { name: "Registrar nó FEV-01" }).click(),
      ),
    );
    const results = await Promise.all(
      [page, second].map(async (tab) => {
        const message = tab.locator("#telemetry-message");
        await expect(message).toHaveText(
          /^(Nó FEV-01 registrado\.|O nó FEV-01 já está registrado\.)$/,
        );
        return message.textContent();
      }),
    );
    expect(results.sort()).toEqual([
      "Nó FEV-01 registrado.",
      "O nó FEV-01 já está registrado.",
    ]);

    const createdPage =
      (await page.locator("#telemetry-message").textContent()) ===
      "Nó FEV-01 registrado."
        ? page
        : second;
    await createdPage.setViewportSize({ width: 1280, height: 900 });
    await createdPage.emulateMedia({ reducedMotion: "reduce" });
    await createdPage
      .locator("#engineering")
      .evaluate((section) => section.scrollIntoView());
    await testInfo.attach("registro-confirmado", {
      body: await createdPage.screenshot(),
      contentType: "image/png",
    });
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Entrar", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Registrar nó FEV-01" }),
    ).not.toBeVisible();

    await enter(page, email);
    await page.getByRole("button", { name: "Registrar nó FEV-01" }).click();
    await expect(page.locator("#telemetry-message")).toHaveText(
      "O nó FEV-01 já está registrado.",
    );

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Entrar", exact: true }),
    ).toBeVisible();
  } finally {
    await otherContext.close();
  }
});

test("reports a failed login without disabling the simulator", async ({
  page,
}) => {
  const dialog = await enter(page, newEmail());
  await expect(dialog.getByRole("alert")).toHaveText(
    "E-mail ou senha inválidos.",
  );
  await expect(
    dialog.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Simulador" }).click();
  await expect(
    page.getByRole("dialog", { name: "Painel de Comando" }),
  ).toBeVisible();
});

test("reports a denied write and lets the operator retry", async ({ page }) => {
  await enter(page, newEmail(), true);
  const command = page.getByRole("button", { name: "Registrar nó FEV-01" });
  const write = (url: URL) =>
    url.port === "8081" && url.pathname.endsWith("/documents:commit");
  await page.route(write, (route) =>
    route.fulfill({
      status: 403,
      headers: { "access-control-allow-origin": "*" },
      json: {
        error: {
          code: 403,
          message: "fixture denial",
          status: "PERMISSION_DENIED",
        },
      },
    }),
  );
  await command.click();
  await expect(page.locator("#telemetry-message")).toHaveText(
    "Não foi possível registrar o nó. Tente novamente.",
  );
  await expect(command).toBeEnabled();
  await page.unroute(write);
  await command.click();
  await expect(page.locator("#telemetry-message")).toHaveText(
    "Nó FEV-01 registrado.",
  );
});

test("keeps the simulator usable when the cloud module cannot load", async ({
  page,
}) => {
  await page.route(/\/assets\/cloud-[^/]+\.js$/, (route) => route.abort());
  await page.reload();
  await expect(page.locator("#cloud-state")).toHaveText(
    "Registro na nuvem indisponível. O simulador funciona sem conta.",
  );
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Simulador" }).click();
  await expect(
    page.getByRole("dialog", { name: "Painel de Comando" }),
  ).toBeVisible();
});
