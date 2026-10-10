// Explicit local provisioning only. Never updates an existing administrator.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.INITIAL_ADMIN_PASSWORD;
if (!require('../services/validation').email(email) || !password || password.length < 16) throw Error('INITIAL_ADMIN_EMAIL et mot de passe unique de 16 caractères minimum requis.');
const db = require('../database');
if (db.prepare('SELECT id FROM admins WHERE email=?').get(email)) throw Error('Compte existant : aucune modification effectuée.');
db.prepare('INSERT INTO admins(email,name,password) VALUES(?,?,?)').run(email, process.env.INITIAL_ADMIN_NAME || 'Administrateur', bcrypt.hashSync(password,12));
console.log('Administrateur créé. Aucun identifiant secret affiché.');
db.close();
