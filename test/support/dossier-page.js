import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

// Exercise the real click handler and renderer without a browser sign-in.
export async function openDossier(property, { events = [], snapshots = [] } = {}) {
  const listeners = new Map();
  const main = { innerHTML: '' }, account = { innerHTML: '' };
  let pathname = '/';
  const requests = [];
  const context = vm.createContext({
    URL, URLSearchParams, Intl, setTimeout,
    document: {
      querySelector: selector => selector === '#main' ? main : account,
      addEventListener: (name, handler) => listeners.set(name, handler),
    },
    window: { addEventListener() {}, scrollTo() {} },
    location: { pathname, search: '', origin: 'https://example.test' },
    history: { pushState: (_state, _title, path) => { pathname = path; } },
    fetch: async path => {
      requests.push(path);
      if (path === '/api/session') return { ok: false, status: 401, json: async () => ({ error: 'Please sign in.' }) };
      if (path === `/api/properties/${property.id}`) return { ok: true, json: async () => ({ property, events, snapshots, nextBefore: null }) };
      throw new Error(`Unexpected request: ${path}`);
    },
  });
  await vm.runInContext(await readFile(new URL('../../public/app.js', import.meta.url), 'utf8'), context);
  vm.runInContext("state.user = { id: 'test', name: 'Test user' };", context);
  let resolveRender;
  const rendered = new Promise(resolve => { resolveRender = resolve; });
  let html = main.innerHTML;
  Object.defineProperty(main, 'innerHTML', {
    get: () => html,
    set: value => {
      html = value;
      if (value.includes('id="feedback"') || value.includes('class="error"')) resolveRender();
    },
  });
  let timer;
  try {
    await listeners.get('click')({ target: { closest: () => ({ dataset: { property: property.id } }) }, preventDefault() {} });
    await Promise.race([rendered, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Dossier did not render.')), 2000); })]);
    return { html, pathname, requests };
  } finally { clearTimeout(timer); }
}
