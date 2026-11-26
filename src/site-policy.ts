import { readFileSync } from "node:fs";

export function contentSecurityPolicy(useEmulators: boolean) {
  const config = readFileSync(
    new URL("../deploy/default.conf", import.meta.url),
    "utf8",
  );
  const csp = config.match(/add_header Content-Security-Policy "([^"]+)"/)?.[1];
  if (!csp)
    throw new Error("Content-Security-Policy ausente na configuração Nginx.");
  return useEmulators
    ? csp.replace(
        "connect-src ",
        "connect-src http://127.0.0.1:9099 http://127.0.0.1:8081 ",
      )
    : csp;
}
