#!/usr/bin/env bash
# Vérification de la configuration de production — Vendu Par Moi
# Usage : ssh ubuntu@152.228.236.39 "bash /home/ubuntu/app/scripts/check-prod-config.sh"
# Ne affiche JAMAIS les valeurs des secrets. Ne modifie rien.
set -euo pipefail

ENV_FILE="${1:-/home/ubuntu/app/.env}"
APP_DIR="${APP_DIR:-/home/ubuntu/app}"
OK="✅ OK    "
MISSING="❌ ABSENT "
WARN="⚠️  WARN  "
SKIP="   SKIP  "
BAD="❌ FORMAT "

echo ""
echo "══════════════════════════════════════════════════════"
echo " Vendu Par Moi — Vérification configuration production"
echo " $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "══════════════════════════════════════════════════════"
echo ""

# ── Lecture du .env ──────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ FATAL : $ENV_FILE introuvable"
  exit 1
fi

has_var() {
  local key="$1"
  grep -q "^${key}=.\+" "$ENV_FILE" 2>/dev/null
}

get_var() {
  grep "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-
}

val_len() {
  get_var "$1" | tr -d '\r\n' | wc -c
}

# check_format name prefix [min_len]
check_format() {
  local key="$1" prefix="$2" min_len="${3:-0}"
  if ! has_var "$key"; then return 1; fi
  local val; val=$(get_var "$key")
  if [[ "$val" != "$prefix"* ]]; then return 2; fi
  local len; len=$(echo -n "$val" | wc -c | tr -d ' ')
  if [[ "$len" -lt "$min_len" ]]; then return 3; fi
  return 0
}

echo "── Variables d'environnement ────────────────────────────────────────────"

# RESEND_API_KEY — doit commencer par re_
key="RESEND_API_KEY"
if ! has_var "$key"; then
  printf "  %s %s\n" "$MISSING" "$key (emails transactionnels)"
elif ! check_format "$key" "re_" 20; then
  printf "  %s %s\n" "$BAD" "$key — attendu : re_xxxx… (vérifier la clé dans le dashboard Resend)"
else
  printf "  %s %s\n" "$OK" "$key (emails transactionnels)"
fi

# STRIPE_SECRET_KEY — doit commencer par sk_live_ ou sk_test_
key="STRIPE_SECRET_KEY"
if ! has_var "$key"; then
  printf "  %s %s\n" "$MISSING" "$key (paiements)"
else
  stripe_val=$(get_var "$key")
  if [[ "$stripe_val" == sk_live_* ]]; then
    printf "  %s %s\n" "$OK" "$key — mode LIVE ✅"
  elif [[ "$stripe_val" == sk_test_* ]]; then
    printf "  %s %s\n" "$WARN" "$key — mode TEST ⚠️  (pas de vrais paiements)"
  else
    printf "  %s %s\n" "$BAD" "$key — attendu : sk_live_… ou sk_test_…"
  fi
fi

# STRIPE_WEBHOOK_SECRET — doit commencer par whsec_
key="STRIPE_WEBHOOK_SECRET"
if ! has_var "$key"; then
  printf "  %s %s\n" "$MISSING" "$key (activation webhook)"
elif ! check_format "$key" "whsec_" 20; then
  printf "  %s %s\n" "$BAD" "$key — attendu : whsec_xxxx…"
else
  printf "  %s %s\n" "$OK" "$key (activation webhook)"
fi

# JWT_SECRET — au moins 32 caractères
key="JWT_SECRET"
if ! has_var "$key"; then
  printf "  %s %s\n" "$MISSING" "$key"
else
  jwt_len=$(val_len "$key")
  if [[ "$jwt_len" -lt 32 ]]; then
    printf "  %s %s\n" "$BAD" "$key — trop court (${jwt_len} car., minimum 32)"
  else
    printf "  %s %s\n" "$OK" "$key (${jwt_len} caractères)"
  fi
fi

# ANTHROPIC_API_KEY — doit commencer par sk-ant-
key="ANTHROPIC_API_KEY"
if ! has_var "$key"; then
  printf "  %s %s\n" "$MISSING" "$key (IA)"
elif ! check_format "$key" "sk-ant-" 30; then
  printf "  %s %s\n" "$BAD" "$key — attendu : sk-ant-…"
else
  printf "  %s %s\n" "$OK" "$key (IA)"
fi

# SENDGRID_FROM_EMAIL — doit contenir @
key="SENDGRID_FROM_EMAIL"
if ! has_var "$key"; then
  printf "  %s %s\n" "$WARN" "$key absent (défaut : contact@venduparmoi.fr)"
