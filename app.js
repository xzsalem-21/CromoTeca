/* Cromoteca — interfaz. Sin dependencias; todo corre en este dispositivo y en tu PC. */
'use strict';
const DBC = 'https://www.dragonball.center';
const VENDOR = new URL('vendor/', document.baseURI).href;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const vista = $('#vista');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const conf = {
  get refs() { try { return localStorage.getItem('refs') !== '0'; } catch { return true; } },
  set refs(v) { try { localStorage.setItem('refs', v ? '1' : '0'); } catch {} }
};
const api = (ruta, opc) => Store.api(ruta, opc);
let tAviso;
function aviso(t) { const a = $('#aviso'); a.textContent = t; a.hidden = false; clearTimeout(tAviso); tAviso = setTimeout(() => a.hidden = true, 3200); }
const cargando = (t = 'Cargando') => `<div class="cargando">${esc(t)}</div>`;
const pct = (a, b) => b ? Math.floor(a * 100 / b) : 0;
const refUrl = p => p ? DBC + p : '';
const imgRef = (p, cls = 'ref') => (conf.refs && p) ? `<img class="${cls}" loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${esc(refUrl(p))}" alt="" onerror="this.remove()">` : '';
const paisChapas = c => (c.paises || '').split(',').filter(Boolean).map(p => `<span class="chapa" title="${esc(c.paises_nombre)}">${esc(p)}</span>`).join(' ');

function tarjetaCol(c, attrs = `href="#/col/${c.id}"`, tag = 'a') {
  const p = pct(c.tengo, c.total);
  return `<${tag} class="col" ${attrs}>
    <span class="col-img">${imgRef(c.portada_ref, '') || esc((c.titulo || '?')[0])}</span>
    <span>
      <span class="col-t">${esc(c.titulo)}</span>
      <span class="col-m">${paisChapas(c)} ${c.licencia ? '' : '<span class="chapa chapa-pirata">sin licencia</span>'} ${c.propia ? '<span class="chapa chapa-oro">propia</span>' : ''} ${c.total && c.tengo >= c.total ? '<span class="chapa chapa-ok">completa</span>' : ''} ${esc(c.fabricante || '')}</span>
      <span class="col-dato"><b>${esc(c.anio || 's/f')}</b><b>${c.total ? c.total + ' cromos' : (c.items_importados ? 'sin lista' : '… cromos')}</b></span>
      ${c.total ? `<span class="barra-prog ${p === 100 ? 'llena' : ''}"><i style="width:${p}%"></i></span><span class="col-n"><span>${c.tengo} de ${c.total}</span><span>${p}%${c.repes ? ' · ' + c.repes + ' repes' : ''}</span></span>`
        : `<span class="col-n"><span>${esc(c.categoria || '')}</span></span>`}
    </span></${tag}>`;
}

/* ---------- INICIO ---------- */
let tImport, instalador = null;
const esInstalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const htmlInstalar = () => instalador && !esInstalada() ? `<div class="caja caja-aviso" style="margin-top:14px"><b>Instala la app en tu móvil</b><div class="sub">Se abre a pantalla completa y funciona sin conexión.</div><div style="margin-top:10px"><button class="btn" id="bInstalar">Instalar Cromoteca</button></div></div>` : '';
function ligarInstalar() { const b = $('#bInstalar'); if (b) b.onclick = async () => { try { instalador.prompt(); await instalador.userChoice; } catch {} instalador = null; const c = $('#cajaInstalar'); if (c) c.innerHTML = ''; }; }
addEventListener('beforeinstallprompt', e => { e.preventDefault(); instalador = e; const c = $('#cajaInstalar'); if (c) { c.innerHTML = htmlInstalar(); ligarInstalar(); } });
addEventListener('appinstalled', () => { instalador = null; const c = $('#cajaInstalar'); if (c) c.innerHTML = ''; aviso('¡Cromoteca instalada!'); });
async function vInicio() {
  vista.innerHTML = cargando();
  const [info, mias] = await Promise.all([api('info'), api('colecciones?mias=1&orden=uso&lim=6')]);
  const s = info.stats, im = info.importacion;
  const url = info.ips.map(ip => `http://${ip}:${info.puerto}`).join('  o  ');
  vista.innerHTML = `
    <section class="heroe">
      <h1>¿Lo tengo<br>o no lo tengo?</h1>
      <p>Elige la colección, fotografía el cromo por las dos caras y la Cromoteca te dice si ya está en tu álbum.</p>
      <a class="btn btn-gigante" href="#/escanear">Escanear cromo</a>
    </section>
    <div class="cifras">
      <div class="cifra"><b>${s.tengo}</b><span>Cromos que tengo</span></div>
      <div class="cifra"><b>${s.repes}</b><span>Repetidos</span></div>
      <div class="cifra"><b>${s.mias}</b><span>Colecciones empezadas</span></div>
      <div class="cifra"><b>${s.colecciones}</b><span>Colecciones en catálogo</span></div>
    </div>
    <div id="cajaImport"></div>
    <div id="cajaInstalar">${htmlInstalar()}</div>
    <h2>Mis colecciones</h2>
    ${mias.lista.length ? `<div class="lista-col">${mias.lista.map(c => tarjetaCol(c)).join('')}</div>${mias.total > 6 ? '<p><a href="#/mias">Ver todas</a></p>' : ''}`
      : `<div class="caja vacio">Aún no has guardado ningún cromo. Pulsa <b>Escanear cromo</b> o entra en el <a href="#/catalogo">catálogo</a> para marcar los que tienes.</div>`}
    ${url && location.hostname === 'localhost' ? `<h2>Úsala desde el móvil</h2><div class="caja">Con el móvil en la misma wifi, abre en el navegador: <b style="color:var(--oro);font-size:20px">${esc(url)}</b><div class="sub">Después puedes «Añadir a pantalla de inicio» para tenerla como app.</div></div>` : ''}
    ${pie()}`;
  pintarImport(im, s); ligarInstalar();
}
function pintarImport(im, s) {
  const c = $('#cajaImport'); if (!c) return;
  clearTimeout(tImport);
  if (im.activo) {
    const p = pct(im.hechas, im.total);
    c.innerHTML = `<div class="caja caja-aviso" style="margin-top:14px"><b>Cargando el catálogo de Dragon Ball Center…</b>
      <div class="sub">${im.fase === 'listado' ? 'Leyendo el listado de colecciones' : `Colecciones leídas: ${im.hechas} de ${im.total}`} · ${esc(im.ultimo || '')}</div>
      <div class="barra-prog" style="margin-top:8px"><i style="width:${p}%"></i></div>
      <div class="sub" style="margin-top:6px">Puedes usar la app mientras tanto. Va despacio a propósito para no saturar su web.</div></div>`;
    tImport = setTimeout(async () => { try { const i = await api('info'); pintarImport(i.importacion, i.stats); } catch {} }, 4000);
  } else if (s && s.colecciones === 0) {
    c.innerHTML = `<div class="caja caja-aviso" style="margin-top:14px"><b>El catálogo está vacío.</b> <span class="sub">${esc(im.ultimo || 'Hace falta conexión a internet para cargarlo la primera vez.')}</span>
      <div style="margin-top:10px"><button class="btn" id="bImp">Cargar catálogo</button></div></div>`;
    $('#bImp').onclick = async () => { const e = await api('importar', { body: {} }); pintarImport({ ...e, activo: true }, s); };
  } else c.innerHTML = '';
}
const pie = () => `<p class="pie">Datos del catálogo: <a href="${DBC}/catalogo" target="_blank" rel="noopener">Dragon Ball Center</a>, licencia CC BY-NC-SA 4.0. Las imágenes de referencia se cargan desde su web y pertenecen a sus fabricantes. App de uso personal, no oficial.</p>`;

