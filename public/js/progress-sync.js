// Miroir serveur des clés localStorage de progression (formation, coaching,
// checklists) : la copie locale reste la source immédiate pour un rendu
// synchrone au chargement, celle-ci ne fait que la sauvegarder côté serveur
// et rattraper les autres appareils/après un vidage de cache.

async function syncProgress(key, value) {
  try {
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: String(value) })
    });
  } catch {
    // Pas de réseau/session expirée : la valeur reste en localStorage, on
    // retentera au prochain changement. Rien à faire ici.
  }
}

// Récupère la progression serveur, écrit dans localStorage les clés qui ont
// changé, puis appelle onChanged() si au moins une valeur a été mise à jour
// — pour que la page se re-rende avec les données à jour (autre appareil,
// cache vidé entre-temps).
async function hydrateProgress(onChanged) {
  try {
    const r = await fetch('/api/progress', { credentials: 'same-origin' });
    if (!r.ok) return;
    const data = await r.json();
    let changed = false;
    for (const [key, value] of Object.entries(data)) {
      if (localStorage.getItem(key) !== value) {
        localStorage.setItem(key, value);
        changed = true;
      }
    }
    if (changed && typeof onChanged === 'function') onChanged();
  } catch {
    // Pas de réseau : on continue avec ce qu'il y a déjà en localStorage.
  }
}
