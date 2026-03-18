// ─── Auth helpers ──────────────────────────────────────────────────────────
const Auth = {
  get() { try { return JSON.parse(localStorage.getItem('ca_session') || 'null'); } catch { return null; } },
  set(data) { localStorage.setItem('ca_session', JSON.stringify(data)); },
  clear() { localStorage.removeItem('ca_session'); },
  isLoggedIn() { return !!this.get()?.token; },
};

// ─── Toast ─────────────────────────────────────────────────────────────────
let _toastTimer;
function toast(msg, dur = 2600) {
  let t = document.getElementById('_toast');
  if (!t) { t = document.createElement('div'); t.id = '_toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

// ─── Copy ──────────────────────────────────────────────────────────────────
function copyText(elId) {
  const t = document.getElementById(elId)?.textContent?.trim();
  if (!t) return;
  navigator.clipboard.writeText(t).then(() => toast('Copied!')).catch(() => toast('Copy failed'));
}
function copyVal(val) {
  navigator.clipboard.writeText(val).then(() => toast('Copied!')).catch(() => toast('Failed'));
}

// ─── Highlight JSON ────────────────────────────────────────────────────────
function highlightJSON(json) {
  return json
    .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="jk">$1</span>:')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="jv">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span class="jb">$1</span>')
    .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="jn">$1</span>');
}

// ─── Toggle endpoint card ──────────────────────────────────────────────────
function toggleEp(id) {
  const body = document.getElementById(id + '-body');
  const chev = document.getElementById(id + '-chev');
  if (!body) return;
  body.classList.toggle('open');
  if (chev) chev.classList.toggle('open');
}

// ─── Switch code tab ───────────────────────────────────────────────────────
function switchTab(id, lang) {
  ['curl','js','py'].forEach(l => {
    document.getElementById(id + '-tab-' + l)?.classList.toggle('active', l === lang);
    document.getElementById(id + '-code-' + l)?.classList.toggle('active', l === lang);
  });
}

// ─── Fire endpoint ─────────────────────────────────────────────────────────
async function fireEndpoint(id, method, path, fieldNames) {
  const btn    = document.getElementById(id + '-btn');
  const spin   = document.getElementById(id + '-spin');
  const out    = document.getElementById(id + '-out');
  const status = document.getElementById(id + '-status');

  spin.style.display = 'inline-block';
  btn.disabled = true;
  out.classList.remove('show');
  if (status) status.innerHTML = '';

  const params = new URLSearchParams();
  fieldNames.forEach(name => {
    const el = document.getElementById(id + '-f-' + name);
    if (el?.value) params.set(name, el.value);
  });

  const url = path + '?' + params.toString();
  const start = Date.now();

  try {
    const res  = await fetch(url, { method });
    const ms   = Date.now() - start;
    const data = await res.json();
    if (status) status.innerHTML =
      `<span class="${res.ok ? 's-ok' : 's-err'}">● ${res.status}</span><span class="s-ms">${ms}ms</span>`;
    out.innerHTML = highlightJSON(JSON.stringify(data, null, 2));
    out.classList.add('show');
  } catch (e) {
    if (status) status.innerHTML = `<span class="s-err">● Error</span>`;
    out.innerHTML = `{"status": false, "error": "${e.message}"}`;
    out.classList.add('show');
  }

  spin.style.display = 'none';
  btn.disabled = false;
}

// ─── Sidebar group switch ──────────────────────────────────────────────────
function switchGroup(gid) {
  document.querySelectorAll('.ep-group').forEach(g => g.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById('grp-' + gid)?.classList.add('active');
  document.getElementById('sbl-' + gid)?.classList.add('active');
}

// ─── Navbar active state ───────────────────────────────────────────────────
function setNavActive(page) {
  document.querySelectorAll('.nav-a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
  const sess = Auth.get();
  const authEl = document.getElementById('nav-auth');
  const userEl = document.getElementById('nav-user');
  if (authEl && userEl) {
    if (sess?.user) {
      authEl.style.display = 'none';
      userEl.style.display = 'flex';
      const un = document.getElementById('nav-uname');
      if (un) un.textContent = sess.user.username || 'User';
    } else {
      authEl.style.display = 'flex';
      userEl.style.display = 'none';
    }
  }
}

// ─── Build endpoint HTML (shared renderer) ────────────────────────────────
function buildEndpointCard(ep, id) {
  const pathFmt = ep.path
    .replace(/(\?[^=]+=)/g, m => `<span class="seg-qs">${m}</span>`)
    .replace(/(\{[^}]+\})/g, m => `<span class="seg-val">${m}</span>`);

  const paramRows = ep.params.map(p => `
    <tr>
      <td><span class="pn">${p.n}</span><span class="${p.r ? 'tag-req' : 'tag-opt'}">${p.r ? 'required' : 'optional'}</span></td>
      <td><span class="pt">${p.t}</span></td>
      <td style="color:var(--text2);font-size:.79rem">${p.d}</td>
    </tr>`).join('');

  const fields = ep.fields.map(([n, v]) =>
    `<input class="try-field" id="${id}-f-${n}" placeholder="${n}" value="${v}"/>`
  ).join('');

  const base = 'http://localhost:3000';
  const qs = ep.fields.filter(([,v])=>v).map(([n,v])=>`${n}=${encodeURIComponent(v)}`).join('&');
  const fullUrl = `${base}${ep.path}?${qs}`;

  const curlCode = `curl "${fullUrl}"`;
  const jsCode   = `const axios = require('axios');\n\nconst { data } = await axios.get(\n  '${fullUrl}'\n);\nconsole.log(data.result);`;
  const pyCode   = `import requests\n\nr = requests.get(\n    '${base}${ep.path}',\n    params={\n${ep.fields.map(([n,v])=>`        '${n}': '${v}'`).join(',\n')}\n    }\n)\nprint(r.json()['result'])`;

  const fieldNames = ep.fields.map(([n]) => `'${n}'`).join(',');

  return `
  <div class="ep-card">
    <div class="ep-card-header" onclick="toggleEp('${id}')">
      <span class="method-badge m-${ep.method.toLowerCase()}">${ep.method}</span>
      <span class="ep-path">${ep.path}</span>
      <span class="ep-desc-inline">${ep.desc}</span>
      <span class="ep-chevron" id="${id}-chev">▼</span>
    </div>
    <div class="ep-body" id="${id}-body">
      <div class="ep-body-inner">
        <table class="p-table">
          <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
          <tbody>${paramRows}</tbody>
        </table>
        <div class="code-wrap">
          <div class="code-tabs-row">
            <button class="code-tab active" id="${id}-tab-curl" onclick="switchTab('${id}','curl')">cURL</button>
            <button class="code-tab" id="${id}-tab-js"   onclick="switchTab('${id}','js')">JavaScript</button>
            <button class="code-tab" id="${id}-tab-py"   onclick="switchTab('${id}','py')">Python</button>
          </div>
          <div class="code-panel active" id="${id}-code-curl">${esc(curlCode)}</div>
          <div class="code-panel"        id="${id}-code-js">${esc(jsCode)}</div>
          <div class="code-panel"        id="${id}-code-py">${esc(pyCode)}</div>
        </div>
        <div class="try-box">
          <div class="try-header">
            <span class="try-label">⚡ Try it live</span>
            <span class="try-status" id="${id}-status"></span>
          </div>
          <div class="try-body">
            <div class="try-fields">${fields}</div>
            <button class="try-btn" id="${id}-btn" onclick="fireEndpoint('${id}','${ep.method}','${ep.path}',[${fieldNames}])">
              Send <div class="spin" id="${id}-spin"></div>
            </button>
            <div class="resp-out" id="${id}-out"></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Endpoint definitions ──────────────────────────────────────────────────
const EP = {
  downloader: {
    label: '⬇️ Downloaders', icon:'⬇️',
    desc: 'Download media from YouTube, TikTok, Instagram, Twitter/X and Facebook.',
    groups: [
      { id:'yt',   title:'YouTube',   items:[
        { method:'GET', path:'/api/downloader/ytmp3', desc:'YouTube → MP3', params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'url',t:'string',r:true,d:'YouTube video URL'}], fields:[['apikey','your_key'],['url','https://youtube.com/watch?v=dQw4w9WgXcQ']] },
        { method:'GET', path:'/api/downloader/ytmp4', desc:'YouTube → MP4', params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'url',t:'string',r:true,d:'YouTube video URL'},{n:'quality',t:'string',r:false,d:'144/360/480/720/1080'}], fields:[['apikey','your_key'],['url','https://youtube.com/watch?v=dQw4w9WgXcQ'],['quality','720']] },
      ]},
      { id:'social', title:'Social Media', items:[
        { method:'GET', path:'/api/downloader/tiktok',    desc:'TikTok (no watermark)', params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'url',t:'string',r:true,d:'TikTok video URL'}], fields:[['apikey','your_key'],['url','']] },
        { method:'GET', path:'/api/downloader/instagram', desc:'Instagram media',        params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'url',t:'string',r:true,d:'Public Instagram post URL'}], fields:[['apikey','your_key'],['url','']] },
        { method:'GET', path:'/api/downloader/twitter',   desc:'Twitter/X media',        params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'url',t:'string',r:true,d:'Twitter/X post URL'}], fields:[['apikey','your_key'],['url','']] },
        { method:'GET', path:'/api/downloader/facebook',  desc:'Facebook video',         params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'url',t:'string',r:true,d:'Public Facebook video URL'}], fields:[['apikey','your_key'],['url','']] },
      ]},
    ]
  },
  tools: {
    label: '🛠️ Dev Tools', icon:'🛠️',
    desc: 'QR codes, URL shortener, IP info, password generator, Base64, UUID and more.',
    groups: [
      { id:'utils', title:'Utilities', items:[
        { method:'GET', path:'/api/tools/qrcode',    desc:'Generate QR Code',    params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'text',t:'string',r:true,d:'Text or URL'},{n:'size',t:'number',r:false,d:'Pixels (default 300)'},{n:'format',t:'string',r:false,d:'json or svg'}], fields:[['apikey','your_key'],['text','https://crazyapi.dev'],['size','300']] },
        { method:'GET', path:'/api/tools/shorten',   desc:'URL Shortener',       params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'url',t:'string',r:true,d:'Long URL'}], fields:[['apikey','your_key'],['url','https://example.com/very/long/path?query=yes']] },
        { method:'GET', path:'/api/tools/ip',        desc:'IP Geolocation',      params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'ip',t:'string',r:false,d:'IP address (default: caller)'}], fields:[['apikey','your_key'],['ip','8.8.8.8']] },
        { method:'GET', path:'/api/tools/screenshot',desc:'Website Screenshot',  params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'url',t:'string',r:true,d:'Website URL'},{n:'width',t:'number',r:false,d:'Width px (default 1280)'},{n:'height',t:'number',r:false,d:'Height px (default 720)'}], fields:[['apikey','your_key'],['url','https://example.com']] },
      ]},
      { id:'gen', title:'Generators', items:[
        { method:'GET', path:'/api/tools/password', desc:'Password Generator', params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'length',t:'number',r:false,d:'Length 4-256 (default 16)'},{n:'symbols',t:'boolean',r:false,d:'Include symbols (default false)'}], fields:[['apikey','your_key'],['length','20'],['symbols','true']] },
        { method:'GET', path:'/api/tools/uuid',     desc:'UUID Generator',     params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'count',t:'number',r:false,d:'Count 1-50 (default 1)'}], fields:[['apikey','your_key'],['count','3']] },
        { method:'GET', path:'/api/tools/base64',   desc:'Base64 Encode/Decode',params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'text',t:'string',r:true,d:'Input text'},{n:'action',t:'string',r:false,d:'encode or decode'}], fields:[['apikey','your_key'],['text','Hello World!'],['action','encode']] },
        { method:'GET', path:'/api/tools/lorem',    desc:'Lorem Ipsum',         params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'paragraphs',t:'number',r:false,d:'Paragraphs 1-10 (default 3)'}], fields:[['apikey','your_key'],['paragraphs','2']] },
      ]},
    ]
  },
  anime: {
    label: '🎌 Anime', icon:'🎌',
    desc: 'Anime images via waifu.pics and data from MyAnimeList (Jikan API).',
    groups: [
      { id:'images', title:'Images', items:[
        { method:'GET', path:'/api/anime/waifu',  desc:'Random waifu image',   params:[{n:'apikey',t:'string',r:true,d:'Your API key'}], fields:[['apikey','your_key']] },
        { method:'GET', path:'/api/anime/random', desc:'Image by category',    params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'category',t:'string',r:false,d:'waifu/neko/hug/kiss/pat/cry/bonk/...'}], fields:[['apikey','your_key'],['category','neko']] },
        { method:'GET', path:'/api/anime/many',   desc:'30 images at once',    params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'category',t:'string',r:false,d:'Any SFW category'}], fields:[['apikey','your_key'],['category','waifu']] },
      ]},
      { id:'data', title:'Data (MyAnimeList)', items:[
        { method:'GET', path:'/api/anime/search', desc:'Search anime',         params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'q',t:'string',r:true,d:'Anime name'},{n:'limit',t:'number',r:false,d:'1-20'},{n:'type',t:'string',r:false,d:'tv/movie/ova'},{n:'status',t:'string',r:false,d:'airing/complete/upcoming'}], fields:[['apikey','your_key'],['q','attack on titan'],['limit','5']] },
        { method:'GET', path:'/api/anime/top',    desc:'Top anime list',       params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'type',t:'string',r:false,d:'tv/movie/ova (default tv)'},{n:'filter',t:'string',r:false,d:'bypopularity/favorite/airing'},{n:'limit',t:'number',r:false,d:'1-25'}], fields:[['apikey','your_key'],['type','tv'],['limit','10']] },
        { method:'GET', path:'/api/anime/info',   desc:'Anime info by MAL ID', params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'id',t:'number',r:true,d:'MyAnimeList ID'}], fields:[['apikey','your_key'],['id','21']] },
        { method:'GET', path:'/api/anime/quote',  desc:'Random anime quote',   params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'anime',t:'string',r:false,d:'Filter by anime name'}], fields:[['apikey','your_key']] },
        { method:'GET', path:'/api/anime/fact',   desc:'Random anime fact',    params:[{n:'apikey',t:'string',r:true,d:'Your API key'}], fields:[['apikey','your_key']] },
      ]},
    ]
  },
  search: {
    label: '🔍 Search', icon:'🔍',
    desc: 'Wikipedia, NPM, GitHub, English dictionary and song lyrics.',
    groups: [
      { id:'wiki', title:'Wikipedia', items:[
        { method:'GET', path:'/api/search/wiki',      desc:'Article summary',   params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'q',t:'string',r:true,d:'Article title'},{n:'lang',t:'string',r:false,d:'Language code (default en)'}], fields:[['apikey','your_key'],['q','Artificial intelligence'],['lang','en']] },
        { method:'GET', path:'/api/search/wikipedia', desc:'Search results',    params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'q',t:'string',r:true,d:'Search query'},{n:'limit',t:'number',r:false,d:'Results (default 8)'}], fields:[['apikey','your_key'],['q','JavaScript']] },
      ]},
      { id:'dev', title:'Developer', items:[
        { method:'GET', path:'/api/search/npm',    desc:'NPM package search', params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'q',t:'string',r:true,d:'Package name or keyword'}], fields:[['apikey','your_key'],['q','express']] },
        { method:'GET', path:'/api/search/github', desc:'GitHub search',      params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'q',t:'string',r:true,d:'Query or username'},{n:'type',t:'string',r:false,d:'repos or user (default repos)'}], fields:[['apikey','your_key'],['q','torvalds'],['type','user']] },
      ]},
      { id:'lang', title:'Language', items:[
        { method:'GET', path:'/api/search/dictionary', desc:'English dictionary', params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'word',t:'string',r:true,d:'Word to look up'}], fields:[['apikey','your_key'],['word','serendipity']] },
        { method:'GET', path:'/api/search/lyrics',     desc:'Song lyrics',        params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'artist',t:'string',r:true,d:'Artist name'},{n:'title',t:'string',r:true,d:'Song title'}], fields:[['apikey','your_key'],['artist','Eminem'],['title','Lose Yourself']] },
      ]},
    ]
  },
  sports: {
    label: '⚽ Sports', icon:'⚽',
    desc: 'Live football scores, team info and league standings via TheSportsDB.',
    groups: [
      { id:'football', title:'Football', items:[
        { method:'GET', path:'/api/sports/football/live',      desc:'Live/recent scores',  params:[{n:'apikey',t:'string',r:true,d:'Your API key'}], fields:[['apikey','your_key']] },
        { method:'GET', path:'/api/sports/football/team',      desc:'Search team',         params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'q',t:'string',r:true,d:'Team name'}], fields:[['apikey','your_key'],['q','Arsenal']] },
        { method:'GET', path:'/api/sports/football/standings', desc:'League standings',    params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'league',t:'string',r:false,d:'premier_league/la_liga/bundesliga/serie_a/ligue_1/mls/...'},{n:'season',t:'string',r:false,d:'e.g. 2023-2024'}], fields:[['apikey','your_key'],['league','premier_league'],['season','2023-2024']] },
        { method:'GET', path:'/api/sports/football/results',   desc:'Team last results',   params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'team_id',t:'string',r:true,d:'Team ID from /football/team'}], fields:[['apikey','your_key'],['team_id','133604']] },
      ]},
    ]
  },
  fun: {
    label: '😂 Fun', icon:'😂',
    desc: 'Jokes, memes, quotes, fun facts and trivia questions.',
    groups: [
      { id:'all', title:'All Fun', items:[
        { method:'GET', path:'/api/fun/joke',   desc:'Random joke',         params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'category',t:'string',r:false,d:'Any/Programming/Dark/Pun'},{n:'blacklist',t:'string',r:false,d:'nsfw/religious/political/racist'}], fields:[['apikey','your_key'],['category','Programming']] },
        { method:'GET', path:'/api/fun/meme',   desc:'Random meme',         params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'subreddit',t:'string',r:false,d:'Subreddit (default random)'}], fields:[['apikey','your_key'],['subreddit','ProgrammerHumor']] },
        { method:'GET', path:'/api/fun/quote',  desc:'Inspirational quote', params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'category',t:'string',r:false,d:'Topic tag'}], fields:[['apikey','your_key']] },
        { method:'GET', path:'/api/fun/fact',   desc:'Random fun fact',     params:[{n:'apikey',t:'string',r:true,d:'Your API key'}], fields:[['apikey','your_key']] },
        { method:'GET', path:'/api/fun/trivia', desc:'Trivia question',     params:[{n:'apikey',t:'string',r:true,d:'Your API key'},{n:'difficulty',t:'string',r:false,d:'easy/medium/hard'},{n:'amount',t:'number',r:false,d:'1-10 questions'}], fields:[['apikey','your_key'],['difficulty','medium'],['amount','1']] },
      ]},
    ]
  }
};

// ─── Render a full category page ───────────────────────────────────────────
function renderCategoryPage(catId, contentEl, sidebarEl) {
  const cat = EP[catId];
  if (!cat) return;

  // Build sidebar sub-links
  if (sidebarEl) {
    sidebarEl.innerHTML = '';
    cat.groups.forEach(g => {
      const btn = document.createElement('button');
      btn.className = 'sidebar-link';
      btn.id = 'sbl-' + g.id;
      btn.innerHTML = `${g.title}<span class="sidebar-count">${g.items.length}</span>`;
      btn.onclick = () => switchGroup(g.id);
      sidebarEl.appendChild(btn);
    });
  }

  // Build endpoint groups
  if (contentEl) {
    contentEl.innerHTML = '';
    cat.groups.forEach((g, gi) => {
      const div = document.createElement('div');
      div.className = 'ep-group' + (gi === 0 ? ' active' : '');
      div.id = 'grp-' + g.id;

      const header = `<div class="ep-group-header">
        <div class="ep-group-title">${cat.icon} ${g.title}</div>
        <div class="ep-group-desc">${cat.desc}</div>
      </div>`;

      const cards = g.items.map((ep, i) => buildEndpointCard(ep, `${catId}-${g.id}-${i}`)).join('');
      div.innerHTML = header + cards;
      contentEl.appendChild(div);
    });
  }

  // Activate first sidebar link
  if (sidebarEl && cat.groups.length > 0) {
    sidebarEl.querySelector('.sidebar-link')?.classList.add('active');
  }
}
