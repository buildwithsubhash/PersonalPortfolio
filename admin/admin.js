'use strict';

/* ------------------------------------------------------------------ *
 *  Settings: change these if the repository is renamed or moved.
 * ------------------------------------------------------------------ */
const CONFIG = {
  owner: 'buildwithsubhash',
  repo: 'PersonalPortfolio',
  branch: 'main',
  projectsPath: 'projects/projects.json',
  skillsPath: 'skills.json',
  imageDir: 'assets/images/projects/',
  siteUrl: 'https://buildwithsubhash.github.io/PersonalPortfolio/'
};

const CATEGORIES = [
  ['python', 'Python'], ['mern', 'MERN Stack'], ['lamp', 'LAMP Stack'],
  ['basicweb', 'Basic Web'], ['android', 'Android App'], ['other', 'Other']
];

const API = 'https://api.github.com';
const STORE_KEY = 'portfolio-admin-token';

/* ------------------------------------------------------------------ *
 *  Small helpers (everything is built with textContent / DOM nodes,
 *  never innerHTML, so project data can't inject markup).
 * ------------------------------------------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'for') el.htmlFor = v;
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

function b64encodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decodeUtf8(b64) {
  const bin = atob(String(b64).replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1]);
    fr.onerror = () => reject(new Error('Could not read the image.'));
    fr.readAsDataURL(blob);
  });
}
const clone = v => JSON.parse(JSON.stringify(v));
const isHttpUrl = s => /^https?:\/\/[^\s]+$/i.test(s);
const safeFile = s => typeof s === 'string' && /^[\w.\-]+$/.test(s);
const slug = s => (s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project').slice(0, 40);

/* ------------------------------------------------------------------ *
 *  State
 * ------------------------------------------------------------------ */
let token = '';
const remote = { projects: null, skills: null };   // {sha, data} as last read from GitHub
const draft = { projects: [], skills: [] };        // what the editor is changing
const pendingImages = new Map();                   // filename -> {base64, url}
let busy = false;

/* ------------------------------------------------------------------ *
 *  GitHub API
 * ------------------------------------------------------------------ */
