import type { CloudConfig } from "./cloud-config.ts";
import type { Operator } from "./cloud.ts";
import { bindClips } from "./clips.ts";
import { bindDashboard } from "./dashboard.ts";
import { element } from "./dom.ts";

declare const __CLOUD_CONFIG__: CloudConfig | null;
declare const __USE_EMULATORS__: boolean;

const updateOperator = bindDashboard();
updateOperator(null);
bindClips();

async function bindCloud(config: CloudConfig) {
  const cloudState = element("#cloud-state", HTMLElement);
  cloudState.textContent = "Preparando o registro na nuvem…";
  const { openCloud, authErrorMessage } = await import("./cloud.ts");
  const cloud = openCloud(config, __USE_EMULATORS__);

  const authDialog = element("#auth-modal", HTMLDialogElement);
  const openAuth = element("#open-auth", HTMLButtonElement);
  const telemetryAuth = element("#telemetry-auth", HTMLButtonElement);
  const logout = element("#logout", HTMLButtonElement);
  const authForm = element("#auth-form", HTMLFormElement);
  const email = element("#auth-email", HTMLInputElement);
  const password = element("#auth-password", HTMLInputElement);
  const submitAuth = element("#submit-auth", HTMLButtonElement);
  const toggleAuth = element("#toggle-auth", HTMLButtonElement);
  const authTitle = element("#auth-title", HTMLElement);
  const authMessage = element("#auth-message", HTMLElement);
  const register = element("#register-telemetry", HTMLButtonElement);
  const telemetryMessage = element("#telemetry-message", HTMLElement);
  let operator: Operator | null = null;
  let registering = false;

  function setAuthMode(createAccount: boolean) {
    registering = createAccount;
    authTitle.textContent = createAccount
      ? "Criar conta MotorNews"
      : "Entrar na nuvem";
    submitAuth.textContent = createAccount ? "Criar conta" : "Entrar";
    toggleAuth.textContent = createAccount
      ? "Já tenho conta"
      : "Criar uma conta";
    password.autocomplete = createAccount ? "new-password" : "current-password";
    password.minLength = createAccount ? 8 : 0;
    password.value = "";
    authMessage.textContent = "";
  }

  for (const opener of [openAuth, telemetryAuth]) {
    opener.addEventListener("click", () => {
      authForm.reset();
      setAuthMode(false);
      authDialog.showModal();
    });
  }

  authDialog.addEventListener("close", () => {
    password.value = "";
  });
  toggleAuth.addEventListener("click", () => setAuthMode(!registering));

  cloud.observeAuth((identity) => {
    operator = identity;
    openAuth.hidden = telemetryAuth.hidden = Boolean(identity);
    logout.hidden = register.hidden = !identity;
    register.disabled = false;
    telemetryMessage.textContent = "";
    cloudState.textContent = identity
      ? "Sessão ativa. O registro é privado."
      : "Entre com sua conta para registrar o nó FEV-01.";
    updateOperator(identity?.email ?? null);
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitAuth.disabled) return;
    submitAuth.disabled = toggleAuth.disabled = true;
    authMessage.textContent = "";
    try {
      await cloud.signIn(email.value.trim(), password.value, registering);
      authForm.reset();
      if (authDialog.open) {
        authDialog.close();
        logout.focus();
      }
    } catch (error) {
      authMessage.textContent = authErrorMessage(error);
    } finally {
      submitAuth.disabled = toggleAuth.disabled = false;
    }
  });

  logout.addEventListener("click", async () => {
    logout.disabled = true;
    try {
      await cloud.signOut();
      openAuth.focus();
    } catch {
      cloudState.textContent =
        "Não foi possível encerrar a sessão. Tente novamente.";
    } finally {
      logout.disabled = false;
    }
  });

  register.addEventListener("click", async () => {
    const identity = operator;
    if (!identity || register.disabled) return;
    register.disabled = true;
    telemetryMessage.textContent = "Registrando nó FEV-01…";
    try {
      const status = await cloud.registerTelemetry(identity);
      if (operator !== identity) return;
      telemetryMessage.textContent =
        status === "created"
          ? "Nó FEV-01 registrado."
          : "O nó FEV-01 já está registrado.";
    } catch {
      if (operator === identity) {
        telemetryMessage.textContent =
          "Não foi possível registrar o nó. Tente novamente.";
      }
    } finally {
      if (operator === identity) register.disabled = false;
    }
  });
}

if (__CLOUD_CONFIG__) {
  void bindCloud(__CLOUD_CONFIG__).catch(() => {
    element("#cloud-state", HTMLElement).textContent =
      "Registro na nuvem indisponível. O simulador funciona sem conta.";
  });
}
