/* Cromoteca móvil — datos locales (IndexedDB). Sustituye al servidor del PC:
   expone Store.api(ruta, opciones) con las mismas rutas que usaba la interfaz. */
(function () {
'use strict';
const NOM = 'cromoteca', VER = 1;
const FUENTE = 'https://www.dragonball.center';
const P_COL = '/files/module_dbc/_thumbs/colecciones/', P_IMG = '/files/module_dbc/objetos/', P_TH = '/files/module_dbc/_thumbs/objetos/';
const SEQ_COL = 9000000, SEQ_CRO = 500000000;
let db = null, cat = [], propias = [], mis = new Map(), uso = {}, cnt = new Map();
const ahora = () => new Date().toISOString();
const sin = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const p = r => new Promise((ok, mal) => { r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); });
const fin = t => new Promise((ok, mal) => { t.oncomplete = ok; t.onerror = () => mal(t.error); t.onabort = () => mal(t.error || new Error('Operación cancelada (¿poco espacio?)')); });
function abrir() {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(NOM, VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('cat_col', { keyPath: 'id' });
      d.createObjectStore('cat_cro', { keyPath: 'id' }).createIndex('col', 'col');
      d.createObjectStore('mis_col', { keyPath: 'id' });
      d.createObjectStore('mis_cro', { keyPath: 'id' }).createIndex('col', 'col');
      d.createObjectStore('fotos', { keyPath: 'k' });
      d.createObjectStore('meta', { keyPath: 'k' });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error || new Error('No se pudo abrir el almacenamiento del navegador'));
  });
}
const getAll = n => p(db.transaction(n).objectStore(n).getAll());
async function mGet(k, def = null) { const r = await p(db.transaction('meta').objectStore('meta').get(k)); return r ? r.v : def; }
async function mSet(k, v) { const t = db.transaction('meta', 'readwrite'); t.objectStore('meta').put({ k, v }); await fin(t); }
async function vaciar(nombres) { const t = db.transaction(nombres, 'readwrite'); nombres.forEach(n => t.objectStore(n).clear()); await fin(t); }
async function siguiente(clave, inicio) { const n = (await mGet(clave, inicio - 1)) + 1; await mSet(clave, n); return n; }