async function gh(path, { method = 'GET', body } = {}) {
  const res = await fetch(API + path, {
    method,
    cache: 'no-store',
    headers: Object.assign({
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: 'Bearer ' + token
    }, body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok) {
    const err = new Error((data && data.message) || res.statusText || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

const contentsPath = p => `/repos/${CONFIG.owner}/${CONFIG.repo}/contents/` + p.split('/').map(encodeURIComponent).join('/');

function explain(err) {
  switch (err.status) {
    case 401: return 'GitHub rejected the token (expired or mistyped). Sign in again with a fresh token.';
    case 403: return 'The token is not allowed to do that. Give it "Contents: Read and write" on this repository. (' + err.message + ')';
    case 404: return 'Repository, branch or file not found, or the token has no access to it. Check the settings at the top of admin.js and the token\'s repository access.';
    case 409:
    case 422: return 'The file changed on GitHub since you loaded it. Click Reload to get the latest version, then redo your edit.';
    default:  return err.message || 'Something went wrong.';
  }
}

async function loadFile(path) {
  const d = await gh(`${contentsPath(path)}?ref=${encodeURIComponent(CONFIG.branch)}`);
  if (!d || d.encoding !== 'base64' || typeof d.content !== 'string') throw new Error(`${path} could not be read.`);
  const data = JSON.parse(b64decodeUtf8(d.content));
  if (!Array.isArray(data)) throw new Error(`${path} is not a list.`);
  return { sha: d.sha, data };
}

async function putFile(path, contentB64, sha, message) {
  const body = { message, content: contentB64, branch: CONFIG.branch };
  if (sha) body.sha = sha;
  return gh(contentsPath(path), { method: 'PUT', body });
}

/* ------------------------------------------------------------------ *
 *  Status line
 * ------------------------------------------------------------------ */
function say(msg, kind = '') {
  const box = $('#status');
  box.textContent = msg;
  box.className = 'status ' + kind;
  box.hidden = !msg;
}

/* ------------------------------------------------------------------ *
 *  Sign in / out
 * ------------------------------------------------------------------ */
async function signIn(tok, remember) {
  token = tok.trim();
  if (!token) throw new Error('Paste your access token first.');
  const repo = await gh(`/repos/${CONFIG.owner}/${CONFIG.repo}`);
  if (!repo.permissions || !repo.permissions.push) {
    throw new Error('This token can read the repository but not write to it. Give it "Contents: Read and write".');
  }
  let login = '';
  try { login = (await gh('/user')).login || ''; } catch (e) { /* optional */ }
  try {
    (remember ? localStorage : sessionStorage).setItem(STORE_KEY, token);
    (remember ? sessionStorage : localStorage).removeItem(STORE_KEY);
  } catch (e) { /* storage unavailable: stay signed in for this page only */ }
  $('#who').textContent = login ? `Signed in as ${login}` : 'Signed in';
  await loadAll();
  $('#login-view').hidden = true;
  $('#editor-view').hidden = false;
  $('#session').hidden = false;
  $('#live-link').href = CONFIG.siteUrl;
}

function signOut() {
  token = '';
  try { sessionStorage.removeItem(STORE_KEY); localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  remote.projects = remote.skills = null;
  draft.projects = []; draft.skills = [];
  releaseImages();
  $('#token').value = '';
  $('#editor-view').hidden = true;
  $('#session').hidden = true;
  $('#publish-bar').hidden = true;
  $('#login-view').hidden = false;
  closeForms();
  say('');
}

/* ------------------------------------------------------------------ *
 *  Load / dirty tracking
 * ------------------------------------------------------------------ */
async function loadAll() {
  const [p, s] = await Promise.all([loadFile(CONFIG.projectsPath), loadFile(CONFIG.skillsPath)]);
  remote.projects = p; remote.skills = s;
  draft.projects = clone(p.data);
  draft.skills = clone(s.data);
  releaseImages();
  closeForms();
  renderAll();
}

function releaseImages() {
  for (const img of pendingImages.values()) URL.revokeObjectURL(img.url);
  pendingImages.clear();
}

const usedPendingImages = () => [...pendingImages.keys()].filter(n => draft.projects.some(p => p.image === n));
const projectsChanged = () => JSON.stringify(draft.projects) !== JSON.stringify(remote.projects.data);
const skillsChanged = () => JSON.stringify(draft.skills) !== JSON.stringify(remote.skills.data);
const isDirty = () => !!remote.projects && (projectsChanged() || skillsChanged());

function updatePublishBar() {
  const parts = [];
  if (remote.projects && projectsChanged()) parts.push('projects');
  if (remote.skills && skillsChanged()) parts.push('skills');
  const n = usedPendingImages().length;
  if (n) parts.push(n === 1 ? '1 new image' : `${n} new images`);
  $('#publish-bar').hidden = parts.length === 0;
  $('#publish-summary').textContent = parts.length ? 'Unpublished changes: ' + parts.join(', ') : '';
}

window.addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

/* ------------------------------------------------------------------ *
 *  Rendering: lists
 * ------------------------------------------------------------------ */
function renderAll() { renderProjects(); renderSkills(); updatePublishBar(); }

function move(list, i, delta) {
  const j = i + delta;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}

function categoryLabel(key) { const c = CATEGORIES.find(x => x[0] === key); return c ? c[1] : (key || 'Other'); }

function projectThumb(p) {
  if (p.image && pendingImages.has(p.image)) return h('img', { class: 'thumb', src: pendingImages.get(p.image).url, alt: '' });
  if (safeFile(p.image)) return h('img', { class: 'thumb', src: '../' + CONFIG.imageDir + encodeURIComponent(p.image), alt: '' });
  return h('div', { class: 'thumb', 'aria-hidden': 'true', text: categoryLabel(p.category) });
}

function renderProjects() {
  const ul = $('#project-list');
  ul.replaceChildren();
  $('#projects-count').textContent = `(${draft.projects.length})`;
  if (!draft.projects.length) ul.append(h('li', { class: 'empty', text: 'No projects yet. Click "Add project".' }));
  draft.projects.forEach((p, i) => {
    const links = [];
    if (isHttpUrl(p.links && p.links.view)) links.push(h('a', { href: p.links.view, target: '_blank', rel: 'noopener noreferrer', text: 'Live' }));
    if (isHttpUrl(p.links && p.links.code)) links.push(h('a', { href: p.links.code, target: '_blank', rel: 'noopener noreferrer', text: 'Code' }));
    ul.append(h('li', { class: 'item' },
      projectThumb(p),
      h('div', {},
        h('h3', {}, String(p.name || '(untitled)'), h('span', { class: 'chip', text: categoryLabel(p.category) })),
        h('p', { text: String(p.desc || '') }),
        links.length ? h('p', {}, ...links.flatMap((a, k) => k ? [' · ', a] : [a])) : null),
      h('div', { class: 'actions' },
        h('button', { type: 'button', 'aria-label': `Move ${p.name} up`, disabled: i === 0, onclick: () => { move(draft.projects, i, -1); renderAll(); } }, '↑'),
        h('button', { type: 'button', 'aria-label': `Move ${p.name} down`, disabled: i === draft.projects.length - 1, onclick: () => { move(draft.projects, i, 1); renderAll(); } }, '↓'),
        h('button', { type: 'button', onclick: () => openProjectForm(i) }, 'Edit'),
        h('button', { type: 'button', class: 'danger', onclick: () => {
          if (confirm(`Delete "${p.name}"? (You can still discard before publishing.)`)) { draft.projects.splice(i, 1); renderAll(); }
        } }, 'Delete'))));
  });
}

function renderSkills() {
  const ul = $('#skill-list');
  ul.replaceChildren();
  $('#skills-count').textContent = `(${draft.skills.length})`;
  if (!draft.skills.length) ul.append(h('li', { class: 'empty', text: 'No skills yet. Click "Add skill".' }));
  draft.skills.forEach((s, i) => {
    ul.append(h('li', { class: 'item skill' },
      isHttpUrl(s.icon) ? h('img', { class: 'thumb', src: s.icon, alt: '' }) : h('div', { class: 'thumb', 'aria-hidden': 'true', text: '?' }),
      h('div', {}, h('h3', { text: String(s.name || '(unnamed)') })),
      h('div', { class: 'actions' },
        h('button', { type: 'button', 'aria-label': `Move ${s.name} up`, disabled: i === 0, onclick: () => { move(draft.skills, i, -1); renderAll(); } }, '↑'),
        h('button', { type: 'button', 'aria-label': `Move ${s.name} down`, disabled: i === draft.skills.length - 1, onclick: () => { move(draft.skills, i, 1); renderAll(); } }, '↓'),
        h('button', { type: 'button', onclick: () => openSkillForm(i) }, 'Edit'),
        h('button', { type: 'button', class: 'danger', onclick: () => {
          if (confirm(`Remove "${s.name}"?`)) { draft.skills.splice(i, 1); renderAll(); }
        } }, 'Delete'))));
  });
}

/* ------------------------------------------------------------------ *
 *  Forms
 * ------------------------------------------------------------------ */
function closeForms() { $('#project-form').replaceChildren(); $('#skill-form').replaceChildren(); }

function field(id, label, control, hint) {
  return h('div', {}, h('label', { for: id, text: label }), control,
    hint ? h('p', { class: 'hint', text: hint }) : null,
    h('p', { class: 'field-error', id: id + '-err', hidden: true }));
}
function fail(id, msg) { const e = $('#' + id + '-err'); e.textContent = msg; e.hidden = false; $('#' + id).focus(); return false; }
function clearErrors(root) { root.querySelectorAll('.field-error').forEach(e => { e.hidden = true; }); }

async function prepareImage(file) {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('Please choose a PNG, JPG, WebP or GIF image.');
  if (file.size > 15 * 1024 * 1024) throw new Error('That image is over 15 MB. Please pick a smaller one.');
  let bmp;
  try { bmp = await createImageBitmap(file); } catch (e) { throw new Error('That file could not be read as an image.'); }
  const scale = Math.min(1, 1200 / bmp.width);
  const w = Math.max(1, Math.round(bmp.width * scale)), hgt = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = hgt;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, hgt);
  if (bmp.close) bmp.close();
  let blob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.85));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Could not process the image.');
  return { ext: blob.type === 'image/webp' ? 'webp' : 'jpg', base64: await blobToBase64(blob), url: URL.createObjectURL(blob) };
}

function openProjectForm(index) {
  const editing = index != null;
  const p = editing ? draft.projects[index] : { name: '', desc: '', category: 'python', image: '', links: { view: '', code: '' } };
  const links = p.links || {};
  const known = CATEGORIES.some(c => c[0] === p.category);
  const options = (known ? CATEGORIES : [[p.category, categoryLabel(p.category)], ...CATEGORIES]).map(([v, l]) => h('option', { value: v, selected: v === p.category, text: l }));

  let newImage = null, removeImage = false;
  const preview = h('img', { class: 'preview', alt: 'Screenshot preview', hidden: !p.image });
  const setPreview = () => {
    const src = newImage ? newImage.url
      : (!removeImage && p.image ? (pendingImages.has(p.image) ? pendingImages.get(p.image).url : (safeFile(p.image) ? '../' + CONFIG.imageDir + encodeURIComponent(p.image) : '')) : '');
    preview.hidden = !src; if (src) preview.src = src;
  };
  setPreview();

  const fileInput = h('input', { id: 'pf-image', type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', onchange: async e => {
    const f = e.target.files[0]; if (!f) return;
    try { newImage = await prepareImage(f); removeImage = false; $('#pf-image-err').hidden = true; setPreview(); }
    catch (err) { newImage = null; e.target.value = ''; fail('pf-image', err.message); }
  } });
  const removeBox = h('input', { id: 'pf-remove', type: 'checkbox', onchange: e => { removeImage = e.target.checked; setPreview(); } });

  const form = h('form', { class: 'card form-card', onsubmit: e => {
    e.preventDefault(); clearErrors(form);
    const name = $('#pf-name').value.trim(), desc = $('#pf-desc').value.trim();
    const view = $('#pf-view').value.trim(), code = $('#pf-code').value.trim();
    if (!name) return fail('pf-name', 'Give the project a name.');
    if (name.length > 80) return fail('pf-name', 'Keep the name under 80 characters.');
    if (!desc) return fail('pf-desc', 'Add a short description.');
    if (desc.length > 300) return fail('pf-desc', 'Keep the description under 300 characters.');
    if (view && !isHttpUrl(view)) return fail('pf-view', 'Use a full link starting with https://');
    if (code && !isHttpUrl(code)) return fail('pf-code', 'Use a full link starting with https://');

    let image = p.image || '';
    if (removeImage) image = '';
    if (newImage) {
      image = `${slug(name)}-${Date.now().toString(36)}.${newImage.ext}`;
      pendingImages.set(image, { base64: newImage.base64, url: newImage.url });
    }
    const item = { name, desc, category: $('#pf-category').value, image, links: { view, code } };
    if (editing) draft.projects[index] = item; else draft.projects.push(item);
    closeForms(); renderAll();
  } },
    h('h3', { text: editing ? 'Edit project' : 'New project' }),
    field('pf-name', 'Name', h('input', { id: 'pf-name', type: 'text', maxLength: 80, value: p.name || '', required: true })),
    field('pf-desc', 'Description', h('textarea', { id: 'pf-desc', maxLength: 300, value: p.desc || '' }), 'One or two sentences. Plain text only.'),
    field('pf-category', 'Category', h('select', { id: 'pf-category' }, options), 'Controls the filter buttons on the projects page.'),
    field('pf-view', 'Live link (optional)', h('input', { id: 'pf-view', type: 'url', value: links.view || '', placeholder: 'https://…' })),
    field('pf-code', 'Code link (optional)', h('input', { id: 'pf-code', type: 'url', value: links.code || '', placeholder: 'https://github.com/…' })),
    field('pf-image', 'Screenshot (optional)', fileInput, 'Resized to 1200 px wide and saved as WebP/JPG. Animated GIFs become still images.'),
    preview,
    p.image ? h('label', { class: 'inline', for: 'pf-remove' }, removeBox, 'Remove current screenshot') : null,
    h('div', { class: 'form-actions' },
      h('button', { type: 'submit', class: 'primary' }, editing ? 'Update project' : 'Add project'),
      h('button', { type: 'button', onclick: closeForms }, 'Cancel')));
  $('#project-form').replaceChildren(form);
  $('#pf-name').focus();
}

function openSkillForm(index) {
  const editing = index != null;
  const s = editing ? draft.skills[index] : { name: '', icon: '' };
  const preview = h('img', { class: 'preview', alt: 'Icon preview', hidden: !isHttpUrl(s.icon || ''), src: isHttpUrl(s.icon || '') ? s.icon : undefined });
  const form = h('form', { class: 'card form-card', onsubmit: e => {
    e.preventDefault(); clearErrors(form);
    const name = $('#sf-name').value.trim(), icon = $('#sf-icon').value.trim();
    if (!name) return fail('sf-name', 'Give the skill a name.');
    if (name.length > 40) return fail('sf-name', 'Keep the name under 40 characters.');
    if (!/^https:\/\/[^\s]+$/i.test(icon)) return fail('sf-icon', 'Icons must be a full link starting with https://');
    const item = { name, icon };
    if (editing) draft.skills[index] = item; else draft.skills.push(item);
    closeForms(); renderAll();
  } },
    h('h3', { text: editing ? 'Edit skill' : 'New skill' }),
    field('sf-name', 'Name', h('input', { id: 'sf-name', type: 'text', maxLength: 40, value: s.name || '', required: true })),
    field('sf-icon', 'Icon link', h('input', { id: 'sf-icon', type: 'url', value: s.icon || '', placeholder: 'https://…', required: true,
      oninput: e => { const v = e.target.value.trim(); preview.hidden = !/^https:\/\//i.test(v); if (!preview.hidden) preview.src = v; } }),
      'A small logo image, e.g. from icons8.com or devicon.'),
    preview,
    h('div', { class: 'form-actions' },
      h('button', { type: 'submit', class: 'primary' }, editing ? 'Update skill' : 'Add skill'),
      h('button', { type: 'button', onclick: closeForms }, 'Cancel')));
  $('#skill-form').replaceChildren(form);
  $('#sf-name').focus();
}

/* ------------------------------------------------------------------ *
 *  Publish
 * ------------------------------------------------------------------ */
function setBusy(on) {
  busy = on;
  ['#publish', '#discard', '#reload', '#signout', '#add-project', '#add-skill'].forEach(sel => { $(sel).disabled = on; });
}

async function publish() {
  if (busy || !isDirty()) return;
  setBusy(true);
  try {
    const images = usedPendingImages();
    for (const [i, name] of images.entries()) {
      say(`Uploading image ${i + 1} of ${images.length}…`);
      await putFile(CONFIG.imageDir + name, pendingImages.get(name).base64, null, `Admin: add screenshot ${name}`);
    }
    if (projectsChanged()) {
      say('Saving projects…');
      const text = JSON.stringify(draft.projects, null, 2) + '\n';
      const r = await putFile(CONFIG.projectsPath, b64encodeUtf8(text), remote.projects.sha, 'Admin: update projects');
      remote.projects = { sha: r.content.sha, data: clone(draft.projects) };
    }
    if (skillsChanged()) {
      say('Saving skills…');
      const text = JSON.stringify(draft.skills, null, 2) + '\n';
      const r = await putFile(CONFIG.skillsPath, b64encodeUtf8(text), remote.skills.sha, 'Admin: update skills');
      remote.skills = { sha: r.content.sha, data: clone(draft.skills) };
    }
    images.forEach(n => { URL.revokeObjectURL(pendingImages.get(n).url); pendingImages.delete(n); });
    renderAll();
    say('Published. GitHub Pages usually shows the change on the live site within a minute or two.', 'ok');
  } catch (err) {
    say(explain(err), 'error');
    if (err.status === 401) signOutKeepMessage(explain(err));
  } finally {
    setBusy(false);
  }
}

function signOutKeepMessage(msg) { signOut(); say(msg, 'error'); }

/* ------------------------------------------------------------------ *
 *  Wiring
 * ------------------------------------------------------------------ */
function selectTab(name) {
  for (const t of ['projects', 'skills']) {
    $('#tab-' + t).setAttribute('aria-selected', String(t === name));
    $('#panel-' + t).hidden = t !== name;
  }
}

$('#tab-projects').addEventListener('click', () => selectTab('projects'));
$('#tab-skills').addEventListener('click', () => selectTab('skills'));
$('#add-project').addEventListener('click', () => openProjectForm(null));
$('#add-skill').addEventListener('click', () => openSkillForm(null));
$('#publish').addEventListener('click', publish);
$('#signout').addEventListener('click', () => { if (!isDirty() || confirm('You have unpublished changes. Sign out anyway?')) signOut(); });

$('#discard').addEventListener('click', () => {
  if (!confirm('Throw away all unpublished changes?')) return;
  draft.projects = clone(remote.projects.data); draft.skills = clone(remote.skills.data);
  releaseImages(); closeForms(); renderAll(); say('Changes discarded.');
});

$('#reload').addEventListener('click', async () => {
  if (busy) return;
  if (isDirty() && !confirm('Reloading replaces your unpublished changes with what is on GitHub. Continue?')) return;
  setBusy(true);
  try { say('Reloading…'); await loadAll(); say('Loaded the latest version from GitHub.', 'ok'); }
  catch (err) { say(explain(err), 'error'); }
  finally { setBusy(false); }
});

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#login-btn'); btn.disabled = true; say('Checking token…');
  try { await signIn($('#token').value, $('#remember').checked); say(''); }
  catch (err) { token = ''; say(err.status ? explain(err) : err.message, 'error'); }
  finally { btn.disabled = false; }
});

(async function resume() {
  let saved = null;
  try { saved = sessionStorage.getItem(STORE_KEY) || localStorage.getItem(STORE_KEY); } catch (e) { /* ignore */ }
  if (!saved) return;
  say('Signing in…');
  try { await signIn(saved, !!localStorage.getItem(STORE_KEY)); say(''); }
  catch (err) { token = ''; try { sessionStorage.removeItem(STORE_KEY); localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } say(err.status === 401 ? 'Your saved token is no longer valid. Please sign in again.' : explain(err), 'error'); }
})();