else
  from_val=$(get_var "$key")
  if [[ "$from_val" != *"@"* ]]; then
    printf "  %s %s\n" "$BAD" "$key — adresse email invalide (pas de @)"
  else
    printf "  %s %s\n" "$OK" "$key"
  fi
fi

# BASE_URL — doit commencer par https://
key="BASE_URL"
if ! has_var "$key"; then
  printf "  %s %s\n" "$MISSING" "$key"
elif ! check_format "$key" "https://" 15; then
  printf "  %s %s\n" "$BAD" "$key — doit commencer par https://"
else
  printf "  %s %s\n" "$OK" "$key ($(get_var BASE_URL))"
fi

# CLOUDINARY_URL — doit commencer par cloudinary://
key="CLOUDINARY_URL"
if ! has_var "$key"; then
  printf "  %s %s\n" "$MISSING" "$key (photos/documents)"
elif ! check_format "$key" "cloudinary://" 20; then
  printf "  %s %s\n" "$BAD" "$key — attendu : cloudinary://key:secret@cloud_name"
else
  printf "  %s %s\n" "$OK" "$key (photos/documents)"
fi

printf "  %s %s\n" "$(has_var BACKUP_ENCRYPTION_KEY && echo "$OK" || echo "$WARN")" "BACKUP_ENCRYPTION_KEY (backup remote, optionnel)"
printf "  %s %s\n" "$(has_var TWILIO_FROM_NUMBER && echo "$OK" || echo "$WARN")" "TWILIO_FROM_NUMBER (SMS plateforme, optionnel)"
echo ""

echo "── Mentions légales (facturation) ──────────────────────────────────────"

# LEGAL_SIREN — exactement 9 chiffres
key="LEGAL_SIREN"
if ! has_var "$key"; then
  printf "  %s %s\n" "$MISSING" "$key"
else
  siren_val=$(get_var "$key" | tr -d ' \r\n')
  if [[ ! "$siren_val" =~ ^[0-9]{9}$ ]]; then
    printf "  %s %s\n" "$BAD" "$key — doit être exactement 9 chiffres"
  else
    printf "  %s %s\n" "$OK" "$key"
  fi
fi

printf "  %s %s\n" "$(has_var LEGAL_RAISON_SOCIALE && echo "$OK" || echo "$MISSING")" "LEGAL_RAISON_SOCIALE"
printf "  %s %s\n" "$(has_var LEGAL_FORME_JURIDIQUE && echo "$OK" || echo "$MISSING")" "LEGAL_FORME_JURIDIQUE"
printf "  %s %s\n" "$(has_var LEGAL_ADRESSE_SIEGE && echo "$OK" || echo "$MISSING")" "LEGAL_ADRESSE_SIEGE"
printf "  %s %s\n" "$(has_var LEGAL_RCS && echo "$OK" || echo "$MISSING")" "LEGAL_RCS"
echo ""

# ── Test connectivité Resend ─────────────────────────────────────────────────
echo "── Test connectivité Resend ─────────────────────────────────────────────"
if has_var RESEND_API_KEY; then
  RESEND_KEY=$(get_var RESEND_API_KEY)
  # POST /emails avec payload invalide : 422 = clé valide (send-only), 401 = clé invalide
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $RESEND_KEY" \
    -H "Content-Type: application/json" \
    -d '{"from":"test@test.invalid","to":"test@test.invalid","subject":"test","text":"test"}' \
    "https://api.resend.com/emails" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201" ]]; then
    echo "  $OK Resend API accessible (HTTP $HTTP_STATUS)"
  elif [[ "$HTTP_STATUS" == "422" || "$HTTP_STATUS" == "400" ]]; then
    echo "  $OK Resend clé valide (send-only, HTTP $HTTP_STATUS attendu)"
  elif [[ "$HTTP_STATUS" == "401" ]]; then
    echo "  ❌ INVALIDE Resend — clé refusée (HTTP 401)"
  elif [[ "$HTTP_STATUS" == "403" ]]; then
    echo "  ❌ Resend — clé sans permission d'envoi (HTTP 403)"
  elif [[ "$HTTP_STATUS" == "000" ]]; then
    echo "  $WARN Resend injoignable (réseau ou proxy)"
  else
    echo "  $WARN Resend HTTP $HTTP_STATUS (inattendu)"
  fi
else
  echo "  $SKIP Resend non testé (clé absente)"
fi
echo ""

