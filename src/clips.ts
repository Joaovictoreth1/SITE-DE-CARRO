import { element } from "./dom.ts";

export function bindClips() {
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "button[data-clip]",
  )) {
    const id = button.dataset.clip;
    const clip = element(`#${id}`, HTMLVideoElement);
    const notice = element(`#${id}-error`, HTMLElement);
    const source = clip.dataset.source;
    if (!source) continue;

    let attempt = 0;
    const stop = () => {
      attempt++;
      clip.pause();
      clip.removeAttribute("src");
      clip.load();
      clip.classList.remove("playing");
      clip.hidden = true;
      button.setAttribute("aria-pressed", "false");
    };

    button.disabled = false;
    button.addEventListener("click", async () => {
      if (clip.hasAttribute("src")) {
        stop();
        return;
      }

      const currentAttempt = ++attempt;
      notice.hidden = true;
      clip.hidden = false;
      clip.src = source;
      button.setAttribute("aria-pressed", "true");
      try {
        await clip.play();
        if (currentAttempt === attempt) clip.classList.add("playing");
      } catch {
        if (currentAttempt !== attempt) return;
        stop();
        notice.hidden = false;
      }
    });

    clip.addEventListener("error", () => {
      if (!clip.hasAttribute("src")) return;
      stop();
      notice.hidden = false;
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && clip.hasAttribute("src")) stop();
    });
  }
}