/* ---------- memoria ---------- */
function prep() { for (const c of cat.concat(propias)) Object.defineProperty(c, '_b', { value: sin(`${c.titulo} ${c.fabricante} ${c.anio}`), enumerable: false, writable: true }); }
function recalc() {
  cnt = new Map();
  for (const m of mis.values()) {
    let k = cnt.get(m.col); if (!k) cnt.set(m.col, k = { tengo: 0, repes: 0, extra: 0, alguno: 0 });
    if (m.cantidad > 0) { k.alguno++; if (m.tipo !== 'extra') { k.tengo++; if (m.cantidad > 1) k.repes += m.cantidad - 1; } }
    if (m.propio && m.tipo !== 'extra') k.extra++;
  }
}
async function cargarMemoria() {
  cat = await getAll('cat_col'); cat.forEach(c => c.cat = 1);
  propias = await getAll('mis_col');
  mis = new Map((await getAll('mis_cro')).map(r => [r.id, r]));
  uso = await mGet('uso', {});
  prep(); recalc();
}
const todas = () => cat.concat(propias);
const total = c => (c.n || 0) + ((cnt.get(c.id) || {}).extra || 0);
function colFull(c) {
  const k = cnt.get(c.id) || { tengo: 0, repes: 0, alguno: 0 };
  return { id: c.id, dbc_id: c.dbc_id || null, slug: c.slug || '', titulo: c.titulo, fabricante: c.fabricante, paises: c.paises, paises_nombre: c.paises_nombre,
    anio: c.anio, categoria: c.categoria, licencia: c.licencia, descripcion: c.descripcion || '', propia: c.propia ? 1 : 0,
    portada_ref: c.p ? (c.p[0] === '/' ? c.p : P_COL + c.p) : '', items_importados: 1, n_items: total(c),
    ultimo_uso: uso[c.id] || null, total: total(c), tengo: k.tengo, repes: k.repes, alguno: k.alguno };
}
function cromoFull(b, m) {
  const i = b.i || '', t = b.t || '';
  return { id: b.id, coleccion_id: b.col, dbc_id: b.propio ? null : b.id, etiqueta: b.etiqueta, numero: b.numero || '', seccion: b.seccion || '', tipo: b.tipo || 'cromo',
    orden: b.o || 0, etiquetas: b.et || '', ref_n: b.rn || 0,
    ref_img: i ? (i[0] === '/' ? i : P_IMG + i) : '',
    ref_thumb: t ? (t[0] === '/' ? t : P_TH + t) : (i && i[0] !== '/' ? P_TH + i.split('/').pop().replace(/\.(\w+)$/, '.250x250.$1') : ''),
    cantidad: m ? m.cantidad : 0, estado: m ? m.estado : '', notas: m ? m.notas : '',
    foto_anverso: m ? m.foto_anverso : '', foto_reverso: m ? m.foto_reverso : '', thumb: m ? m.thumb : '', hash: m ? m.hash : '' };
}
const nuevaFila = b => ({ id: b.id, col: b.col, tipo: b.tipo || 'cromo', cantidad: 0, estado: '', notas: '', foto_anverso: '', foto_reverso: '', thumb: '', hash: '', actualizado: ahora() });
async function getBase(id) {
  const m = mis.get(id); if (m && m.propio) return m;
  return await p(db.transaction('cat_cro').objectStore('cat_cro').get(id)) || null;
}
async function cromosDe(colId) {
  const c = todas().find(x => x.id === colId);
  const base = c && c.cat ? await p(db.transaction('cat_cro').objectStore('cat_cro').index('col').getAll(colId)) : [];
  const propios = [...mis.values()].filter(m => m.col === colId && m.propio);
  const l = base.map(b => cromoFull(b, mis.get(b.id))).concat(propios.map(m => cromoFull(m, m)));
  return l.sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo < b.tipo ? -1 : 1) || a.orden - b.orden || a.id - b.id);
}
const vacia = m => !m.propio && !m.cantidad && !m.estado && !m.notas && !m.foto_anverso && !m.foto_reverso;
async function guardarMis(filas) {
  const t = db.transaction('mis_cro', 'readwrite'), s = t.objectStore('mis_cro');
  for (const m of [].concat(filas)) { if (vacia(m)) { s.delete(m.id); mis.delete(m.id); } else { s.put(m); mis.set(m.id, m); } }
  await fin(t); recalc();
}
async function guardarFoto(durl, clave) {
  if (!durl) return '';
  const blob = await (await fetch(durl)).blob();
  const t = db.transaction('fotos', 'readwrite'); t.objectStore('fotos').put({ k: clave, blob }); await fin(t);
  return clave;
}
async function borrarFoto(k) { if (!k) return; const t = db.transaction('fotos', 'readwrite'); t.objectStore('fotos').delete(k); await fin(t); }
const hamming = (a, b) => { if (!a || !b || a.length !== b.length) return 999; let d = 0; for (let i = 0; i < a.length; i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { d += x & 1; x >>= 1; } } return d; };

