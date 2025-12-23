var express = require('express');
var router = express.Router();
var fetch = require('node-fetch'); // v2 (CommonJS)
var fs = require('fs');

var loadedFiles = false;

var default_client_uri = 'http://localhost:4200';
var allowed_origins = ['http://localhost:4200', 'http://127.0.0.1:4200'];

var my_client_id = null;
var my_client_secret = null;

var access_token = null;
var refresh_token = null;

//  Helpers
function writeTokens(at, rt) {
  if (at) access_token = at;
  if (rt) refresh_token = rt;
  fs.writeFile('tokens.json', JSON.stringify({ access_token, refresh_token }, null, 2), () => {});
}

function refresh() {
  if (!refresh_token) {
    return Promise.reject('No refresh token; please /login');
  }
  const params = new URLSearchParams();
  params.append('refresh_token', refresh_token);
  params.append('grant_type', 'refresh_token');

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic ' + Buffer.from(my_client_id + ':' + my_client_secret).toString('base64')
  };

  return fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', body: params, headers
  })
  .then(r => r.ok ? r.json() : Promise.reject('Error refreshing token'))
  .then(json => writeTokens(json.access_token, json.refresh_token))
  .catch(err => console.error(err));
}

function makeAPIRequest(url, res, didRefresh) {
  if (!access_token) {
    if (refresh_token && !didRefresh) {
      return refresh().then(() => makeAPIRequest(url, res, true));
    }
    return res.status(401).json({ error: 'no_access_token', login: '/login' });
  }

  const headers = () => ({
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Bearer ' + access_token
  });

  fetch(url, { method: 'GET', headers: headers() })
    .then(response => {
      if (response.ok) return response.json();
      if (response.status === 401) {
        if (didRefresh) {
          res.status(401).end();
          return null;
        }
        return refresh().then(() => makeAPIRequest(url, res, true));
      }
      res.status(response.status).end();
      return null;
    })
    .then(json => { if (json) res.json(json); })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'server_error' });
    });
}

function getSpaOrigin(req) {
  const candidate = req.query.origin || req.headers.origin || req.cookies?.spa_origin || '';
  return allowed_origins.includes(candidate) ? candidate : default_client_uri;
}

function getServerBase(req) {
  const host = req.headers.host || 'localhost:8888';
  return `http://${host}`;
}

function getRedirectUri(req) {
  return `${getServerBase(req)}/callback`;
}

// One-time token load 
router.get('*', function(req, res, next) {
  if (loadedFiles) return next();

  fs.readFile('client_secret.json', (err, data) => {
    if (err) {
      console.error('Missing client_secret.json:', err);
      return res.status(500).json({ error: 'missing_client_secret' });
    }
    try {
      const cs = JSON.parse(data);
      my_client_id = cs.client_id;
      my_client_secret = cs.client_secret;
    } catch (e) {
      console.error('Bad client_secret.json:', e);
      return res.status(500).json({ error: 'bad_client_secret' });
    }

    fs.readFile('tokens.json', (err2, data2) => {
      if (!err2 && data2) {
        try {
          const t = JSON.parse(data2);
          access_token = t.access_token || null;
          refresh_token = t.refresh_token || null;
        } catch (e) {
          console.warn('tokens.json parse issue; continuing auth flow');
        }
      }
      loadedFiles = true;
      next();
    });
  });
});

router.get('/status', (req, res) => {
  const client_uri = getSpaOrigin(req);
  const redirect_uri = getRedirectUri(req);
  res.json({
    loadedFiles,
    hasClient: !!(my_client_id && my_client_secret),
    hasAccessToken: !!access_token,
    hasRefreshToken: !!refresh_token,
    redirect_uri,
    client_uri
  });
});