# ── Test connectivité Stripe ─────────────────────────────────────────────────
echo "── Test connectivité Stripe ─────────────────────────────────────────────"
if has_var STRIPE_SECRET_KEY; then
  STRIPE_KEY=$(get_var STRIPE_SECRET_KEY)
  STRIPE_MODE=$(echo "$STRIPE_KEY" | cut -c1-7)
  if [[ "$STRIPE_MODE" == "sk_live" ]]; then
    MODE_LABEL="LIVE ✅"
  elif [[ "$STRIPE_MODE" == "sk_test" ]]; then
    MODE_LABEL="TEST ⚠️  (pas en production)"
  else
    MODE_LABEL="FORMAT INCONNU ❌"
  fi
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $STRIPE_KEY" \
    "https://api.stripe.com/v1/balance" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    echo "  $OK Stripe API accessible (HTTP 200) — Mode : $MODE_LABEL"
  elif [[ "$HTTP_STATUS" == "401" ]]; then
    echo "  ❌ INVALIDE Stripe API — clé refusée (HTTP 401)"
  elif [[ "$HTTP_STATUS" == "000" ]]; then
    echo "  $WARN Stripe injoignable"
  else
    echo "  $WARN Stripe HTTP $HTTP_STATUS — Mode : $MODE_LABEL"
  fi
else
  echo "  $SKIP Stripe non testé (clé absente)"
fi
echo ""

# ── Test connectivité Anthropic ──────────────────────────────────────────────
echo "── Test connectivité Anthropic ──────────────────────────────────────────"
if has_var ANTHROPIC_API_KEY; then
  ANT_KEY=$(get_var ANTHROPIC_API_KEY)
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "x-api-key: $ANT_KEY" \
    -H "anthropic-version: 2023-06-01" \
    "https://api.anthropic.com/v1/models" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    echo "  $OK Anthropic API accessible (HTTP 200)"
  elif [[ "$HTTP_STATUS" == "401" ]]; then
    echo "  ❌ INVALIDE Anthropic API — clé refusée (HTTP 401)"
  elif [[ "$HTTP_STATUS" == "000" ]]; then
    echo "  $WARN Anthropic injoignable"
  else
    echo "  $WARN Anthropic HTTP $HTTP_STATUS"
  fi
else
  echo "  $SKIP Anthropic non testé (clé absente)"
fi
echo ""

# ── Vérification base de données ─────────────────────────────────────────────
echo "── Base de données ──────────────────────────────────────────────────────"
DB_PATH="/home/ubuntu/data/database.db"
if [[ -f "$DB_PATH" ]]; then
  DB_SIZE=$(du -sh "$DB_PATH" 2>/dev/null | cut -f1)
  INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>/dev/null | head -1)
  SELLERS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sellers WHERE paid_at IS NOT NULL AND is_demo=0;" 2>/dev/null || echo "?")
  EMAILS_FAILED=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM email_sends WHERE success=0;" 2>/dev/null || echo "?")
  EMAILS_OK=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM email_sends WHERE success=1;" 2>/dev/null || echo "?")
  echo "  $OK Base : $DB_PATH ($DB_SIZE)"
  if [[ "$INTEGRITY" == "ok" ]]; then
    echo "  $OK Intégrité SQLite : ok"
  else
    echo "  ❌ INTÉGRITÉ : $INTEGRITY"
  fi
  echo "     Vendeurs réels payés : $SELLERS"
  echo "     Emails réussis / échoués : $EMAILS_OK / $EMAILS_FAILED"
  if [[ "$EMAILS_FAILED" != "?" && "$EMAILS_FAILED" -gt 50 ]]; then
    echo "  $WARN $EMAILS_FAILED emails échoués — vérifier RESEND_API_KEY"
  fi
else
  echo "  ❌ Base introuvable : $DB_PATH"
fi
echo ""

# ── Nginx ─────────────────────────────────────────────────────────────────────
echo "── Nginx ────────────────────────────────────────────────────────────────"
if systemctl is-active --quiet nginx 2>/dev/null; then
  echo "  $OK nginx actif"
else
  echo "  ❌ nginx non actif — trafic non acheminé vers l'application"
fi
# Vérifier que le domaine répond en HTTPS
if has_var BASE_URL; then
  DOMAIN=$(get_var BASE_URL | sed 's|https\?://||' | cut -d'/' -f1)
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$DOMAIN/" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" =~ ^2 || "$HTTP_STATUS" =~ ^3 ]]; then
    echo "  $OK https://$DOMAIN accessible (HTTP $HTTP_STATUS)"
  elif [[ "$HTTP_STATUS" == "000" ]]; then
    echo "  $WARN https://$DOMAIN injoignable (timeout ou DNS)"
  else
    echo "  $WARN https://$DOMAIN répond HTTP $HTTP_STATUS"
  fi
  # Vérification expiration certificat SSL
  CERT_EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d'=' -f2 || echo "")
  if [[ -n "$CERT_EXPIRY" ]]; then
    EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$CERT_EXPIRY" +%s 2>/dev/null || echo "0")
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
    if [[ "$DAYS_LEFT" -le 14 ]]; then
      echo "  ❌ Certificat SSL expire dans $DAYS_LEFT jours — RENOUVELER MAINTENANT"
    elif [[ "$DAYS_LEFT" -le 30 ]]; then
      echo "  $WARN Certificat SSL expire dans $DAYS_LEFT jours"
    else
      echo "  $OK Certificat SSL valide encore $DAYS_LEFT jours"
    fi
  fi