/* ---------- CATÁLOGO ---------- */
const filtro = { q: '', pais: '', cat: '', fab: '', lic: '', orden: 'anio' };
let filtrosCache;
async function vCatalogo(soloMias) {
  vista.innerHTML = cargando();
  filtrosCache = filtrosCache || await api('filtros');
  const f = filtrosCache;
  const op = (l, sel, fn) => l.map(x => { const [v, t] = fn(x); return `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(t)}</option>`; }).join('');
  vista.innerHTML = `
    <h1 class="rotulo">${soloMias ? 'Mis colecciones' : 'Catálogo'}</h1>
    <div class="caja" style="margin-top:18px">
      <div class="fila"><div style="flex:2 1 240px"><label for="fq">Buscar</label><input id="fq" type="search" placeholder="Título, fabricante o año" value="${esc(filtro.q)}"></div>
      <div><label for="fp">País</label><select id="fp"><option value="">Todos</option>${op(f.paises, filtro.pais, x => [x.cod, `${x.nombre} (${x.n})`])}</select></div>
      <div><label for="fc">Tipo</label><select id="fc"><option value="">Todos</option>${op(f.categorias, filtro.cat, x => [x.nombre, `${x.nombre} (${x.n})`])}</select></div>
      <div><label for="fo">Ordenar por</label><select id="fo">${op([['anio', 'Año (antiguas primero) y nº de cromos'], ['anio_desc', 'Año (recientes primero) y nº de cromos'], ['cromos', 'Nº de cromos (menos primero)'], ['cromos_desc', 'Nº de cromos (más primero)'], ['titulo', 'Título (A-Z)']], filtro.orden, x => x)}</select></div>
      <div><label for="ff">Fabricante</label><select id="ff"><option value="">Todos</option>${op(f.fabricantes, filtro.fab, x => [x.nombre, `${x.nombre} (${x.n})`])}</select></div></div>
      <div class="chips" style="margin-bottom:0"><button class="chip ${filtro.lic ? 'activo' : ''}" id="fl">Solo sin licencia (piratas)</button>
      <button class="chip" id="fnueva">+ Crear colección propia</button></div>
    </div>
    <p class="sub" id="cuenta"></p><div class="lista-col" id="lista"></div><p style="text-align:center"><button class="btn btn-liso" id="mas" hidden>Cargar más</button></p>`;
  let des = 0;
  const cargar = async (reset) => {
    if (reset) { des = 0; $('#lista').innerHTML = ''; }
    const p = new URLSearchParams({ ...filtro, des, lim: 60 }); if (soloMias) p.set('mias', 1);
    const r = await api('colecciones?' + p);
    $('#lista').insertAdjacentHTML('beforeend', r.lista.map(c => tarjetaCol(c)).join(''));
    des += r.lista.length;
    $('#cuenta').textContent = r.total ? `${r.total} colecciones` : 'Ninguna colección coincide con esa búsqueda.';
    $('#mas').hidden = des >= r.total;
  };
  let t;
  $('#fq').oninput = e => { filtro.q = e.target.value; clearTimeout(t); t = setTimeout(() => cargar(true), 250); };
  $('#fp').onchange = e => { filtro.pais = e.target.value; cargar(true); };
  $('#fc').onchange = e => { filtro.cat = e.target.value; cargar(true); };
  $('#ff').onchange = e => { filtro.fab = e.target.value; cargar(true); };
  $('#fo').onchange = e => { filtro.orden = e.target.value; cargar(true); };
  $('#fl').onclick = e => { filtro.lic = filtro.lic ? '' : 'no'; e.target.classList.toggle('activo'); cargar(true); };
  $('#fnueva').onclick = () => hojaNuevaColeccion(id => location.hash = '#/col/' + id);
  $('#mas').onclick = () => cargar(false);
  cargar(true);
}

function hojaNuevaColeccion(alCrear, titulo = '') {
  abrirHoja(`<div class="hoja-cab"><h3>Nueva colección</h3><button class="cerrar" data-cerrar aria-label="Cerrar">×</button></div>
    <p class="sub">Para colecciones que no están en el catálogo. Se guarda solo en este móvil.</p>
    <label for="nt">Título</label><input id="nt" value="${esc(titulo)}" placeholder="Ej.: Dragon Ball Z Serie Oro">
    <div class="fila" style="margin-top:10px"><div><label for="nf">Fabricante</label><input id="nf"></div><div><label for="na">Año</label><input id="na" inputmode="numeric"></div>
    <div><label for="nn">Nº de cromos</label><input id="nn" inputmode="numeric" placeholder="Ej.: 240"></div></div>
    <p class="sub">Si indicas el número de cromos se crean los huecos del 1 al total. Si no, se irán creando al escanear.</p>
    <button class="btn btn-fuego" id="ncrear" style="width:100%">Crear colección</button>`);
  $('#ncrear').onclick = async () => {
    try { const r = await api('colecciones', { body: { titulo: $('#nt').value, fabricante: $('#nf').value, anio: $('#na').value, n_cromos: $('#nn').value } }); filtrosCache = null; cerrarHoja(); alCrear(r.id); }
    catch (e) { aviso(e.message); }
  };
}

