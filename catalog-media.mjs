export function shouldPlayVideo({ enabled, tabHidden, inView }) {
    return enabled && !tabHidden && inView;
}

export function bindCatalogMedia(document, Observer = globalThis.IntersectionObserver) {
    const toggle = document.getElementById('catalog-video-toggle');
    const status = document.getElementById('catalog-video-status');
    const videos = [...document.querySelectorAll('[data-catalog-video]')];
    const visible = new Set(Observer ? [] : videos);
    let enabled = false;

    const wantsPlayback = video => shouldPlayVideo({
        enabled, tabHidden: document.hidden, inView: visible.has(video),
    });

    async function update(video) {
        if (!wantsPlayback(video)) {
            video.pause();
            video.removeAttribute('data-playing');
            return;
        }
        if (!video.paused) return;
        try {
            await video.play();
            if (!wantsPlayback(video)) video.pause();
        } catch (error) {
            if (wantsPlayback(video) && error.name !== 'AbortError') {
                status.textContent = 'Um vídeo não pôde ser reproduzido; a imagem continua disponível.';
            }
        }
    }

    function sync() {
        for (const video of videos) void update(video);
    }

    for (const video of videos) {
        video.addEventListener('playing', () => {
            if (wantsPlayback(video)) video.setAttribute('data-playing', '');
            else video.pause();
        });
        for (const event of ['pause', 'error', 'ended']) {
            video.addEventListener(event, () => video.removeAttribute('data-playing'));
        }
    }

    if (Observer) {
        const observer = new Observer(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting) visible.add(entry.target);
                else visible.delete(entry.target);
                void update(entry.target);
            }
        });
        for (const video of videos) observer.observe(video);
    }

    toggle.addEventListener('click', () => {
        enabled = !enabled;
        toggle.setAttribute('aria-pressed', String(enabled));
        status.textContent = enabled ? 'Vídeos de fundo ativados.' : 'Vídeos de fundo desativados.';
        sync();
    });
    document.addEventListener('visibilitychange', sync);
    toggle.hidden = false;
}

if (typeof document !== 'undefined') bindCatalogMedia(document);
