export interface CloudConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

const variables = {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  projectId: "FIREBASE_PROJECT_ID",
  appId: "FIREBASE_APP_ID",
} as const;

export function readCloudConfig(
  env: Record<string, string | undefined>,
): CloudConfig | null {
  const apiKey = env[variables.apiKey]?.trim();
  const authDomain = env[variables.authDomain]?.trim();
  const projectId = env[variables.projectId]?.trim();
  const appId = env[variables.appId]?.trim();
  if (!apiKey && !authDomain && !projectId && !appId) return null;

  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error(
      `Defina todos os campos Firebase ou nenhum: ${Object.values(variables).join(", ")}.`,
    );
  }

  if (!/^AIza[\w-]{35}$/.test(apiKey))
    throw new Error("FIREBASE_API_KEY inválida.");
  if (!/^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}$/i.test(authDomain)) {
    throw new Error(
      "FIREBASE_AUTH_DOMAIN deve ser um domínio, sem URL ou caminho.",
    );
  }
  if (!/^[a-z][a-z\d-]{4,28}[a-z\d]$/.test(projectId)) {
    throw new Error("FIREBASE_PROJECT_ID inválido.");
  }
  if (!/^1:\d+:web:[a-f\d]+$/i.test(appId))
    throw new Error("FIREBASE_APP_ID inválido.");
  return { apiKey, authDomain, projectId, appId };
}
