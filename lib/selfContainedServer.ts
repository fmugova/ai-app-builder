// lib/selfContainedServer.ts
// Generates a self-contained Node.js/Express server that handles form
// submissions and auth for downloaded BuildFlow HTML sites.
//
// All deps are pure JS (no native compilation):
//   express  — HTTP server + static file serving
//   bcryptjs — password hashing
//   jsonwebtoken — JWT sign/verify
//
// Data is stored as JSON in data/db.json so users can inspect/export it.
// JWT secret is persisted to data/.jwt_secret so tokens survive restarts.

const SERVER_JS = `'use strict';
// server.js — Self-contained server for your BuildFlow site
// ─────────────────────────────────────────────────────────
// Quick start:
//   npm install
//   node server.js
//
// Then open http://localhost:3000
// Form data is saved to data/db.json

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Persistent storage ──────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// JWT secret — generated once and reused so tokens survive restarts
const SECRET_FILE = path.join(DATA_DIR, '.jwt_secret');
const JWT_SECRET  = fs.existsSync(SECRET_FILE)
  ? fs.readFileSync(SECRET_FILE, 'utf8').trim()
  : (() => {
      const s = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(SECRET_FILE, s);
      return s;
    })();

const DB_FILE = path.join(DATA_DIR, 'db.json');

function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (_) { /* corrupt file — start fresh */ }
  return { submissions: [], users: [] };
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── Middleware ──────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS — the HTML pages fetch() the API from the same origin, but this allows
// a separate dev server or direct file:// open to still work
app.use(function (_req, res, next) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  next();
});
app.options('*', function (_req, res) { res.sendStatus(200); });

// ── Form submissions ─────────────────────────────────────────────────────────

app.post('/api/projects/:projectId/submissions', function (req, res) {
  try {
    var _ref      = req.body || {};
    var formType  = _ref.formType;
    var fields    = Object.assign({}, _ref);
    delete fields.formType;

    var db = readDb();
    db.submissions.push({
      id:        crypto.randomBytes(8).toString('hex'),
      projectId: req.params.projectId,
      formType:  formType || 'contact',
      data:      fields,
      createdAt: new Date().toISOString(),
    });
    writeDb(db);
    res.json({ success: true, message: 'Form submitted successfully!' });
  } catch (e) {
    console.error('[submissions]', e.message);
    res.status(500).json({ error: 'Submission failed' });
  }
});

// Simple read endpoint so you can view submissions at /api/projects/:id/submissions
app.get('/api/projects/:projectId/submissions', function (req, res) {
  var db   = readDb();
  var rows = db.submissions
    .filter(function (s) { return s.projectId === req.params.projectId; })
    .sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
  res.json({ submissions: rows });
});

// ── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/public/auth/:projectId', async function (req, res) {
  var projectId = req.params.projectId;
  var body      = req.body || {};
  var action    = body.action;
  var email     = body.email;
  var password  = body.password;
  var name      = body.name;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    var db = readDb();

    if (action === 'register') {
      var existing = db.users.find(function (u) {
        return u.projectId === projectId && u.email === email;
      });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      var id           = crypto.randomBytes(8).toString('hex');
      var passwordHash = await bcrypt.hash(password, 12);
      var user         = {
        id: id, projectId: projectId, email: email,
        passwordHash: passwordHash, name: name || null,
        createdAt: new Date().toISOString(), lastLoginAt: null,
      };
      db.users.push(user);
      writeDb(db);

      var token = jwt.sign({ sub: id, email: email, projectId: projectId }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token: token, user: { id: id, email: email, name: user.name } });

    } else if (action === 'login') {
      var found = db.users.find(function (u) {
        return u.projectId === projectId && u.email === email;
      });
      if (!found) {
        await bcrypt.hash(password, 12); // constant-time dummy to prevent user enumeration
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      var valid = await bcrypt.compare(password, found.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

      found.lastLoginAt = new Date().toISOString();
      writeDb(db);

      var loginToken = jwt.sign({ sub: found.id, email: found.email, projectId: projectId }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token: loginToken, user: { id: found.id, email: found.email, name: found.name } });

    } else if (action === 'me') {
      var authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token' });
      }
      try {
        var payload  = jwt.verify(authHeader.slice(7), JWT_SECRET);
        var meUser   = db.users.find(function (u) { return u.id === payload.sub; });
        if (!meUser) return res.status(401).json({ error: 'User not found' });
        return res.json({ user: { id: meUser.id, email: meUser.email, name: meUser.name } });
      } catch (_) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (e) {
    console.error('[auth]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Static files ─────────────────────────────────────────────────────────────

// Serve all .html, .css, .js, images, etc. from this directory
app.use(express.static(__dirname, {
  index:      'index.html',
  dotfiles:   'ignore',
  extensions: ['html'],  // /about → about.html
}));

// Catch-all: try <slug>.html, then 404.html, then index.html
app.get('*', function (req, res) {
  var slug = req.path.replace(/^\\//, '').replace(/\\/$/, '') || 'index';
  var candidates = [
    path.join(__dirname, slug + '.html'),
    path.join(__dirname, '404.html'),
    path.join(__dirname, 'index.html'),
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (fs.existsSync(candidates[i])) return res.sendFile(candidates[i]);
  }
  res.status(404).send('Page not found');
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, function () {
  console.log('');
  console.log('  ✅  Site running at http://localhost:' + PORT);
  console.log('  📬  Form data saved to data/db.json');
  console.log('  Ctrl+C to stop');
  console.log('');
});
`;

export function generateServerBundle(projectName: string): Record<string, string> {
  const safeName = projectName
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'my-site';

  const packageJson = JSON.stringify(
    {
      name: safeName,
      version: '1.0.0',
      private: true,
      description: `Self-contained site generated by BuildFlow AI`,
      scripts: {
        start: 'node server.js',
        dev: 'node server.js',
      },
      dependencies: {
        bcryptjs: '^2.4.3',
        express: '^4.18.3',
        jsonwebtoken: '^9.0.2',
      },
      engines: { node: '>=16' },
    },
    null,
    2
  );

  const gitignore = `node_modules/\ndata/\n`;

  return {
    'server.js': SERVER_JS,
    'package.json': packageJson,
    '.gitignore': gitignore,
  };
}