// Auth flow 
router.get('/login', function(req, res) {
  const client_uri = getSpaOrigin(req);
  const redirect_uri = getRedirectUri(req);
  var scopes = 'user-read-private user-read-email streaming user-modify-playback-state user-read-playback-state';
  res.cookie('spa_origin', client_uri, { httpOnly: true, sameSite: 'lax' });
  res.redirect('https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    '&client_id=' + my_client_id +
    (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
    '&redirect_uri=' + encodeURIComponent(redirect_uri));
});

router.get('/callback', function(req, res) {
  const client_uri = getSpaOrigin(req);
  const redirect_uri = getRedirectUri(req);
  var code = req.query.code || null;
  var error = req.query.error || null;

  if (error) {
    console.error('Auth error:', error);
    return res.redirect(client_uri + '/');
  }

  const params = new URLSearchParams();
  params.append('code', code);
  params.append('redirect_uri', redirect_uri);
  params.append('grant_type', 'authorization_code');

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic ' + Buffer.from(my_client_id + ':' + my_client_secret).toString('base64')
  };

  fetch('https://accounts.spotify.com/api/token', { method: 'POST', body: params, headers })
    .then(r => r.ok ? r.json() : Promise.reject('Token exchange failed'))
    .then(json => {
      writeTokens(json.access_token, json.refresh_token);

      res.redirect(client_uri + '/');
    })
    .catch(err => {
      console.error(err);
      res.redirect(client_uri + '/');
    });
});

router.post('/logout', (req, res) => {
  access_token = null;
  refresh_token = null;
  res.clearCookie('spa_origin');
  fs.unlink('tokens.json', () => {});
  res.status(204).end();
});

// API proxy routes
// Me
router.get('/me', (req, res) => {
  makeAPIRequest('https://api.spotify.com/v1/me', res);
});

// Search
router.get('/search', (req, res) => {
  const q = req.query.q || '';
  const type = req.query.type || 'artist';
  const params = new URLSearchParams();
  params.append('q', q);
  params.append('type', type);
  makeAPIRequest('https://api.spotify.com/v1/search?' + params, res);
});

// Alt search
router.get('/search/:category/:resource', (req, res) => {
  const params = new URLSearchParams();
  params.append('q', req.params.resource);
  params.append('type', req.params.category);
  makeAPIRequest('https://api.spotify.com/v1/search?' + params, res);
});

// Artist
router.get('/artist/:id', (req, res) => {
  makeAPIRequest('https://api.spotify.com/v1/artists/' + req.params.id, res);
});
router.get('/artist/:id/albums', (req, res) => {
  makeAPIRequest('https://api.spotify.com/v1/artists/' + req.params.id + '/albums', res);
});
router.get('/artist-albums/:id', (req, res) => {
  makeAPIRequest('https://api.spotify.com/v1/artists/' + req.params.id + '/albums', res);
});
router.get('/artist/:id/top-tracks', (req, res) => {
  makeAPIRequest('https://api.spotify.com/v1/artists/' + req.params.id + '/top-tracks?market=US', res);
});
router.get('/artist-top-tracks/:id', (req, res) => {
  makeAPIRequest('https://api.spotify.com/v1/artists/' + req.params.id + '/top-tracks?market=US', res);
});

// Album
router.get('/album/:id', (req, res) => {
  makeAPIRequest('https://api.spotify.com/v1/albums/' + req.params.id, res);
});
router.get('/album/:id/tracks', (req, res) => {
  makeAPIRequest('https://api.spotify.com/v1/albums/' + req.params.id + '/tracks', res);
});
router.get('/album-tracks/:id', (req, res) => {
  makeAPIRequest('https://api.spotify.com/v1/albums/' + req.params.id + '/tracks', res);
});

// Track
router.get('/track/:id', (req, res) => {
  makeAPIRequest('https://api.spotify.com/v1/tracks/' + req.params.id, res);
});

// Playback token for Web Playback SDK
router.get('/playback-token', (req, res) => {
  if (!access_token) {
    return res.status(401).json({ error: 'no_access_token', login: '/login' });
  }
  res.json({ access_token });
});

module.exports = router;
