/* SW-ADM.js — Service Worker de notificações Push do ADM */

const CACHE_NAME = 'sw-adm-v2';

self.addEventListener('install', function(event) {
    console.log('[SW-ADM] install');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function() {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function(event) {
    console.log('[SW-ADM] activate');
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(function(nomes) {
                return Promise.all(
                    nomes
                        .filter(function(nome) { return nome !== CACHE_NAME; })
                        .map(function(nome) { return caches.delete(nome); })
                );
            })
        ])
    );
});

self.addEventListener('push', function(event) {
    console.log('[SW-ADM] push recebido');
    event.waitUntil(mostrarNotificacao(event));
});

function mostrarNotificacao(event) {
    var data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        try {
            data = { mensagem: event.data ? event.data.text() : '' };
        } catch (_) {}
    }

    var titulo = data.titulo || data.title || 'Nova notificação';
    var mensagem = data.mensagem || data.body || 'Você recebeu uma nova notificação.';
    var notificacaoId = data.notificacao_id || data.id || null;

    var options = {
        body: mensagem,
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-192.png',
        tag: data.tag || (notificacaoId ? 'notificacao-' + notificacaoId : 'notificacao'),
        renotify: true,
        data: {
            notificacao_id: notificacaoId,
            tipo: data.tipo || 'geral',
            valor: data.valor !== undefined ? data.valor : null,
            url: data.url || data.link || './'
        }
    };

    return self.registration.showNotification(titulo, options);
}

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    var url = './';
    if (event.notification.data && event.notification.data.url) {
        url = event.notification.data.url;
    }

    event.waitUntil(abrirOuFocar(url));
});

function abrirOuFocar(url) {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientes) {
            var destino;
            try {
                destino = new URL(url, self.location.origin);
            } catch (_) {
                destino = { href: url, origin: self.location.origin };
            }

            for (var i = 0; i < clientes.length; i++) {
                var cliente = clientes[i];
                try {
                    var atual = new URL(cliente.url);
                    if (atual.origin === destino.origin && 'focus' in cliente) {
                        if ('navigate' in cliente) {
                            cliente.navigate(destino.href);
                        }
                        return cliente.focus();
                    }
                } catch (_) {}
            }

            if (self.clients.openWindow) {
                return self.clients.openWindow(destino.href);
            }
        });
}

self.addEventListener('message', function(event) {
    if (event.data && event.data.tipo === 'ATIVAR_SW') {
        self.skipWaiting();
    }
});
