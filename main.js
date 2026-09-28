/* Air Tribe — chování webu (bez knihoven) */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Navigace: jen změna pozadí, menu se nikdy neschovává ---- */
  var nav = document.querySelector(".nav");
  var toTop = document.createElement("button");
  toTop.className = "to-top"; toTop.type = "button";
  toTop.setAttribute("aria-label", "Zpět nahoru");
  toTop.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
  document.body.appendChild(toTop);
  /* jedna společná rozostřená vrstva za menu i přilepenou orientační lištou */
  var blur = document.createElement("div");
  blur.className = "sticky-blur";
  document.body.appendChild(blur);
  var pillBar = document.querySelector(".pillnav");
  function onScroll() {
    var y = window.scrollY;
    var solid = y > 24;
    if (nav) nav.classList.toggle("is-solid", solid);
    var bottom = nav ? nav.offsetHeight : 0;
    if (pillBar) {
      var top = parseFloat(getComputedStyle(pillBar).top) || 0;
      var docked = pillBar.getBoundingClientRect().top <= top + 1.5;
      pillBar.classList.toggle("docked", docked);
      if (docked) bottom = Math.max(bottom, top + pillBar.offsetHeight);
    }
    blur.style.height = bottom + "px";
    blur.classList.toggle("show", solid);
    toTop.classList.toggle("is-on", y > 900);
  }
  window.addEventListener("resize", onScroll);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Mobilní menu ---- */
  var burger = document.querySelector(".burger");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    document.body.classList.toggle("no-scroll", open);
    if (burger) {
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Zavřít menu" : "Otevřít menu");
    }
  }
  if (burger) {
    burger.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
    document.querySelectorAll(".menu a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 820) setMenu(false); });
  }

  /* ---- Odkazy na #nabidka na stejné stránce: plynulý posun ---- */
  document.querySelectorAll('a[href*="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var url = new URL(a.href, location.href);
      if (url.pathname.replace(/index\.html$/, "") !== location.pathname.replace(/index\.html$/, "") || !url.hash) return;
      var t = document.querySelector(url.hash);
      if (!t) return;
      e.preventDefault();
      setMenu(false);
      t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      try { history.replaceState(null, "", url.hash); } catch (err) {}
    });
  });

  /* ---- Orientační lišta sekcí: zvýrazní sekci, ve které právě jste ---- */
  var pills = Array.prototype.slice.call(document.querySelectorAll(".pillnav a"));
  if (pills.length) {
    var targets = pills.map(function (p) { return document.querySelector(p.getAttribute("href")); });
    var spyTick = false, lastActive = null;
    var spy = function () {
      spyTick = false;
      var line = (nav ? nav.offsetHeight : 0) + 90, cur = -1;
      targets.forEach(function (t, k) { if (t && t.getBoundingClientRect().top <= line) cur = k; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = targets.length - 1;
      pills.forEach(function (p, k) { p.classList.toggle("is-active", k === cur); });
      var act = pills[cur];
      if (act && act !== lastActive) {
        lastActive = act;
        var bar = act.parentNode;
        if (bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: act.offsetLeft - bar.clientWidth / 2 + act.offsetWidth / 2, behavior: reduce ? "auto" : "smooth" });
      }
    };
    window.addEventListener("scroll", function () { if (!spyTick) { spyTick = true; requestAnimationFrame(spy); } }, { passive: true });
    window.addEventListener("resize", spy);
    spy();
  }

  /* ---- Odhalování při scrollu ---- */
  var reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- Nekonečný karusel ----
     Posouvá se sám po jednom snímku (skokově s plynulým dojezdem), ovládá se
     šipkami na obrazovce, tečkami, šipkami na klávesnici a přejetím prstem/myší.
     Na začátek a konec se přidají kopie snímků, takže smyčka nemá viditelný konec. */
  var carousels = [];
  /* Karusel se dá spustit i na kusu stránky, který vznikl až za běhu —
     tak se rozjede i galerie fotek v otevřeném medailonku. */
  function karusel(root) {
    var track = root.querySelector(".car-track");
    var viewport = root.querySelector(".car-viewport");
    var originals = Array.prototype.slice.call(track.children);
    var N = originals.length;
    if (!N) return;
    var interval = parseInt(root.getAttribute("data-interval"), 10) || 4000;
    var auto = root.getAttribute("data-interval") !== "0";   /* 0 = posouvá jen návštěvník */
    var bp = (root.getAttribute("data-per-view") || "4,2,1").split(",").map(Number); /* desktop, tablet, mobil */
    var n = 0, idx = 0, timer = null, settleT = null, hovering = false, visible = false, busy = false;
    var dotsBox = root.querySelector(".car-dots");

    function perView() { var w = window.innerWidth; return w > 1024 ? bp[0] : (w > 560 ? bp[1] : bp[2]); }

    function build() {
      var real = n ? ((idx - n) % N + N) % N : 0;
      n = Math.min(perView(), N);
      track.innerHTML = "";
      var clone = function (el) { var c = el.cloneNode(true); c.setAttribute("aria-hidden", "true"); c.querySelectorAll("img").forEach(function (i) { i.removeAttribute("loading"); }); return c; };
      for (var i = N - n; i < N; i++) track.appendChild(clone(originals[i]));
      originals.forEach(function (el) { track.appendChild(el); });
      for (var j = 0; j < n; j++) track.appendChild(clone(originals[j]));
      track.style.setProperty("--n", n);
      idx = n + real;
      place(false);
      if (dotsBox) {
        dotsBox.innerHTML = "";
        for (var d = 0; d < N; d++) {
          var b = document.createElement("button");
          b.type = "button"; b.setAttribute("aria-label", "Snímek " + (d + 1));
          (function (k) { b.addEventListener("click", function () { go(n + k); restart(); }); })(d);
          dotsBox.appendChild(b);
        }
      }
      markDots();
    }
    function gap() { return parseFloat(getComputedStyle(track).columnGap) || 0; }
    function place(anim) {
      track.classList.toggle("is-anim", !!anim && !reduce);
      track.style.transform = "translateX(calc(" + (-idx) + " * (100% + " + gap() + "px) / " + n + "))";
    }
    function markDots() {
      if (!dotsBox) return;
      var real = ((idx - n) % N + N) % N;
      Array.prototype.forEach.call(dotsBox.children, function (b, k) { b.setAttribute("aria-current", k === real ? "true" : "false"); });
    }
    function go(to) {
      if (busy) {                         /* rychlé klikání: dokončit předchozí posun skokem */
        var diff = to - idx;
        settle();
        to = idx + diff;
        void track.offsetWidth;
      }
      idx = to; busy = true;
      place(true); markDots();
      clearTimeout(settleT);
      settleT = setTimeout(settle, reduce ? 0 : 900);
    }
    function settle() {
      clearTimeout(settleT);
      busy = false;
      if (idx >= N + n) { idx -= N; place(false); }
      else if (idx < n) { idx += N; place(false); }
    }
    track.addEventListener("transitionend", function (e) { if (e.target === track) settle(); });

    function next() { go(idx + 1); }
    function prev() { go(idx - 1); }
    function stop() { clearInterval(timer); timer = null; }
    function restart() {
      stop();
      if (!auto || hovering || !visible || document.hidden) return;
      timer = setInterval(next, interval);
    }

    var pb = root.querySelector("[data-prev]"), nb = root.querySelector("[data-next]");
    if (pb) pb.addEventListener("click", function () { prev(); restart(); });
    if (nb) nb.addEventListener("click", function () { next(); restart(); });
    /* automatický posun se zastaví jen pod kurzorem myši (ne po kliknutí ani na dotykových displejích) */
    root.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { hovering = true; stop(); } });
    root.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { hovering = false; restart(); } });

    /* tažení myší (se zmáčknutým tlačítkem) i prstem — pás jede za kurzorem */
    var drag = null, moved = false;
    function slideStep() {
      var first = track.children[0];
      return first ? first.getBoundingClientRect().width + gap() : viewport.clientWidth / n;
    }
    function basePx() { return -idx * slideStep(); }
    viewport.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target.closest("button")) return;
      if (busy) settle();
      drag = { x: e.clientX, y: e.clientY, dx: 0, id: e.pointerId, base: basePx(), axis: null };
      moved = false;
      stop();
    });
    window.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (drag.axis === "x") { root.classList.add("is-dragging"); try { viewport.setPointerCapture(drag.id); } catch (err) {} }
      }
      if (drag.axis !== "x") return;
      e.preventDefault();
      moved = true;
      drag.dx = dx;
      track.classList.remove("is-anim");
      track.style.transform = "translateX(" + (drag.base + dx) + "px)";
    }, { passive: false });
    function endDrag() {
      if (!drag) return;
      var d = drag; drag = null;
      root.classList.remove("is-dragging");
      if (d.axis === "x") {
        var step = slideStep();
        var steps = Math.round(-d.dx / step);
        if (steps === 0 && Math.abs(d.dx) > 40) steps = d.dx < 0 ? 1 : -1;
        steps = Math.max(-n, Math.min(n, steps));
        if (steps === 0) place(true);
        else go(idx + steps);
      }
      restart();
    }
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    /* kliknutí po tažení nic neotevře */
    viewport.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    viewport.addEventListener("dragstart", function (e) { e.preventDefault(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; restart(); }, { threshold: 0.3 }).observe(root);
    } else { visible = true; }
    document.addEventListener("visibilitychange", restart);

    var rT;
    window.addEventListener("resize", function () { clearTimeout(rT); rT = setTimeout(function () { if (Math.min(perView(), N) !== n) build(); else place(false); }, 150); });

    build();
    restart();
    carousels.push({ root: root, next: function () { next(); restart(); }, prev: function () { prev(); restart(); }, isHovered: function () { return hovering; } });
  }
  document.querySelectorAll("[data-carousel]").forEach(karusel);

  /* šipky na klávesnici: ovládají karusel pod kurzorem, zaostřený, jinak ten nejvíc viditelný.
     Posluchač se přidává vždy — karusel může vzniknout až později (medailonek). */
  {
    document.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      /* v otevřeném medailonku patří šipky přepínání členů, ne fotkám */
      if (document.querySelector("dialog[open]")) return;
      /* karusely ze zavřených medailonků už v dokumentu nejsou */
      carousels = carousels.filter(function (c) { return c.root.isConnected; });
      var pick = null, best = 0;
      carousels.forEach(function (c) {
        if (c.isHovered() || c.root.contains(document.activeElement)) { pick = c; best = 2; }
      });
      if (!pick) {
        carousels.forEach(function (c) {
          var r = c.root.getBoundingClientRect();
          var vis = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / Math.max(1, r.height);
          if (vis > best && vis > 0.5) { best = vis; pick = c; }
        });
      }
      if (!pick) return;
      e.preventDefault();
      e.key === "ArrowRight" ? pick.next() : pick.prev();
    });
  }

  /* ---- Jemný paralax široké fotky ---- */
  var par = document.querySelectorAll("[data-parallax] img");
  if (par.length && !reduce) {
    var ticking = false;
    var upd = function () {
      par.forEach(function (img) {
        var r = img.parentNode.getBoundingClientRect();
        var p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        img.style.transform = "translateY(" + (-8 + p * -8).toFixed(2) + "%)";
      });
      ticking = false;
    };
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  /* ---- Nabídka: rozbalovací popisky (mobil a tablet) ---- */
  var psBtns = Array.prototype.slice.call(document.querySelectorAll(".ps-btn"));
  if (psBtns.length) {
    var narrow = window.matchMedia("(max-width: 1160px)");
    var psBody = function (btn) {
      var row = btn.closest(".ps");
      return row ? row.querySelector(".ps-body") : null;
    };
    /* Zavře jednu položku (beze změny ostatních). */
    var zavriPs = function (btn) {
      var box = psBody(btn);
      if (!box || btn.getAttribute("aria-expanded") !== "true") return;
      btn.setAttribute("aria-expanded", "false");
      box.classList.remove("is-open");
      box.style.maxHeight = box.scrollHeight + "px";
      requestAnimationFrame(function () { box.style.maxHeight = "0px"; });
    };
    psBtns.forEach(function (btn, k) {
      var box = psBody(btn);
      if (!box) return;
      if (!box.id) box.id = "ps-body-" + (k + 1);
      btn.setAttribute("aria-controls", box.id);
      btn.addEventListener("click", function () {
        if (!narrow.matches) return;
        var on = btn.getAttribute("aria-expanded") !== "true";
        /* V nabídce je rozkrytá vždy jen jedna položka — otevření další
           tu předchozí zavře, ať se tabulka údajů nerozjede do dlouhého
           sloupce, ve kterém se nedá nic najít. */
        if (on) psBtns.forEach(function (jiny) { if (jiny !== btn) zavriPs(jiny); });
        btn.setAttribute("aria-expanded", on ? "true" : "false");
        box.classList.toggle("is-open", on);
        if (on) {
          box.style.maxHeight = box.scrollHeight + 20 + "px";
          var done = function () {
            if (box.classList.contains("is-open")) box.style.maxHeight = "none";
            box.removeEventListener("transitionend", done);
          };
          box.addEventListener("transitionend", done);
        } else {
          box.style.maxHeight = box.scrollHeight + "px";
          requestAnimationFrame(function () { box.style.maxHeight = "0px"; });
        }
      });
    });
    var syncPs = function () {
      psBtns.forEach(function (btn) {
        var box = psBody(btn);
        if (!box) return;
        if (narrow.matches) {
          if (btn.getAttribute("aria-expanded") !== "true") {
            btn.setAttribute("aria-expanded", "false");
            box.classList.remove("is-open");
            box.style.maxHeight = "0px";
          } else {
            box.style.maxHeight = "none";
          }
        } else {
          btn.setAttribute("aria-expanded", "true");
          box.style.maxHeight = "";
        }
      });
    };
    (narrow.addEventListener ? narrow.addEventListener("change", syncPs) : narrow.addListener(syncPs));
    syncPs();
  }

  /* ---- Počty let se dopočítají samy ----
     Každý údaj typu „12 let tréninku parkouru“ je v HTML zapsaný jako
     <span class="pocet-let" data-od="2014">12</span>. Generátor do něj vloží
     aktuální číslo už při sestavení webu, tohle ho navíc přepočítá přímo
     v prohlížeči — takže naroste i na stránce, která se mezitím
     negenerovala. Nový údaj stačí označit stejnou třídou, nic dalšího.
     Místo roku může být i přesné datum „2003-02-28“ — pak číslo naroste
     až v den výročí, ne už 1. ledna. Tak jsou zapsané věky členů. */
  function prepocitejLeta(koren) {
  Array.prototype.slice.call((koren || document).querySelectorAll(".pocet-let[data-od]")).forEach(function (el) {
    var od = el.getAttribute("data-od") || "";
    var dnes = new Date(), casti = od.split("-"), rok = parseInt(casti[0], 10);
    if (!rok) return;
    var pocet = dnes.getFullYear() - rok;
    if (casti.length === 3) {
      var mesic = parseInt(casti[1], 10), den = parseInt(casti[2], 10);
      var letos = dnes.getMonth() + 1 < mesic || (dnes.getMonth() + 1 === mesic && dnes.getDate() < den);
      if (letos) pocet -= 1;        /* výročí letos ještě nebylo */
    }
    if (pocet >= 0) el.textContent = pocet;
  });
  }
  prepocitejLeta(document);

  /* ---- Záchrana, když se nějaká fotka nestáhne ----
     Fotky pro telefon jsou jiné soubory než ty pro počítač (`<picture>`
     se `<source media>`). Když se verze pro telefon na server nedostane,
     prohlížeč z <picture> sám na `<img src>` nepřepne a zůstane prázdné
     místo. Tohle v takovém případě `<source>` zahodí a zkusí znovu
     základní adresu — ukáže se aspoň verze pro počítač. */
  document.addEventListener("error", function (e) {
    var obr = e.target;
    if (!obr || obr.tagName !== "IMG" || obr.dataset.nahrada) return;
    var pic = obr.parentElement;
    if (!pic || pic.tagName !== "PICTURE") return;
    var zaklad = obr.getAttribute("src");
    if (!zaklad) return;
    obr.dataset.nahrada = "1";
    pic.querySelectorAll("source").forEach(function (z) { z.remove(); });
    obr.removeAttribute("srcset");
    obr.src = zaklad;
  }, true);

  var PROLNUTI_PAUZA = 6500;   /* jak dlouho je jedna fotka vidět (ms) */
  var prolinaniVypnuto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Pomalé přiblížení fotky, dokud je vidět. Třída se musí přidat až
     v dalším snímku — kdyby se nastavila hned s „is-on“, prohlížeč by
     mezi starou a novou hodnotou transform neviděl žádnou změnu
     a rovnou by skočil na konec. */
  function priblizit(obr) {
    if (!obr) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { obr.classList.add("se-priblizuje"); });
    });
  }

  /* ---- Úvodní fotky na domovské stránce ----
     V HTML leží dvě sady přes sebe: fotky na šířku (`h-siroka`) pro
     počítač a fotky na výšku (`h-uzka`) pro telefon. CSS jednu z nich
     schová podle šířky displeje, tady se pak střídá jenom ta viditelná
     — druhá sada se ani nestáhne. První snímek obou sad je jeden
     <picture>, které si správnou verzi vybere samo už při načtení.
     Zbylé mají adresu v data-src a doplní se až po načtení stránky,
     ať úvodní zobrazení není pomalejší kvůli fotkám, které uvidí
     uživatel až za chvíli. */
  var uvodniFotky = document.querySelector(".hero-media");
  if (uvodniFotky && !prolinaniVypnuto) {
    var uzkyDisplej = window.matchMedia("(max-width: 760px)");
    var strida = null;

    var heroSada = function () {
      var prvni = uvodniFotky.querySelector("picture img");
      var dalsi = uvodniFotky.querySelectorAll(uzkyDisplej.matches ? "img.h-uzka" : "img.h-siroka");
      return (prvni ? [prvni] : []).concat(Array.prototype.slice.call(dalsi));
    };

    var dotahni = function (fotky) {
      fotky.forEach(function (o) {
        if (!o.hasAttribute("data-src")) return;
        if (o.hasAttribute("data-srcset")) { o.srcset = o.getAttribute("data-srcset"); o.removeAttribute("data-srcset"); }
        o.src = o.getAttribute("data-src"); o.removeAttribute("data-src");
      });
    };

    /* Rozjede střídání nad tou sadou, která je zrovna vidět. Volá se
       znovu i při překlopení displeje přes 760 px — druhá sada tehdy
       začíná zase od své první fotky. */
    var rozjedHero = function () {
      if (strida) { clearTimeout(strida); strida = null; }
      var fotky = heroSada();
      if (!fotky.length) return;
      dotahni(fotky);
      uvodniFotky.querySelectorAll("img").forEach(function (o) {
        o.classList.remove("is-on"); o.classList.remove("se-priblizuje");
      });
      fotky[0].classList.add("is-on");
      priblizit(fotky[0]);
      if (fotky.length < 2) return;
      var i = 0;
      var dal = function () {
        if (!document.hidden) {
          fotky[i].classList.remove("is-on");
          fotky[i].classList.remove("se-priblizuje");
          i = (i + 1) % fotky.length;
          fotky[i].classList.add("is-on");
          priblizit(fotky[i]);
        }
        strida = setTimeout(dal, PROLNUTI_PAUZA);
      };
      strida = setTimeout(dal, PROLNUTI_PAUZA);
    };

    var start = function () { setTimeout(rozjedHero, 500); };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start);
    (uzkyDisplej.addEventListener
      ? uzkyDisplej.addEventListener("change", rozjedHero)
      : uzkyDisplej.addListener(rozjedHero));
  }

  /* ---- Medailonky členů týmu ---- */
  var drawer = document.getElementById("memberDrawer");
  var members = Array.prototype.slice.call(document.querySelectorAll(".member"));
  if (drawer && members.length && typeof drawer.showModal === "function") {
    var dPhoto = drawer.querySelector(".drawer-photo"), dNick = drawer.querySelector(".drawer-nick"),
        dName = drawer.querySelector(".drawer-name"), dVek = drawer.querySelector(".drawer-vek"),
        dBio = drawer.querySelector(".drawer-bio"), dInner = drawer.querySelector(".drawer-body");
    var cur = 0, opener = null;
    var fill = function (k) {
      cur = (k + members.length) % members.length;
      var m = members[cur];
      /* Rozkliknutý medailonek má vlastní galerii (<template class="m-velke">) —
         karusel se šipkami, tečkami a tažením. Uvnitř <template> se fotky
         nestahují, dokud medailonek někdo neotevře. Kdyby šablona chyběla,
         ukáže se aspoň fotka z karty. */
      var sablona = m.querySelector("template.m-velke");
      var ph = sablona ? sablona.content.firstElementChild.cloneNode(true)
                       : m.querySelector(".m-photo").cloneNode(true);
      ph.querySelectorAll("img").forEach(function (im) { im.removeAttribute("loading"); });
      dPhoto.innerHTML = ""; dPhoto.appendChild(ph);
      if (ph.hasAttribute("data-carousel")) karusel(ph);
      dNick.textContent = m.dataset.nick ? "„" + m.dataset.nick + "“" : "";
      dNick.hidden = !m.dataset.nick;
      dName.textContent = m.dataset.name;
      dBio.innerHTML = m.querySelector(".member-bio").innerHTML;
      /* Věk nepatří mezi ostatní štítky — stojí vpravo na úrovni jména. */
      var vek = dBio.querySelector(".m-vek");
      dVek.innerHTML = vek ? vek.innerHTML : "";
      dVek.hidden = !vek;
      if (vek) vek.remove();
      prepocitejLeta(dBio); prepocitejLeta(dVek);
      dInner.scrollTop = 0;
      try { history.replaceState(null, "", "#" + m.id); } catch (e) {}
    };
    var open = function (k) { opener = members[k]; fill(k); if (!drawer.open) { drawer.showModal(); document.body.classList.add("no-scroll"); } };
    drawer.addEventListener("close", function () {
      document.body.classList.remove("no-scroll");
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
      if (opener) opener.focus({ preventScroll: true });
    });
    members.forEach(function (m, k) {
      /* Kliknutí na ikonu sociální sítě vede na odkaz, medailonek se neotevírá. */
      m.addEventListener("click", function (e) { if (e.target.closest(".m-soc")) return; open(k); });
      m.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(k); } });
    });
    drawer.querySelector("[data-close]").addEventListener("click", function () { drawer.close(); });
    drawer.querySelector("[data-prev]").addEventListener("click", function () { fill(cur - 1); });
    drawer.querySelector("[data-next]").addEventListener("click", function () { fill(cur + 1); });
    drawer.addEventListener("click", function (e) {
      if (e.target === drawer) drawer.close();
    });
    drawer.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") fill(cur - 1); if (e.key === "ArrowRight") fill(cur + 1); });
    var h = decodeURIComponent(location.hash.slice(1));
    members.forEach(function (m, k) { if (h && m.id === h) setTimeout(function () { open(k); }, 300); });
  }

  /* ---- Kontaktní formulář přes Web3Forms ---- */
  var form = document.getElementById("contactForm");
  if (form) {
    var status = document.getElementById("formStatus");
    var btn = form.querySelector("button[type=submit]");
    var label = btn.querySelector(".label-txt");
    var labelText = label.textContent;
    var setStatus = function (t, c) { status.textContent = t; status.className = "form-status" + (c ? " " + c : ""); };
    var mark = function (input) { input.closest(".field").classList.add("is-invalid"); };
    form.addEventListener("input", function (e) { var f = e.target.closest(".field"); if (f) f.classList.remove("is-invalid"); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (btn.disabled) return;
      var name = form.elements.name, email = form.elements.email, msg = form.elements.message;
      if (!name.value.trim()) { mark(name); setStatus("Doplňte prosím své jméno.", "is-error"); name.focus(); return; }
      if (!email.value.trim() || !email.checkValidity()) { mark(email); setStatus("Zkontrolujte prosím e-mailovou adresu.", "is-error"); email.focus(); return; }
      if (!msg.value.trim()) { mark(msg); setStatus("Napište nám prosím pár slov o akci.", "is-error"); msg.focus(); return; }
      form.elements.replyto.value = email.value.trim();
      var typ = form.querySelector('input[name="typ_akce"]:checked');
      form.elements.subject.value = "Poptávka z webu Air Tribe" + (typ ? " — " + typ.value : "");
      btn.disabled = true; btn.classList.add("is-loading"); label.textContent = "Odesílám…";
      setStatus("Odesílám zprávu…", "is-loading");
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); })
        .then(function (res) {
          if (res.ok && res.data && res.data.success) { setStatus("Děkujeme, zpráva je odeslaná. Ozveme se co nejdřív.", "is-success"); form.reset(); }
          else { setStatus("Zprávu se nepodařilo odeslat. Zkuste to prosím znovu nebo napište na teamairtribe@gmail.com.", "is-error"); }
        })
        .catch(function () { setStatus("Zprávu se nepodařilo odeslat — zřejmě chybí připojení. Napište nám na teamairtribe@gmail.com.", "is-error"); })
        .then(function () { btn.disabled = false; btn.classList.remove("is-loading"); label.textContent = labelText; });
    });
  }

  /* ---- Barevný přechod Instagramu pro ikony (použije ho CSS při najetí) ---- */
  var ig = document.createElement("div");
  ig.setAttribute("aria-hidden", "true");
  ig.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  ig.innerHTML = '<svg><defs><linearGradient id="igGrad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset=".3" stop-color="#fa7e1e"/><stop offset=".6" stop-color="#d62976"/><stop offset=".9" stop-color="#962fbf"/></linearGradient></defs></svg>';
  document.body.appendChild(ig);

  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