/* ---------- COLECCIÓN (ÁLBUM) ---------- */
let colActual = null, verFiltro = 'todos';
async function vColeccion(id, refrescar) {
  vista.innerHTML = cargando('Abriendo el álbum');
  const d = await api(`colecciones/${id}${refrescar ? '?refrescar=1' : ''}`);
  colActual = d;
  const c = d.col, p = pct(c.tengo, c.total);
  vista.innerHTML = `
    <p class="sub"><a href="#/catalogo">← Catálogo</a></p>
    <div class="cab-col">
      <span class="col-img">${imgRef(c.portada_ref, '') || esc((c.titulo || '?')[0])}</span>
      <div><h1 class="rotulo">${esc(c.titulo)}</h1>
        <p class="sub" style="margin:14px 0 8px">${paisChapas(c)} ${c.licencia ? '' : '<span class="chapa chapa-pirata">sin licencia</span>'} ${esc([c.fabricante, c.paises_nombre, c.anio, c.categoria].filter(Boolean).join(' · '))}</p>
        <div class="fila" style="align-items:flex-end"><div style="flex:0 0 auto"><span class="pct" id="cPct">${p}%</span></div>
          <div style="flex:1 1 200px"><div class="sub" id="cCuenta">${c.tengo} de ${c.total} · faltan ${c.total - c.tengo}${c.repes ? ' · ' + c.repes + ' repes' : ''}</div><div class="barra-prog ${p === 100 ? 'llena' : ''}"><i id="cBarra" style="width:${p}%"></i></div></div></div>
      </div>
    </div>
    ${d.aviso ? `<div class="caja caja-aviso" style="margin-top:14px">${esc(d.aviso)} <button class="btn btn-liso" id="reint">Reintentar</button></div>` : ''}
    <div class="fila-btn" style="margin-top:16px">
      <a class="btn btn-fuego" href="#/escanear/${c.id}">Escanear aquí</a>
      <button class="btn" id="bListas">Faltas y repes</button>
      ${c.total && c.tengo < c.total ? '<button class="btn btn-cielo" id="bTodos">Los tengo todos</button>' : ''}
      ${c.dbc_id ? `<a class="btn btn-liso" target="_blank" rel="noopener" href="${DBC}/catalogo/coleccion/${c.dbc_id}/${esc(c.slug || '')}">Ficha en DBC ↗</a>` : ''}
    </div>
    ${c.descripcion ? `<details class="caja" style="margin-top:14px"><summary style="cursor:pointer;font-weight:700">Sobre esta colección</summary><p style="white-space:pre-line">${esc(c.descripcion)}</p></details>` : ''}
    <div class="chips" id="chips">${[['todos', 'Todos'], ['tengo', 'Tengo'], ['faltan', 'Me faltan'], ['repes', 'Repetidos']].map(([k, t]) => `<button class="chip ${verFiltro === k ? 'activo' : ''}" data-f="${k}">${t}</button>`).join('')}</div>
    <div id="album"></div>${pie()}`;
  if ($('#reint')) $('#reint').onclick = () => vColeccion(id, true);
  $('#chips').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; verFiltro = b.dataset.f; $$('#chips .chip').forEach(x => x.classList.toggle('activo', x === b)); pintarAlbum(); };
  $('#bListas').onclick = hojaListas;
  if ($('#bTodos')) $('#bTodos').onclick = () => {
    const faltan = c.total - c.tengo;
    abrirHoja(`<div class="hoja-cab"><h3>¿Los tienes todos?</h3><button class="cerrar" data-cerrar aria-label="Cerrar">×</button></div>
      <p>Se marcarán como tuyos los <b>${faltan}</b> cromos que faltan de <b>${esc(c.titulo)}</b>. Los que ya tenías, tus repetidos y tus fotos no se tocan.</p>
      <div class="fila-btn"><button class="btn btn-fuego" id="siTodos">Sí, los tengo todos</button><button class="btn btn-liso" data-cerrar>Cancelar</button></div>`);
    $('#siTodos').onclick = async () => {
      try { const r = await api(`colecciones/${id}/completa`, { body: {} }); cerrarHoja(); await vColeccion(id); aviso(`¡Colección completa! ${r.marcados} cromos marcados`); }
      catch (e) { aviso(e.message); }
    };
  };
  $('#album').onclick = e => { const b = e.target.closest('[data-id]'); if (b) hojaCromo(+b.dataset.id); };
  pintarAlbum();
}
function htmlCromo(k) {
  const img = k.thumb ? `<img loading="lazy" src="fotos/${esc(k.thumb)}" alt="">` : imgRef(k.ref_thumb);
  return `<button class="cromo ${k.cantidad > 0 ? 'tengo' : ''}" data-id="${k.id}" title="${esc(k.etiqueta)}">${img || esc(k.numero || '?')}
    <span class="num">${esc(k.tipo === 'extra' ? k.etiqueta : (k.numero || k.etiqueta))}</span>
    ${k.cantidad > 1 ? `<span class="marca-ok repe">×${k.cantidad}</span>` : k.cantidad === 1 ? '<span class="marca-ok">✓</span>' : ''}</button>`;
}
function pintarAlbum() {
  const d = colActual, ok = k => verFiltro === 'todos' || (verFiltro === 'tengo' && k.cantidad > 0) || (verFiltro === 'faltan' && k.cantidad === 0) || (verFiltro === 'repes' && k.cantidad > 1);
  const grupos = new Map();
  for (const k of d.cromos) { const g = k.tipo === 'extra' ? 'Extras (álbumes, sobres…)' : (k.seccion || 'Cromos'); if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push(k); }
  let h = '';
  for (const [g, l] of grupos) {
    const vis = l.filter(ok); if (!vis.length) continue;
    h += `<div class="seccion-t"><span>${esc(g)}</span><small>${l.filter(k => k.cantidad > 0).length} de ${l.length}</small></div><div class="album">${vis.map(htmlCromo).join('')}</div>`;
  }
  $('#album').innerHTML = h || `<div class="caja vacio">${d.cromos.length ? 'No hay cromos en este filtro.' : 'Esta colección aún no tiene cromos listados. Pulsa «Escanear aquí» para ir añadiéndolos.'}</div>`;
}
function recontar() {
  const cr = colActual.cromos.filter(k => k.tipo === 'cromo'), c = colActual.col;
  c.total = cr.length; c.tengo = cr.filter(k => k.cantidad > 0).length; c.repes = colActual.cromos.reduce((a, k) => a + Math.max(0, k.cantidad - 1), 0);
  const p = pct(c.tengo, c.total);
  if ($('#cPct')) { $('#cPct').textContent = p + '%'; $('#cBarra').style.width = p + '%'; $('#cCuenta').textContent = `${c.tengo} de ${c.total} · faltan ${c.total - c.tengo}${c.repes ? ' · ' + c.repes + ' repes' : ''}`; }
}

