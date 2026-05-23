require('dotenv').config();

const required = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_AUTONOME',
  'STRIPE_PRICE_SERENITE',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'SENDGRID_API_KEY',
  'CLOUDINARY_URL',
  'JWT_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
];

const optional = ['SENDGRID_FROM_EMAIL', 'BASE_URL', 'DATABASE_URL', 'PORT'];

console.log('\n=== Vérification configuration Serenis ===\n');

let allOk = true;
required.forEach(key => {
  const val = process.env[key];
  if (!val) {
    console.log(`❌ MANQUANT  — ${key}`);
    allOk = false;
  } else {
    const display = val.length > 20 ? val.slice(0, 8) + '...' + val.slice(-4) : val;
    console.log(`✅ OK        — ${key} (${display})`);
  }
});

console.log('\n--- Optionnels ---');
optional.forEach(key => {
  const val = process.env[key];
  console.log(`${val ? '✅' : '⚠️ '} ${key} = ${val || '(non défini)'}`);
});

console.log('\n' + (allOk ? '✅ Tout est configuré !' : '❌ Des variables manquent — voir GUIDE_SAV.md section 6') + '\n');
