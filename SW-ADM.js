/* sw.js — Service Worker único de notificações */

const CACHE_NAME = "notificacoes-v1";

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            limparCachesAntigos()
        ])
    );
});

async function limparCachesAntigos() {
    const nomes = await caches.keys();

    await Promise.all(
        nomes
            .filter(nome => nome !== CACHE_NAME)
            .map(nome => caches.delete(nome))
    );
}

self.addEventListener("push", event => {
    event.waitUntil(mostrarNotificacao(event));
});

async function mostrarNotificacao(event) {
    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch (erro) {
        console.warn("[SW] Push não veio como JSON:", erro);

        try {
            data = {
                mensagem: event.data ? event.data.text() : ""
            };
        } catch (_) {}
    }

    const titulo =
        data.titulo ||
        data.title ||
        "Nova notificação";

    const mensagem =
        data.mensagem ||
        data.body ||
        "Você recebeu uma nova notificação.";

    const notificacaoId =
        data.notificacao_id ||
        data.id ||
        null;

    const options = {
        body: mensagem,

        icon:
            data.icon ||
            "/icon-192.png",

        badge:
            data.badge ||
            "/icon-192.png",

        tag:
            data.tag ||
            (
                notificacaoId
                    ? `notificacao-${notificacaoId}`
                    : "notificacao"
            ),

        renotify: true,

        data: {
            notificacao_id: notificacaoId,
            tipo: data.tipo || "geral",
            valor: data.valor ?? null,
            url: data.url || data.link || "./"
        }
    };

    await self.registration.showNotification(
        titulo,
        options
    );
});

self.addEventListener("notificationclick", event => {
    event.notification.close();

    const url =
        event.notification.data?.url ||
        "./";

    event.waitUntil(
        abrirOuFocar(url)
    );
});

async function abrirOuFocar(url) {
    const clientes = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
    });

    const destino = new URL(
        url,
        self.location.origin
    );

    for (const cliente of clientes) {
        try {
            const atual = new URL(cliente.url);

            if (
                atual.origin === destino.origin &&
                "focus" in cliente
            ) {
                if ("navigate" in cliente) {
                    await cliente.navigate(
                        destino.href
                    );
                }

                return cliente.focus();
            }
        } catch (_) {}
    }

    if (self.clients.openWindow) {
        return self.clients.openWindow(
            destino.href
        );
    }
}

self.addEventListener("message", event => {
    if (event.data?.tipo === "ATIVAR_SW") {
        self.skipWaiting();
    }
});