/* ---------- catálogo ---------- */
async function cargarCatalogo(progreso, forzar) {
  progreso('Descargando el catálogo…', 0.02);
  let r; try { r = await fetch('data/catalogo.json', { cache: forzar ? 'reload' : 'default' }); } catch { throw new Error('Sin conexión. La primera vez hace falta internet para descargar el catálogo (1 MB).'); }
  if (!r.ok) throw new Error('No se pudo descargar el catálogo (error ' + r.status + ')');
  const d = await r.json();
  progreso('Preparando el catálogo…', 0.08);
  await vaciar(['cat_col', 'cat_cro']);
  { const t = db.transaction('cat_col', 'readwrite'), s = t.objectStore('cat_col');
    for (const f of d.c) s.put({ id: f[0], dbc_id: f[0], slug: f[1], titulo: f[2], fabricante: f[3], paises: f[4], paises_nombre: f[5], anio: f[6], categoria: f[7], licencia: f[8], p: f[9], descripcion: f[10], n: f[11] });
    await fin(t); }
  const orden = new Map(), L = 4000, tot = d.k.length;
  for (let a = 0; a < tot; a += L) {
    const t = db.transaction('cat_cro', 'readwrite'), s = t.objectStore('cat_cro');
    for (let i = a; i < Math.min(tot, a + L); i++) {
      const f = d.k[i], col = f[1], o = orden.get(col) || 0; orden.set(col, o + 1);
      s.put({ id: f[0], col, etiqueta: f[2], numero: f[3], seccion: f[4], tipo: f[5] ? 'extra' : 'cromo', i: f[6], t: f[7], rn: f[8], et: f[9], o });
    }
    await fin(t); progreso('Preparando el catálogo…', 0.08 + 0.92 * Math.min(1, (a + L) / tot));
  }
  await mSet('cat_v', d.v); await mSet('cat_fecha', d.fecha);
  await cargarMemoria();
}
async function iniciar(progreso) {
  db = await abrir();
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch {}
  const v = await mGet('cat_v', 0);
  if (!v) await cargarCatalogo(progreso, false); else await cargarMemoria();
  return { primera: !v };
}
const version = async () => ({ v: await mGet('cat_v', 0), fecha: await mGet('cat_fecha', '') });
async function buscarActualizacion() {
  const r = await fetch('data/version.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('No se pudo consultar (error ' + r.status + ')');
  const rem = await r.json(), loc = await mGet('cat_v', 0);
  return { hay: rem.v > loc, remoto: rem };
}
async function espacio() {
  let usado = 0, cuota = 0, persistente = false;
  try { const e = await navigator.storage.estimate(); usado = e.usage || 0; cuota = e.quota || 0; } catch {}
  try { persistente = await navigator.storage.persisted(); } catch {}
  return { usado, cuota, persistente };
}

/* ---------- copias de seguridad ---------- */
async function exportar(conFotos) {
  const cabecera = { app: 'Cromoteca', formato: 2, fecha: ahora(), colecciones: propias, cromos: [...mis.values()], uso };
  if (!conFotos) return new Blob([JSON.stringify(cabecera)], { type: 'application/json' });
  const partes = [JSON.stringify(cabecera).slice(0, -1), ',"fotos":{'];
  let primero = true;
  const claves = await p(db.transaction('fotos').objectStore('fotos').getAllKeys());
  for (const k of claves) {
    const f = await p(db.transaction('fotos').objectStore('fotos').get(k));
    const durl = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(f.blob); });
    partes.push((primero ? '' : ',') + JSON.stringify(k) + ':' + JSON.stringify(durl)); primero = false;
  }
  partes.push('}}');
  return new Blob(partes, { type: 'application/json' });
}
async function importar(texto) {
  let d; try { d = JSON.parse(texto); } catch { throw new Error('El archivo no se puede leer'); }
  if (!d || d.app !== 'Cromoteca' || !Array.isArray(d.cromos)) throw new Error('Este archivo no es una copia de Cromoteca');
  let nf = 0;
  for (const [k, durl] of Object.entries(d.fotos || {})) { await guardarFoto(durl, k); nf++; }
  { const t = db.transaction(['mis_col', 'mis_cro'], 'readwrite');
    for (const c of d.colecciones || []) t.objectStore('mis_col').put(c);
    for (const m of d.cromos) t.objectStore('mis_cro').put(m);
    await fin(t); }
  await mSet('uso', Object.assign(await mGet('uso', {}), d.uso || {}));
  const mx = Math.max(SEQ_CRO - 1, ...d.cromos.filter(m => m.propio).map(m => m.id)), mc = Math.max(SEQ_COL - 1, ...(d.colecciones || []).map(c => c.id));
  if (mx > await mGet('seq_cro', 0)) await mSet('seq_cro', mx);
  if (mc > await mGet('seq_col', 0)) await mSet('seq_col', mc);
  await cargarMemoria();
  return { colecciones: (d.colecciones || []).length, cromos: d.cromos.length, fotos: nf };
}

