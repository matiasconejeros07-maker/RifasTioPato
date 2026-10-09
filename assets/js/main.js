(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  /* ---------------- Configuración ---------------- */
  // Fecha del sorteo (la misma que usa la cuenta regresiva de patoganso.cl).
  var DRAW_DATE = new Date(1794165300 * 1000);
  // Si tienes una pasarela de pago, pon aquí su URL (ej. 'https://patoganso.cl/checkout/').
  // Vacío = "Finalizar compra" lleva al formulario de contacto con el pedido ya escrito.
  var CHECKOUT_URL = '';
  // Si tienes un endpoint para el formulario (Formspree, etc.), ponlo aquí.
  var FORM_ENDPOINT = '';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return '$' + Math.round(n).toLocaleString('es-CL'); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ---------------- Cuenta regresiva ---------------- */
  var cd = {
    d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]')
  };
  function tick() {
    var left = Math.max(0, DRAW_DATE - Date.now());
    var secs = Math.floor(left / 1000);
    cd.d.textContent = pad(Math.floor(secs / 86400));
    cd.h.textContent = pad(Math.floor(secs % 86400 / 3600));
    cd.m.textContent = pad(Math.floor(secs % 3600 / 60));
    cd.s.textContent = pad(secs % 60);
  }
  tick();
  setInterval(tick, 1000);

  /* ---------------- Reveal al hacer scroll ---------------- */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------- Drawers (menú y carrito) ---------------- */
  var overlay = $('.overlay');
  var openDrawer = null;
  var lastTrigger = null;

  function open(name, trigger) {
    var d = $('#drawer-' + name);
    if (!d) return;
    if (openDrawer) close(true);
    lastTrigger = trigger || null;
    openDrawer = d;
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('is-open'); d.classList.add('is-open'); });
    d.setAttribute('aria-hidden', 'false');
    $$('[data-open="' + name + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    document.body.classList.add('lock');
    setTimeout(function () { d.focus(); }, 50);
  }
  function close(silent) {
    if (!openDrawer) return;
    var d = openDrawer;
    openDrawer = null;
    d.classList.remove('is-open');
    overlay.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true');
    $$('[data-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    document.body.classList.remove('lock');
    setTimeout(function () { if (!openDrawer) overlay.hidden = true; }, 300);
    if (!silent && lastTrigger) lastTrigger.focus();
  }
  $$('[data-open]').forEach(function (b) {
    b.addEventListener('click', function () { open(b.getAttribute('data-open'), b); });
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) close();
    // Cierra el menú al navegar por un enlace interno
    var link = e.target.closest('.drawer__nav a');
    if (link) close(true);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  /* ---------------- Carrito ---------------- */
  var KEY = 'sda_cart_v1';
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) { cart = []; }
  if (!Array.isArray(cart)) cart = [];
  cart = cart.filter(function (i) { return i && i.qty > 0 && i.price > 0 && i.pack > 0; });

  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (_) { /* sin almacenamiento */ } }
  function totals() {
    return cart.reduce(function (a, i) { a.count += i.qty; a.opps += i.qty * i.pack; a.total += i.qty * i.price; return a; }, { count: 0, opps: 0, total: 0 });
  }

  var listEl = $('#cart-list'), emptyEl = $('#cart-empty'), footEl = $('#cart-foot'), totalEl = $('#cart-total');

  function render() {
    var t = totals();
    $$('[data-cart-count]').forEach(function (el) { el.textContent = t.count; });
    var has = cart.length > 0;
    emptyEl.hidden = has; listEl.hidden = !has; footEl.hidden = !has;
    totalEl.textContent = money(t.total);
    listEl.innerHTML = '';
    cart.forEach(function (i, idx) {
      var li = document.createElement('li');
      li.className = 'cart__item';
      li.innerHTML =
        '<div><strong>Pack ' + i.pack + (i.pack === 1 ? ' oportunidad' : ' oportunidades') + '</strong><br>' +
        '<small>' + money(i.price) + ' c/u pack</small>' +
        '<div class="cart__ctrl"><button type="button" data-dec="' + idx + '" aria-label="Quitar uno">−</button>' +
        '<span>' + i.qty + '</span>' +
        '<button type="button" data-inc="' + idx + '" aria-label="Agregar uno">+</button></div></div>' +
        '<div class="cart__price">' + money(i.price * i.qty) + '</div>';
      listEl.appendChild(li);
    });
  }

  function add(pack, price) {
    var found = cart.filter(function (i) { return i.pack === pack; })[0];
    if (found) found.qty += 1; else cart.push({ pack: pack, price: price, qty: 1 });
    save(); render();
    $$('.cart-badge').forEach(function (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
  }

  $$('[data-add]').forEach(function (b) {
    b.addEventListener('click', function () {
      add(parseInt(b.getAttribute('data-qty'), 10), parseInt(b.getAttribute('data-price'), 10));
      open('cart', b);
    });
  });

  listEl.addEventListener('click', function (e) {
    var inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
    if (inc) cart[+inc.getAttribute('data-inc')].qty += 1;
    else if (dec) {
      var i = +dec.getAttribute('data-dec');
      cart[i].qty -= 1;
      if (cart[i].qty <= 0) cart.splice(i, 1);
    } else return;
    save(); render();
  });
  $('#cart-clear').addEventListener('click', function () { cart = []; save(); render(); });

  $('#checkout').addEventListener('click', function () {
    var t = totals();
    if (!t.count) return;
    if (CHECKOUT_URL) { window.location.href = CHECKOUT_URL; return; }
    var lines = cart.map(function (i) {
      return '• ' + i.qty + ' × Pack ' + i.pack + (i.pack === 1 ? ' oportunidad' : ' oportunidades') + ' (' + money(i.price * i.qty) + ')';
    });
    $('#f-mensaje').value = 'Hola, quiero comprar:\n' + lines.join('\n') + '\nTotal: ' + money(t.total) + ' (' + (t.opps) + ' oportunidades)';
    close(true);
    $('#contacto').scrollIntoView({ behavior: 'smooth' });
    setTimeout(function () { $('#f-nombre').focus({ preventScroll: true }); }, 500);
  });

  render();

  /* ---------------- FAQ: una abierta a la vez ---------------- */
  var faqs = $$('.faq__item');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) faqs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---------------- Formulario de contacto ---------------- */
  var form = $('#contact-form'), status = $('#form-status');
  function showStatus(msg, ok) {
    status.textContent = msg; status.hidden = false;
    status.classList.toggle('is-ok', !!ok);
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.hidden = true;
    var valid = true;
    $$('.field', form).forEach(function (f) {
      var input = $('input, textarea', f);
      var bad = !input.value.trim() || (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()));
      f.classList.toggle('has-error', bad);
      $('.field__error', f).hidden = !bad;
      if (bad) valid = false;
    });
    if (!valid) { $('.has-error input, .has-error textarea', form).focus(); return; }

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });

    if (!FORM_ENDPOINT) {
      showStatus('Hubo un error al intentar enviar su formulario. Por favor, inténtelo de nuevo.', false);
      if (window.console) console.warn('Configura FORM_ENDPOINT en assets/js/main.js para recibir los mensajes.');
      return;
    }
    fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); showStatus('¡Gracias! Recibimos tu mensaje y te responderemos pronto.', true); })
      .catch(function () { showStatus('Hubo un error al intentar enviar su formulario. Por favor, inténtelo de nuevo.', false); });
  });
  $$('.field input, .field textarea', form).forEach(function (el) {
    el.addEventListener('input', function () {
      var f = el.closest('.field'); f.classList.remove('has-error'); $('.field__error', f).hidden = true;
    });
  });
})();