/* ---------- HOJAS (diálogos) ---------- */
function abrirHoja(html) { const h = $('#hoja'); h.innerHTML = `<div class="hoja-c" role="dialog" aria-modal="true">${html}</div>`; h.hidden = false; document.body.style.overflow = 'hidden'; }
function cerrarHoja() { $('#hoja').hidden = true; $('#hoja').innerHTML = ''; document.body.style.overflow = ''; }
$('#hoja').addEventListener('click', e => { if (e.target.id === 'hoja' || e.target.closest('[data-cerrar]')) cerrarHoja(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#hoja').hidden) cerrarHoja(); });

const ESTADOS = ['', 'Perfecto', 'Muy bueno', 'Bueno', 'Regular', 'Malo'];
function hojaCromo(id) {
  const k = colActual.cromos.find(x => x.id === id); if (!k) return;
  const foto = (rel, ref, txt) => rel ? `<a href="fotos/${esc(rel)}" target="_blank"><img src="fotos/${esc(rel)}" alt="${txt}"></a>` : (conf.refs && ref ? `<img referrerpolicy="no-referrer" src="${esc(refUrl(ref))}" alt="Imagen de referencia" style="filter:grayscale(1) brightness(.6)">` : `<div class="hueco">Sin foto</div>`);
  abrirHoja(`<div class="hoja-cab"><div><h3>${esc(k.etiqueta)}</h3><div class="sub">${esc(colActual.col.titulo)}${k.seccion ? ' · ' + esc(k.seccion) : ''}${k.etiquetas ? ' · ' + esc(k.etiquetas) : ''}</div></div><button class="cerrar" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="fotos2"><figure>${foto(k.foto_anverso, k.ref_img || k.ref_thumb, 'Anverso')}<figcaption>${k.foto_anverso ? 'Tu anverso' : (conf.refs && k.ref_thumb ? 'Referencia (Dragon Ball Center)' : 'Anverso')}</figcaption></figure>
      <figure>${foto(k.foto_reverso, '', 'Reverso')}<figcaption>${k.foto_reverso ? 'Tu reverso' : 'Reverso'}</figcaption></figure></div>
    <div class="fila" style="margin-bottom:12px"><div><label>Copias que tengo</label><div class="contador"><button id="kMenos" aria-label="Una menos">−</button><b id="kCant">${k.cantidad}</b><button id="kMas" aria-label="Una más">+</button></div></div>
      <div><label for="kEst">Conservación</label><select id="kEst">${ESTADOS.map(e => `<option ${e === k.estado ? 'selected' : ''} value="${e}">${e || 'Sin indicar'}</option>`).join('')}</select></div></div>
    <label for="kNot">Notas</label><textarea id="kNot" rows="2" placeholder="Variante, brillo, a quién se lo cambié…">${esc(k.notas)}</textarea>
    <div class="fila-btn" style="margin-top:14px"><a class="btn btn-fuego" href="#/escanear/${k.coleccion_id}/${k.id}" data-cerrar>${k.foto_anverso ? 'Repetir fotos' : 'Fotografiarlo'}</a>
      ${k.dbc_id ? `<a class="btn btn-liso" target="_blank" rel="noopener" href="${DBC}/catalogo/objeto/${k.dbc_id}/c">Ficha en DBC ↗</a>` : ''}
      ${k.foto_anverso ? '<button class="btn btn-liso" id="kQuitar">Quitar mis fotos</button>' : ''}</div>`);
  const guardar = async (cambios) => {
    try { const r = await api('cromos/' + id, { method: 'PATCH', body: cambios }); Object.assign(k, r.cromo); $('#kCant').textContent = k.cantidad; const b = $(`#album [data-id="${id}"]`); if (b) b.outerHTML = htmlCromo(k); recontar(); }
    catch (e) { aviso(e.message); }
  };
  $('#kMas').onclick = () => guardar({ cantidad: k.cantidad + 1 });
  $('#kMenos').onclick = () => guardar({ cantidad: Math.max(0, k.cantidad - 1) });
  $('#kEst').onchange = e => guardar({ estado: e.target.value });
  $('#kNot').onchange = e => guardar({ notas: e.target.value });
  if ($('#kQuitar')) $('#kQuitar').onclick = async () => { await guardar({ quitar_fotos: true }); cerrarHoja(); aviso('Fotos quitadas'); };
}
function hojaListas() {
  const cr = colActual.cromos.filter(k => k.tipo === 'cromo');
  const faltas = cr.filter(k => k.cantidad === 0).map(k => k.numero || k.etiqueta);
  const repes = cr.filter(k => k.cantidad > 1).map(k => (k.numero || k.etiqueta) + (k.cantidad > 2 ? ` (x${k.cantidad - 1})` : ''));
  const t = `${colActual.col.titulo}${colActual.col.fabricante ? ' (' + colActual.col.fabricante + (colActual.col.anio ? ', ' + colActual.col.anio : '') + ')' : ''}\n\nME FALTAN (${faltas.length}):\n${faltas.join(', ') || '¡Ninguno, colección completa!'}\n\nREPETIDOS (${repes.length}):\n${repes.join(', ') || 'Ninguno'}`;
  abrirHoja(`<div class="hoja-cab"><h3>Faltas y repes</h3><button class="cerrar" data-cerrar aria-label="Cerrar">×</button></div>
    <pre class="txt" id="lTxt">${esc(t)}</pre><div class="fila-btn"><button class="btn" id="lCop">Copiar</button>${navigator.share ? '<button class="btn btn-cielo" id="lCom">Compartir</button>' : ''}</div>`);
  $('#lCop').onclick = async () => { try { await navigator.clipboard.writeText(t); aviso('Lista copiada'); } catch { const r = document.createRange(); r.selectNodeContents($('#lTxt')); getSelection().removeAllRanges(); getSelection().addRange(r); aviso('Selecciónalo y copia'); } };
  if ($('#lCom')) $('#lCom').onclick = () => navigator.share({ text: t }).catch(() => {});
}

/* ---------- IMÁGENES: lectura, recorte, giro, huella ---------- */
async function leerImagen(file) {
  let fuente;
  try { fuente = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    fuente = await new Promise((ok, mal) => { const i = new Image(), u = URL.createObjectURL(file); i.onload = () => ok(i); i.onerror = () => { URL.revokeObjectURL(u); mal(); }; i.src = u; })
      .catch(() => { throw new Error(`Este navegador no sabe abrir «${file.name}». Formatos seguros: JPG, PNG, WEBP, GIF, BMP y AVIF (y HEIC desde iPhone).`); });
  }
  const w = fuente.width || fuente.naturalWidth, h = fuente.height || fuente.naturalHeight;
  const e = Math.min(1, 1800 / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * e); c.height = Math.round(h * e);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(fuente, 0, 0, c.width, c.height);
  return c;
}
function girar(c) { const r = document.createElement('canvas'); r.width = c.height; r.height = c.width; const x = r.getContext('2d'); x.translate(r.width, 0); x.rotate(Math.PI / 2); x.drawImage(c, 0, 0); return r; }
function escalar(c, max) { const e = Math.min(1, max / Math.max(c.width, c.height)); const r = document.createElement('canvas'); r.width = Math.max(1, Math.round(c.width * e)); r.height = Math.max(1, Math.round(c.height * e)); r.getContext('2d').drawImage(c, 0, 0, r.width, r.height); return r; }
// Recorta el fondo liso alrededor del cromo (mesa, tapa del escáner). Si el fondo no es uniforme, no toca nada.
function autoRecorte(c) {
  const m = escalar(c, 220), W = m.width, H = m.height, d = m.getContext('2d').getImageData(0, 0, W, H).data;
  const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const borde = [];
  for (let x = 0; x < W; x++) { borde.push(px(x, 0), px(x, H - 1)); }
  for (let y = 0; y < H; y++) { borde.push(px(0, y), px(W - 1, y)); }
  const med = ch => borde.map(p => p[ch]).sort((a, b) => a - b)[borde.length >> 1];
  const f = [med(0), med(1), med(2)], UMB = 42;
  const dif = p => Math.max(Math.abs(p[0] - f[0]), Math.abs(p[1] - f[1]), Math.abs(p[2] - f[2])) > UMB;
  if (borde.filter(p => !dif(p)).length / borde.length < 0.7) return c;
  const filas = new Array(H).fill(0), cols = new Array(W).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dif(px(x, y))) { filas[y]++; cols[x]++; }
  const primero = (a, n) => a.findIndex(v => v > n * 0.12), ultimo = (a, n) => a.length - 1 - [...a].reverse().findIndex(v => v > n * 0.12);
  const y0 = primero(filas, W), y1 = ultimo(filas, W), x0 = primero(cols, H), x1 = ultimo(cols, H);
  if (y0 < 0 || x0 < 0) return c;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  if (bw < W * 0.3 || bh < H * 0.3 || bw * bh > W * H * 0.95) return c;
  const k = c.width / W, mg = 1.5;
  const sx = Math.max(0, (x0 - mg) * k), sy = Math.max(0, (y0 - mg) * k), sw = Math.min(c.width - sx, (bw + mg * 2) * k), sh = Math.min(c.height - sy, (bh + mg * 2) * k);
  const r = document.createElement('canvas'); r.width = Math.round(sw); r.height = Math.round(sh);
  r.getContext('2d').drawImage(c, sx, sy, sw, sh, 0, 0, r.width, r.height); return r;
}
// Huella visual (dHash de 256 bits): sirve para encontrar cromos casi idénticos entre tus fotos
function huella(c) {
  const m = document.createElement('canvas'); m.width = 17; m.height = 16;
  const x = m.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, 17, 16);
  const d = x.getImageData(0, 0, 17, 16).data, g = (i) => d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114;
  let hex = '', nib = 0, n = 0;
  for (let y = 0; y < 16; y++) for (let k = 0; k < 16; k++) { nib = (nib << 1) | (g(y * 17 + k) > g(y * 17 + k + 1) ? 1 : 0); if (++n === 4) { hex += nib.toString(16); nib = 0; n = 0; } }
  return hex;
}

/* ---------- OCR (lectura del número), todo en local ---------- */
let ocrW = null, ocrDisponible = null;
function cargarScript(src) { return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); }); }
async function leerTexto(canvas) {
  if (!window.Tesseract) await cargarScript(VENDOR + 'tesseract.min.js');
  if (!ocrW) { ocrW = await Tesseract.createWorker('eng', 1, { workerPath: VENDOR + 'worker.min.js', corePath: VENDOR.slice(0, -1), langPath: VENDOR + 'lang', gzip: true }); await ocrW.setParameters({ tessedit_pageseg_mode: '11' }); }
  const { data } = await ocrW.recognize(escalar(canvas, 1400));
  return (data.words || []).map(w => ({ t: w.text, conf: w.confidence, alto: w.bbox.y1 - w.bbox.y0 }));
}
const norm = s => String(s || '').toLowerCase().trim().replace(/^(n[ºo°.]{0,2}|#)\s*/, '').replace(/[\s.]/g, '').replace(/^0+(?=\d)/, '');
function candidatos(palabras, validos, peso) {
  const out = new Map();
  for (const p of palabras) {
    if (p.conf < 35) continue;
    for (const tr of p.t.split(/[^\wºª#-]+/)) {
      const m = /^(?:n[ºo°]?|#)?([a-z]{0,2}-?\d{1,4}[a-z]?)$/i.exec(tr); if (!m) continue;
      const k = norm(m[1]); if (!k || (validos.size && !validos.has(k))) continue;
      out.set(k, Math.max(out.get(k) || 0, p.alto * p.conf * peso));
    }
  }
  return out;
}

/* ---------- ESCANEAR ---------- */
const scan = { col: null, cromos: [], objetivo: null, a: null, r: null };
async function vElegirColeccion() {
  vista.innerHTML = `<h1 class="rotulo">Escanear</h1><div class="pasos"><i class="ahora"></i><i></i><i></i></div>
    <h2 style="margin-top:8px">¿De qué colección es?</h2>
    <input id="eq" type="search" placeholder="Escribe el título, fabricante o año…" autocomplete="off">
    <p class="sub" id="eTit" style="margin:14px 0 8px"></p><div class="lista-col" id="eLista"></div>
    <p style="margin-top:16px"><button class="btn btn-liso" id="eNueva">+ No está en el catálogo: crear colección</button></p>`;
  const cargar = async () => {
    const q = $('#eq').value.trim();
    const r = await api('colecciones?' + new URLSearchParams(q ? { q, lim: 40 } : { orden: 'uso', lim: 12 }));
    $('#eTit').textContent = q ? `${r.total} resultados` : 'Últimas que has usado o las primeras del catálogo:';
    $('#eLista').innerHTML = r.lista.map(c => tarjetaCol(c, `href="#/escanear/${c.id}"`)).join('') || '<div class="caja vacio">No encuentro esa colección. Puedes crearla abajo.</div>';
  };
  let t; $('#eq').oninput = () => { clearTimeout(t); t = setTimeout(cargar, 250); };
  $('#eNueva').onclick = () => hojaNuevaColeccion(id => location.hash = '#/escanear/' + id, $('#eq').value.trim());
  cargar();
}
async function vCapturar(colId, cromoId) {
  vista.innerHTML = cargando('Preparando la colección');
  const d = await api('colecciones/' + colId);
  api(`colecciones/${colId}/uso`, { body: {} }).catch(() => {});
  Object.assign(scan, { col: d.col, cromos: d.cromos, objetivo: cromoId ? d.cromos.find(k => k.id === cromoId) : null, a: null, r: null });
  pintarCaptura(d.aviso);
}
function pintarCaptura(avisoTxt) {
  const cara = (k, nombre, nota) => `<div class="cara"><h3>${nombre}</h3>
    <div class="cara-vista ${scan[k] ? 'llena' : ''}" id="v_${k}">${scan[k] ? '' : nota}</div>
    <div class="fila-btn"><label class="btn btn-liso" tabindex="0">📷 Foto<input type="file" accept="image/*" capture="environment" data-cara="${k}" hidden></label>
      <label class="btn btn-liso" tabindex="0">📁 Subir<input type="file" accept="image/*,.heic,.heif,.avif,.bmp,.tif,.tiff" multiple data-cara="${k}" hidden></label></div>
    ${scan[k] ? `<div class="fila-btn" style="margin-top:8px"><button class="btn btn-liso" data-girar="${k}">⟳ Girar</button><button class="btn btn-liso" data-recorte="${k}">${scan[k].recortar ? 'Sin recortar' : 'Recortar fondo'}</button></div>` : ''}</div>`;
  vista.innerHTML = `<p class="sub"><a href="#/escanear">← Cambiar de colección</a></p>
    <h1 class="rotulo" style="font-size:clamp(26px,6vw,40px)">${esc(scan.col.titulo)}</h1>
    <p class="sub" style="margin-top:12px">${esc([scan.col.fabricante, scan.col.paises_nombre, scan.col.anio].filter(Boolean).join(' · '))}${scan.objetivo ? ` · <b style="color:var(--oro)">Fotos para: ${esc(scan.objetivo.etiqueta)}</b>` : ''}</p>
    <div class="pasos"><i class="hecho"></i><i class="ahora"></i><i></i></div>
    ${avisoTxt ? `<div class="caja caja-aviso" style="margin-bottom:12px">${esc(avisoTxt)}</div>` : ''}
    <div class="caras">${cara('a', 'Anverso', 'La cara del dibujo.<br>Obligatoria.')}${cara('r', 'Reverso', 'La cara del número.<br>Opcional, pero ayuda a leerlo.')}</div>
    <p class="sub" style="margin:10px 0">Consejo: pon el cromo sobre un fondo liso y oscuro, con buena luz y sin brillos. Así el recorte y la lectura del número aciertan más.</p>
    <button class="btn btn-fuego btn-gigante" id="sigue" ${scan.a ? '' : 'disabled'}>${scan.objetivo ? 'Guardar fotos' : 'Identificar cromo'}</button>`;
  for (const k of ['a', 'r']) if (scan[k]) { const i = new Image(); i.src = scan[k].cv.toDataURL('image/jpeg', .8); i.alt = k === 'a' ? 'Anverso' : 'Reverso'; $('#v_' + k).appendChild(i); }
  $$('input[type=file]', vista).forEach(inp => inp.onchange = async () => {
    const fs = [...inp.files]; if (!fs.length) return;
    try {
      let k = inp.dataset.cara;
      for (const f of fs.slice(0, 2)) { const orig = await leerImagen(f); scan[k] = { orig, recortar: true, cv: autoRecorte(orig) }; k = k === 'a' ? 'r' : 'a'; if (fs.length === 1) break; }
      pintarCaptura();
    } catch (e) { aviso(e.message); }
  });
  vista.onclick = e => {
    const g = e.target.closest('[data-girar]'), rc = e.target.closest('[data-recorte]');
    if (g) { const s = scan[g.dataset.girar]; s.orig = girar(s.orig); s.cv = s.recortar ? autoRecorte(s.orig) : s.orig; pintarCaptura(); }
    if (rc) { const s = scan[rc.dataset.recorte]; s.recortar = !s.recortar; s.cv = s.recortar ? autoRecorte(s.orig) : s.orig; pintarCaptura(); }
  };
  $('#sigue').onclick = () => { vista.onclick = null; scan.objetivo ? guardar(scan.objetivo, false) : vIdentificar(); };
}
async function vIdentificar() {
  scan.hash = huella(scan.a.cv);
  vista.innerHTML = `<p class="sub"><a href="#/escanear/${scan.col.id}" id="volver">← Repetir fotos</a></p>
    <h1 class="rotulo" style="font-size:clamp(26px,6vw,40px)">¿Qué número es?</h1>
    <div class="pasos" style="margin-top:14px"><i class="hecho"></i><i class="hecho"></i><i class="ahora"></i></div>
    <div class="fila" style="align-items:flex-start"><div style="flex:0 0 120px"><img src="${scan.a.cv.toDataURL('image/jpeg', .7)}" alt="Tu cromo" style="border-radius:10px;border:3px solid var(--oro);width:120px"></div>
    <div style="flex:1 1 220px"><div id="lectura" class="sub">Leyendo el número del cromo…</div><div class="chips" id="sug"></div>
      <label for="num">Número o letra del cromo</label><div class="fila"><input id="num" inputmode="text" autocomplete="off" placeholder="Ej.: 127" style="font-size:22px;font-weight:800"><button class="btn" id="comprobar" style="flex:0 0 auto">Comprobar</button></div></div></div>
    <div id="veredicto"></div>`;
  $('#volver').onclick = e => { e.preventDefault(); pintarCaptura(); };
  const ir = () => decidir($('#num').value);
  $('#comprobar').onclick = ir; $('#num').onkeydown = e => { if (e.key === 'Enter') ir(); };
  $('#sug').onclick = e => { const b = e.target.closest('[data-n]'); if (b) { $('#num').value = b.dataset.n; ir(); } };
  // 1) ¿Se parece a una foto que ya tengo?
  api('parecidos', { body: { coleccion_id: scan.col.id, hash: scan.hash } }).then(r => {
    const p = r.lista[0]; if (!p || p.dist > 48 || !$('#sug')) return;
    $('#sug').insertAdjacentHTML('afterbegin', `<button class="chip chip-num" data-n="${esc(p.numero || p.etiqueta)}" title="Parecido visual con una foto tuya">≈ ${esc(p.numero || p.etiqueta)}</button>`);
    $('#lectura').insertAdjacentHTML('beforeend', ` <b style="color:var(--oro)">Se parece mucho a tu ${esc(p.etiqueta)}.</b>`);
  }).catch(() => {});
  // 2) Leer el número impreso
  try {
    if (ocrDisponible === null) ocrDisponible = (await api('info')).ocr;
    if (!ocrDisponible) throw new Error('sin OCR');
    const validos = new Set(scan.cromos.filter(k => k.tipo === 'cromo').map(k => norm(k.numero)));
    const total = new Map();
    for (const [cv, peso] of [[scan.r && scan.r.cv, 1.6], [scan.a.cv, 1]]) { if (!cv) continue; for (const [k, v] of candidatos(await leerTexto(cv), validos, peso)) total.set(k, Math.max(total.get(k) || 0, v)); }
    if (!$('#sug')) return;
    const orden = [...total].sort((x, y) => y[1] - x[1]).slice(0, 6);
    $('#lectura').firstChild.textContent = orden.length ? 'He leído estos números. Toca el correcto o escríbelo:' : 'No he podido leer el número. Escríbelo tú:';
    $('#sug').insertAdjacentHTML('beforeend', orden.map(([k]) => `<button class="chip chip-num" data-n="${esc(k)}">${esc(k.toUpperCase())}</button>`).join(''));
  } catch { if ($('#lectura')) $('#lectura').firstChild.textContent = 'Escribe el número del cromo:'; }
  $('#num').focus();
}
function decidir(texto) {
  const n = norm(texto), v = $('#veredicto');
  if (!n) return aviso('Escribe el número del cromo');
  const hay = scan.cromos.filter(k => k.tipo === 'cromo' && (norm(k.numero) === n || norm(k.etiqueta) === n));
  if (hay.length > 1) {
    v.innerHTML = `<div class="veredicto v-duda"><h2>¿Cuál de ellos?</h2><p>Hay ${hay.length} cromos con ese número en esta colección.</p><div class="fila-btn">${hay.map(k => `<button class="btn" data-k="${k.id}">${esc(k.etiqueta)}${k.seccion ? ' · ' + esc(k.seccion) : ''}</button>`).join('')}</div></div>`;
    v.onclick = e => { const b = e.target.closest('[data-k]'); if (b) veredicto(hay.find(k => k.id === +b.dataset.k)); };
  } else if (hay.length === 1) veredicto(hay[0]);
  else {
    v.innerHTML = `<div class="veredicto v-duda"><h2>No está en la lista</h2><p>El «${esc(texto.trim())}» no figura en el catálogo de esta colección. Revisa el número o añádelo como cromo nuevo.</p>
      <div class="fila-btn"><button class="btn btn-fuego" id="crear">Añadirlo y guardar</button></div></div>`;
    v.onclick = null;
    $('#crear').onclick = async () => {
      try { const r = await api(`colecciones/${scan.col.id}/cromos`, { body: { numero: texto.trim() } }); const k = { id: r.id, etiqueta: 'Cromo ' + texto.trim(), numero: texto.trim(), cantidad: 0, tipo: 'cromo' }; scan.cromos.push(k); guardar(k, false); }
      catch (e) { aviso(e.message); }
    };
  }
  v.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function veredicto(k) {
  const v = $('#veredicto'); v.onclick = null;
  if (k.cantidad > 0) {
    v.innerHTML = `<div class="veredicto v-tengo"><h2>¡Ya lo tienes!</h2>${k.thumb ? `<img class="mini" src="fotos/${esc(k.thumb)}" alt="Tu foto guardada">` : ''}
      <p>${esc(k.etiqueta)} ya está en tu álbum (${k.cantidad} ${k.cantidad === 1 ? 'copia' : 'copias'}).</p>
      <div class="fila-btn"><button class="btn btn-cielo" id="vRepe">Guardar como repetido (+1)</button>${k.thumb ? '<button class="btn" id="vSust">Cambiar las fotos</button>' : '<button class="btn" id="vSust">Guardar estas fotos</button>'}<a class="btn btn-liso" href="#/escanear/${scan.col.id}" id="vOtro">Escanear otro</a></div></div>`;
    $('#vRepe').onclick = () => guardar(k, true, !k.thumb);
    $('#vSust').onclick = () => guardar(k, false);
    $('#vOtro').onclick = e => { e.preventDefault(); vCapturar(scan.col.id); };
  } else {
    v.innerHTML = `<div class="veredicto v-nuevo"><h2>¡Nuevo!</h2><p>${esc(k.etiqueta)} no estaba en tu álbum.</p><div class="fila-btn"><button class="btn btn-fuego btn-gigante" id="vGuardar" style="max-width:420px">Guardarlo en el álbum</button></div></div>`;
    $('#vGuardar').onclick = () => guardar(k, false);
  }
}
async function guardar(k, sumar, conFotos = true) {
  try {
    vista.insertAdjacentHTML('beforeend', '<div class="cargando" id="guardando">Guardando</div>');
    const cuerpo = { sumar };
    if (conFotos || !sumar) {
      cuerpo.anverso = escalar(scan.a.cv, 1200).toDataURL('image/jpeg', .82);
      cuerpo.thumb = escalar(scan.a.cv, 360).toDataURL('image/jpeg', .82);
      cuerpo.hash = scan.hash || huella(scan.a.cv);
      if (scan.r) cuerpo.reverso = escalar(scan.r.cv, 1200).toDataURL('image/jpeg', .82);
    }
    const r = await api(`cromos/${k.id}/fotos`, { body: cuerpo });
    const total = scan.cromos.filter(x => x.tipo === 'cromo').length, tengo = scan.cromos.filter(x => x.tipo === 'cromo' && (x.id === k.id || x.cantidad > 0)).length;
    vista.innerHTML = `<div class="veredicto v-nuevo" style="margin-top:20px"><h2>¡Guardado!</h2><img class="mini" src="fotos/${esc(r.cromo.thumb)}" alt="">
      <p>${esc(r.cromo.etiqueta)} · ${esc(scan.col.titulo)}<br>${r.cromo.cantidad > 1 ? `Ahora tienes ${r.cromo.cantidad} copias.` : `Llevas ${tengo} de ${total} (${pct(tengo, total)}%).`}</p>
      <div class="fila-btn"><button class="btn btn-fuego" id="otro">Escanear otro</button><a class="btn" href="#/col/${scan.col.id}">Ver el álbum</a></div></div>`;
    $('#otro').onclick = () => vCapturar(scan.col.id);
  } catch (e) { const g = $('#guardando'); if (g) g.remove(); aviso('No se pudo guardar: ' + e.message); }
}

/* ---------- AJUSTES ---------- */
function descargar(blob, nombre) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000); }
async function vAjustes() {
  vista.innerHTML = cargando();
  const [info, esp, ver] = await Promise.all([api('info'), Store.espacio(), Store.version()]);
  const s = info.stats, mb = n => n >= 1e8 ? Math.round(n / 1048576) : (n / 1048576).toFixed(1);
  vista.innerHTML = `<h1 class="rotulo">Ajustes</h1>
    <h2>Catálogo</h2>
    <div class="caja"><p style="margin-top:0"><b>${s.colecciones}</b> colecciones y <b>${s.cromos}</b> cromos guardados en este móvil${ver.fecha ? ` (versión del ${esc(ver.fecha.slice(0, 10))})` : ''}. Funcionan sin conexión.</p>
      <div class="fila-btn"><button class="btn" id="bAct">Buscar catálogo nuevo</button></div><p class="sub" id="actInfo"></p></div>
    <h2>Imágenes de referencia</h2>
    <div class="caja"><label style="display:flex;gap:10px;align-items:center;text-transform:none;font-size:15px;color:var(--txt);letter-spacing:0"><input type="checkbox" id="refs" style="width:24px;min-height:24px" ${conf.refs ? 'checked' : ''}> Mostrar en gris la imagen de Dragon Ball Center en los huecos que me faltan</label>
      <p class="sub" style="margin-bottom:0">Se cargan desde su web cuando las miras (necesita internet) y no ocupan espacio en tu móvil. Tus fotos sí se guardan en el móvil.</p></div>
    <h2>Espacio y seguridad de tus datos</h2>
    <div class="caja">Tus datos y fotos ocupan <b>${mb(esp.usado)} MB</b>${esp.cuota ? ` de unos ${mb(esp.cuota)} MB disponibles` : ''}.
      <p style="margin-bottom:0">${esp.persistente ? 'El móvil los protege contra borrados automáticos.' : '<b>Atención:</b> el navegador podría borrarlos si se queda sin espacio, o si borras los datos del navegador. Instala la app y haz copias de seguridad.'}</p></div>
    <h2>Copia de seguridad</h2>
    <div class="caja"><p style="margin-top:0">Guarda tu colección en un archivo para no perderla si cambias de móvil o borras los datos del navegador.</p>
      <div class="fila-btn"><button class="btn" id="bCopia">Copia sin fotos</button><button class="btn btn-liso" id="bCopiaF">Copia con fotos</button>
      <label class="btn btn-liso" tabindex="0">Restaurar copia<input type="file" id="fRest" accept=".json,application/json" hidden></label></div>
      <p class="sub" id="copiaInfo" style="margin-bottom:0">La copia con fotos puede ser grande y tardar.</p></div>
    <h2>Lectura del número</h2>
    <div class="caja">El lector de texto funciona dentro del móvil, sin enviar nada a internet.</div>
    ${pie()}`;
  $('#refs').onchange = e => { conf.refs = e.target.checked; aviso(e.target.checked ? 'Referencias activadas' : 'Referencias ocultas'); };
  $('#bAct').onclick = async () => {
    const out = $('#actInfo'), b = $('#bAct'); b.disabled = true; out.textContent = 'Buscando…';
    try {
      const r = await Store.buscarActualizacion();
      if (!r.hay) { out.textContent = 'Ya tienes el catálogo más reciente.'; b.disabled = false; return; }
      await Store.actualizarCatalogo((t, f) => { out.textContent = `${t} ${Math.round(f * 100)}%`; });
      aviso('Catálogo actualizado'); vAjustes();
    } catch (e) { out.textContent = 'No se pudo: ' + e.message; b.disabled = false; }
  };
  const copia = async (fotos) => {
    const out = $('#copiaInfo'); out.textContent = 'Preparando la copia…';
    try { const blob = await Store.exportar(fotos); descargar(blob, `cromoteca-copia${fotos ? '-con-fotos' : ''}-${new Date().toISOString().slice(0, 10)}.json`); out.textContent = `Copia lista (${(blob.size / 1048576).toFixed(1)} MB). Búscala en Descargas.`; }
    catch (e) { out.textContent = 'No se pudo: ' + e.message; }
  };
  $('#bCopia').onclick = () => copia(false); $('#bCopiaF').onclick = () => copia(true);
  $('#fRest').onchange = async e => {
    const f = e.target.files[0]; if (!f) return; const out = $('#copiaInfo'); out.textContent = 'Restaurando…';
    try { const r = await Store.importar(await f.text()); out.textContent = `Restaurado: ${r.cromos} cromos${r.fotos ? ' y ' + r.fotos + ' fotos' : ''}.`; aviso('Copia restaurada'); }
    catch (err) { out.textContent = 'No se pudo: ' + err.message; }
  };
}

/* ---------- RUTAS ---------- */
async function ruta() {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  cerrarHoja(); vista.onclick = null; clearTimeout(tImport);
  const nav = { '': 'inicio', catalogo: 'catalogo', col: 'catalogo', mias: 'mias', escanear: 'escanear', ajustes: 'ajustes' }[p[0]] || 'inicio';
  $$('[data-nav]').forEach(a => a.classList.toggle('activo', a.dataset.nav === nav));
  try {
    if (p[0] === 'catalogo') await vCatalogo(false);
    else if (p[0] === 'mias') await vCatalogo(true);
    else if (p[0] === 'col' && p[1]) await vColeccion(+p[1]);
    else if (p[0] === 'escanear' && p[1]) await vCapturar(+p[1], +p[2] || 0);
    else if (p[0] === 'escanear') await vElegirColeccion();
    else if (p[0] === 'ajustes') await vAjustes();
    else await vInicio();
  } catch (e) {
    vista.innerHTML = `<div class="caja caja-aviso"><b>Algo ha fallado.</b><p>${esc(e.message)}</p><p class="sub">Comprueba que la ventana del servidor sigue abierta en el PC.</p><button class="btn" onclick="location.reload()">Reintentar</button></div>`;
  }
  scrollTo(0, 0);
}
addEventListener('hashchange', ruta);
(async function arranque() {
  vista.innerHTML = `<div class="cargando" id="bootMsg">Abriendo la Cromoteca</div><div class="barra-prog" style="max-width:420px;margin:0 auto"><i id="bootBarra" style="width:3%"></i></div><p class="sub" style="text-align:center;margin-top:14px" id="bootSub"></p>`;
  try {
    const r = await Store.iniciar((t, f) => { $('#bootMsg').textContent = t; $('#bootBarra').style.width = Math.round(f * 100) + '%'; $('#bootSub').textContent = 'Solo la primera vez. Después funciona sin conexión.'; });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    await ruta();
    if (!r.primera && navigator.onLine) Store.buscarActualizacion().then(x => { if (x.hay) aviso('Hay un catálogo nuevo: actívalo en Ajustes'); }).catch(() => {});
  } catch (e) {
    vista.innerHTML = `<div class="caja caja-aviso"><b>No se pudo abrir la app.</b><p>${esc(e.message)}</p><button class="btn" onclick="location.reload()">Reintentar</button></div>`;
  }
})();
