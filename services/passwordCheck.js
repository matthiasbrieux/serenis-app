const crypto = require('crypto');

// Vérifie un mot de passe contre la base "Pwned Passwords" de Have I Been
// Pwned via le modèle k-anonymity : seuls les 5 premiers caractères du hash
// SHA-1 quittent le serveur, jamais le mot de passe ni le hash complet.
// https://haveibeenpwned.com/API/v3#PwnedPasswords
async function isPasswordPwned(password) {
  const sha1 = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'VenduParMoi-PasswordCheck/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(`[passwordCheck] HIBP HTTP ${res.status} — vérification ignorée`);
      return false; // fail open : on ne bloque pas une inscription si le service tiers est indisponible
    }
    const text = await res.text();
    for (const line of text.split('\n')) {
      const [lineSuffix, count] = line.trim().split(':');
      if (lineSuffix === suffix) return parseInt(count, 10) > 0;
    }
    return false;
  } catch (e) {
    console.warn('[passwordCheck] HIBP indisponible —', e.message);
    return false; // fail open
  }
}

module.exports = { isPasswordPwned };
