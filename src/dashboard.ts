import { element } from "./dom.ts";
import {
  formatElapsed,
  sampleTelemetry,
  telemetryLimits,
} from "./telemetry.ts";

export function bindDashboard() {
  const opener = element("#open-dashboard", HTMLButtonElement);
  const dialog = element("#dashboard-modal", HTMLDialogElement);
  const operator = element("#dashboard-operator", HTMLElement);
  const timer = element("#session-timer", HTMLElement);
  const rpm = element("#rpm-val", HTMLElement);
  const oil = element("#temp-val", HTMLElement);
  const rpmMeter = element("#rpm-bar", HTMLProgressElement);
  const oilMeter = element("#temp-bar", HTMLProgressElement);
  const history = element("#rpm-history", SVGPolylineElement);

  let start = 0;
  let interval: number | undefined;
  let samples: number[] = [];

  const render = () => {
    const sample = sampleTelemetry();
    const limits = telemetryLimits.rpm;
    rpm.textContent = String(sample.rpm);
    rpmMeter.value = sample.rpm;
    oil.textContent = `${sample.oilC}°`;
    oilMeter.value = sample.oilC;
    timer.textContent = formatElapsed(
      Math.floor((performance.now() - start) / 1000),
    );
    samples = [...samples.slice(-23), sample.rpm];
    history.setAttribute(
      "points",
      samples
        .map(
          (value, i) =>
            `${i * 4},${24 - Math.round(((value - limits.min) / (limits.max - limits.min)) * 24)}`,
        )
        .join(" "),
    );
  };

  const pause = () => {
    window.clearInterval(interval);
    interval = undefined;
  };
  const resume = () => {
    if (!dialog.open || document.hidden || interval !== undefined) return;
    render();
    interval = window.setInterval(render, 800);
  };

  opener.disabled = false;
  opener.addEventListener("click", () => {
    pause();
    dialog.showModal();
    start = performance.now();
    samples = [];
    resume();
  });

  dialog.addEventListener("close", () => {
    if (!dialog.open) pause();
  });
  document.addEventListener("visibilitychange", () =>
    document.hidden ? pause() : resume(),
  );

  return (email: string | null) => {
    operator.textContent = email ?? "Visitante";
  };
}