/* ---------- "API" local (mismas rutas que el servidor del PC) ---------- */
const yr = c => { const n = parseInt(c.anio, 10); return Number.isFinite(n) ? n : null; };
const cmpT = (a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' });
const cmpY = (a, b) => { const x = yr(a), y = yr(b); if (x === null && y === null) return 0; if (x === null) return 1; if (y === null) return -1; return x - y; };
const ORDEN = {
  uso: (a, b) => { const x = a.ultimo_uso, y = b.ultimo_uso; if (!x && !y) return cmpT(a, b); if (!x) return 1; if (!y) return -1; return x < y ? 1 : x > y ? -1 : cmpT(a, b); },
  anio: (a, b) => cmpY(a, b) || a.total - b.total || cmpT(a, b),
  anio_desc: (a, b) => { const x = yr(a), y = yr(b); if (x === null && y !== null) return 1; if (y === null && x !== null) return -1; return (y - x) || a.total - b.total || cmpT(a, b); },
  cromos: (a, b) => a.total - b.total || cmpY(a, b) || cmpT(a, b),
  cromos_desc: (a, b) => b.total - a.total || cmpY(a, b) || cmpT(a, b),
  titulo: cmpT
};

async function api(ruta, opc = {}) {
  const [r0, qs] = ruta.split('?'), q = new URLSearchParams(qs || ''), b = opc.body || {};
  const met = opc.body ? (opc.method || 'POST') : 'GET';
  let m;
  if (met === 'GET' && r0 === 'info') {
    const cols = todas(); let tengo = 0, repes = 0, mias = 0;
    for (const k of cnt.values()) { tengo += k.tengo; repes += k.repes; if (k.alguno) mias++; }
    return { ips: [], puerto: '', fuente: FUENTE, ocr: true, local: true, listado: true,
      stats: { colecciones: cols.length, con_cromos: cols.length, cromos: cols.reduce((a, c) => a + total(c), 0), tengo, repes, mias },
      importacion: { activo: false, fase: '', hechas: 0, total: 0, errores: 0, ultimo: '', parar: false } };
  }
  if (met === 'GET' && r0 === 'filtros') {
    const pa = new Map(), ca = new Map(), fa = new Map();
    for (const c of todas()) {
      if (c.paises && !c.paises.includes(',')) { const x = pa.get(c.paises) || { cod: c.paises, nombre: c.paises_nombre, n: 0 }; x.n++; pa.set(c.paises, x); }
      if (c.categoria) ca.set(c.categoria, (ca.get(c.categoria) || 0) + 1);
      if (c.fabricante) fa.set(c.fabricante, (fa.get(c.fabricante) || 0) + 1);
    }
    const por = (l) => l.sort((x, y) => y.n - x.n);
    return { paises: por([...pa.values()]), categorias: por([...ca].map(([nombre, n]) => ({ nombre, n }))), fabricantes: por([...fa].map(([nombre, n]) => ({ nombre, n }))) };
  }
  if (met === 'GET' && r0 === 'colecciones') {
    let l = todas();
    const palabras = sin(q.get('q') || '').trim().split(/\s+/).filter(Boolean).slice(0, 6);
    if (palabras.length) l = l.filter(c => palabras.every(w => c._b.includes(w)));
    if (q.get('pais')) l = l.filter(c => (',' + c.paises + ',').includes(',' + q.get('pais') + ','));
    if (q.get('cat')) l = l.filter(c => c.categoria === q.get('cat'));
    if (q.get('fab')) l = l.filter(c => c.fabricante === q.get('fab'));
    if (q.get('lic') === 'no') l = l.filter(c => !c.licencia);
    let f = l.map(colFull);
    if (q.get('mias')) f = f.filter(c => c.alguno > 0);
    f.sort(ORDEN[q.get('orden')] || ORDEN.titulo);
    const lim = Math.min(+q.get('lim') || 60, 300), des = +q.get('des') || 0;
    return { total: f.length, lista: f.slice(des, des + lim) };
  }
  if (met === 'POST' && r0 === 'colecciones') {
    if (!String(b.titulo || '').trim()) throw new Error('Falta el título');
    const id = await siguiente('seq_col', SEQ_COL);
    const c = { id, dbc_id: null, slug: '', titulo: b.titulo.trim(), fabricante: b.fabricante || '', paises: '', paises_nombre: '', anio: b.anio || '', categoria: 'Colección propia', licencia: 1, p: '', descripcion: '', n: 0, propia: 1 };
    { const t = db.transaction('mis_col', 'readwrite'); t.objectStore('mis_col').put(c); await fin(t); }
    propias.push(c); prep();
    const n = Math.min(+b.n_cromos || 0, 2000), filas = [];
    for (let i = 1; i <= n; i++) filas.push({ id: await siguiente('seq_cro', SEQ_CRO), col: id, tipo: 'cromo', propio: 1, etiqueta: 'Cromo ' + i, numero: String(i), seccion: '', o: i, cantidad: 0, estado: '', notas: '', foto_anverso: '', foto_reverso: '', thumb: '', hash: '', actualizado: ahora() });
    if (filas.length) await guardarMis(filas);
    return { id };
  }
  if ((m = /^colecciones\/(\d+)$/.exec(r0)) && met === 'GET') {
    const c = todas().find(x => x.id === +m[1]); if (!c) throw new Error('Esa colección no existe');
    return { col: colFull(c), aviso: '', cromos: await cromosDe(c.id) };
  }
  if ((m = /^colecciones\/(\d+)\/uso$/.exec(r0)) && met === 'POST') { uso[+m[1]] = ahora(); await mSet('uso', uso); return { ok: 1 }; }
  if ((m = /^colecciones\/(\d+)\/cromos$/.exec(r0)) && met === 'POST') {
    const id = +m[1], num = String(b.numero || '').trim(), et = String(b.etiqueta || '').trim() || ('Cromo ' + num);
    const mx = (await cromosDe(id)).filter(k => k.tipo === 'cromo').reduce((a, k) => Math.max(a, k.orden), 0);
    const fila = { id: await siguiente('seq_cro', SEQ_CRO), col: id, tipo: 'cromo', propio: 1, etiqueta: et, numero: num, seccion: b.seccion || 'Añadidos por mí', o: mx + 1, cantidad: 0, estado: '', notas: '', foto_anverso: '', foto_reverso: '', thumb: '', hash: '', actualizado: ahora() };
    await guardarMis(fila); return { id: fila.id };
  }
  if ((m = /^colecciones\/(\d+)\/completa$/.exec(r0)) && met === 'POST') {
    const id = +m[1], filas = [];
    for (const k of await cromosDe(id)) if (k.tipo === 'cromo' && k.cantidad === 0) { const base = await getBase(k.id); const f = mis.get(k.id) ? { ...mis.get(k.id) } : nuevaFila(base); f.cantidad = 1; f.actualizado = ahora(); filas.push(f); }
    if (filas.length) await guardarMis(filas);
    uso[id] = ahora(); await mSet('uso', uso);
    return { marcados: filas.length };
  }
  if ((m = /^colecciones\/(\d+)\/desmarcar$/.exec(r0)) && met === 'POST') {
    const id = +m[1], todo = b.modo === 'todo', filas = [];
    for (const k of await cromosDe(id)) {
      const f0 = mis.get(k.id); if (k.tipo !== 'cromo' || !f0 || !(f0.cantidad > 0)) continue;
      if (!todo && (f0.foto_anverso || f0.thumb)) continue;
      const f = { ...f0 };
      if (todo) { await borrarFoto(f.foto_anverso); await borrarFoto(f.foto_reverso); await borrarFoto(f.thumb); f.foto_anverso = f.foto_reverso = f.thumb = f.hash = ''; }
      f.cantidad = 0; f.actualizado = ahora(); filas.push(f);
    }
    if (filas.length) await guardarMis(filas);
    return { desmarcados: filas.length };
  }
  if (met === 'POST' && r0 === 'parecidos') {
    const cand = [...mis.values()].filter(x => x.hash && (!b.coleccion_id || x.col === +b.coleccion_id)).map(x => ({ x, dist: hamming(x.hash, b.hash) })).filter(y => y.dist <= 70).sort((a, c) => a.dist - c.dist).slice(0, 5);
    const lista = [];
    for (const { x, dist } of cand) { const base = await getBase(x.id); if (base) lista.push({ id: x.id, coleccion_id: x.col, etiqueta: base.etiqueta, numero: base.numero || '', thumb: x.thumb, hash: x.hash, cantidad: x.cantidad, dist }); }
    return { lista };
  }
  if ((m = /^cromos\/(\d+)\/fotos$/.exec(r0)) && met === 'POST') {
    const id = +m[1], base = await getBase(id); if (!base) throw new Error('Ese cromo no existe');
    const f = mis.get(id) ? { ...mis.get(id) } : nuevaFila(base), t = Date.now();
    const an = await guardarFoto(b.anverso, `${base.col}/${id}_anverso_${t}.jpg`);
    const re = await guardarFoto(b.reverso, `${base.col}/${id}_reverso_${t}.jpg`);
    const th = await guardarFoto(b.thumb, `${base.col}/${id}_mini_${t}.jpg`);
    if (an) { await borrarFoto(f.foto_anverso); f.foto_anverso = an; }
    if (th) { await borrarFoto(f.thumb); f.thumb = th; }
    if (re) { await borrarFoto(f.foto_reverso); f.foto_reverso = re; }
    if (b.hash) f.hash = b.hash;
    f.cantidad = Math.max(f.cantidad, 1) + (b.sumar ? 1 : 0); f.actualizado = ahora();
    await guardarMis(f);
    uso[base.col] = ahora(); mSet('uso', uso);
    return { cromo: cromoFull(base, mis.get(id)) };
  }
  if ((m = /^cromos\/(\d+)$/.exec(r0)) && met === 'PATCH') {
    const id = +m[1], base = await getBase(id); if (!base) throw new Error('Ese cromo no existe');
    const f = mis.get(id) ? { ...mis.get(id) } : nuevaFila(base);
    if (b.quitar_fotos) { await borrarFoto(f.foto_anverso); await borrarFoto(f.foto_reverso); await borrarFoto(f.thumb); f.foto_anverso = f.foto_reverso = f.thumb = f.hash = ''; }
    if (b.cantidad != null) f.cantidad = Math.max(0, Math.min(999, b.cantidad | 0));
    if (b.estado != null) f.estado = b.estado;
    if (b.notas != null) f.notas = b.notas;
    if (f.propio) { if (b.etiqueta != null) f.etiqueta = b.etiqueta; if (b.numero != null) f.numero = b.numero; }
    f.actualizado = ahora();
    await guardarMis(f);
    return { cromo: cromoFull(base.propio ? f : base, mis.get(id)) };
  }
  if (met === 'POST' && r0 === 'importar') return { activo: false };
  throw new Error('Ruta no disponible: ' + met + ' ' + r0);
}

window.Store = { iniciar, api, version, buscarActualizacion, actualizarCatalogo: p2 => cargarCatalogo(p2, true), espacio, exportar, importar };
})();