fi
echo ""

# ── PM2 ───────────────────────────────────────────────────────────────────────
echo "── Processus PM2 ────────────────────────────────────────────────────────"
pm2 jlist 2>/dev/null | node -e "
  let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
    try{
      const list=JSON.parse(d);
      const vpm=list.find(p=>p.name==='vpm');
      if(!vpm){console.log('  ❌ Processus vpm non trouvé dans PM2');return;}
      const status=vpm.pm2_env?.status;
      const uptime=Math.round((Date.now()-vpm.pm2_env?.pm_uptime)/60000);
      const restarts=vpm.pm2_env?.restart_time||0;
      const mem=Math.round((vpm.monit?.memory||0)/1024/1024);
      const icon=status==='online'?'✅ OK    ':'❌ ERREUR';
      console.log('  '+icon+' PM2 vpm : '+status+' | uptime '+uptime+'min | '+restarts+' restart(s) | '+mem+'MB');
      if(restarts>5)console.log('  ⚠️  Nombre de restarts élevé ('+restarts+') — vérifier pm2 logs vpm --lines 100');
    }catch(e){console.log('  ⚠️  Impossible de parser pm2 jlist');}
  });
" 2>/dev/null || echo "  ⚠️  pm2 non disponible"
echo ""

# ── Disque ────────────────────────────────────────────────────────────────────
echo "── Disque ───────────────────────────────────────────────────────────────"
DISK_USE=$(df / 2>/dev/null | awk 'NR==2{print $5}' | tr -d '%')
if [[ -n "$DISK_USE" ]]; then
  if [[ "$DISK_USE" -ge 90 ]]; then
    echo "  ❌ Disque plein à ${DISK_USE}% — risque de plantage immédiat"
  elif [[ "$DISK_USE" -ge 75 ]]; then
    echo "  $WARN Disque à ${DISK_USE}% — surveiller"
  else
    echo "  $OK Disque à ${DISK_USE}%"
  fi
fi
echo ""

# ── Résumé bloquants ─────────────────────────────────────────────────────────
echo "══════════════════════════════════════════════════════"
echo " Résumé des points CRITIQUES"
echo "══════════════════════════════════════════════════════"
BLOCKERS=0

has_var RESEND_API_KEY     || { echo "  ❌ RESEND_API_KEY manquant → aucun email ne sera envoyé"; BLOCKERS=$((BLOCKERS+1)); }
has_var STRIPE_SECRET_KEY  || { echo "  ❌ STRIPE_SECRET_KEY manquant → paiements impossibles"; BLOCKERS=$((BLOCKERS+1)); }
has_var STRIPE_WEBHOOK_SECRET || { echo "  ❌ STRIPE_WEBHOOK_SECRET manquant → activations impossibles"; BLOCKERS=$((BLOCKERS+1)); }
has_var JWT_SECRET         || { echo "  ❌ JWT_SECRET manquant → authentification impossible"; BLOCKERS=$((BLOCKERS+1)); }
has_var CLOUDINARY_URL     || { echo "  ❌ CLOUDINARY_URL manquant → photos non sauvegardées"; BLOCKERS=$((BLOCKERS+1)); }
has_var BASE_URL           || { echo "  ❌ BASE_URL manquant → liens emails cassés, webhooks Stripe refusés"; BLOCKERS=$((BLOCKERS+1)); }
has_var LEGAL_SIREN        || { echo "  ❌ LEGAL_SIREN manquant → factures non envoyées"; BLOCKERS=$((BLOCKERS+1)); }
has_var LEGAL_RAISON_SOCIALE || { echo "  ❌ LEGAL_RAISON_SOCIALE manquante → factures non envoyées"; BLOCKERS=$((BLOCKERS+1)); }

if has_var STRIPE_SECRET_KEY; then
  stripe_key_check=$(get_var STRIPE_SECRET_KEY)
  if [[ "$stripe_key_check" == sk_test_* ]]; then
    echo "  ⚠️  STRIPE en mode TEST → aucun vrai paiement possible"
  fi
fi

if [[ "$BLOCKERS" -eq 0 ]]; then
  echo "  ✅ Aucun bloquant critique détecté"
fi
echo ""
