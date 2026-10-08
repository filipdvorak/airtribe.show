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

  /* ---- Kam přesně skákat na sekci ----
     Horní hrana sekce má dosednout přesně pod pevnou hlavičku a pod
     přilepenou orientační lištu. Výška obou se měří ze stránky, ne
     odhaduje — jinak sekce buď zaleze pod lištu, nebo pod ní zbude
     mezera. Lišta se počítá, jen když se opravdu přilepuje. */
  /* Lišta se po přilepení stáhne do nižší podoby, takže skoky na sekce
     musí počítat s tou stáhnutou výškou — jinak by pod lištou zůstala
     mezera. Měří se nasucho: stav „přilepeno" se zapne bez animace,
     změří a hned vrátí. Výsledek závisí jen na šířce okna, takže se
     přepočítává při změně velikosti, ne při každém scrollu. */
  var vyskaListy = 0, vyskaVolna = 0;
  function zmerListu() {
    vyskaListy = vyskaVolna = 0;
    if (!pillBar || getComputedStyle(pillBar).position !== "sticky") return 0;
    var bylo = pillBar.classList.contains("docked");
    pillBar.classList.add("bez-prechodu");
    pillBar.classList.remove("docked");
    /* Stahovat má smysl jen tam, kde se pilulky ve výchozím stavu na jeden
       řádek nevejdou — jinak by se lišta zmenšovala bez užitku. */
    var vrch = {}, radku = 0;
    pillBar.querySelectorAll("a").forEach(function (a) {
      var y = Math.round(a.getBoundingClientRect().top);
      if (!vrch[y]) { vrch[y] = 1; radku++; }
    });
    pillBar.classList.toggle("stahovat", radku > 1);
    vyskaVolna = pillBar.offsetHeight;
    pillBar.classList.add("docked");
    vyskaListy = pillBar.offsetHeight;
    if (!bylo) pillBar.classList.remove("docked");
    /* O co se lišta po přilepení zkrátí, o to si pod sebou nechá mezeru,
       ať se obsah pod ní ani o pixel neposune. */
    pillBar.style.setProperty("--dock-rezerva", Math.max(0, vyskaVolna - vyskaListy) + "px");
    void pillBar.offsetHeight;
    pillBar.classList.remove("bez-prechodu");
    return vyskaListy;
  }

  function odsazeniSkoku() {
    var v = (nav ? nav.offsetHeight : 0) + vyskaListy;
    document.documentElement.style.setProperty("--odsazeni-scroll", v + "px");
    return v;
  }
  zmerListu();
  odsazeniSkoku();
  window.addEventListener("resize", function () { zmerListu(); odsazeniSkoku(); });
  window.addEventListener("load", function () { zmerListu(); odsazeniSkoku(); });

  /* Doplní ho blok s orientační lištou níž; do té doby nedělá nic. */
  var prekresliSpy = function () {};
  var byloDocked = null;

  function onScroll() {
    var y = window.scrollY;
    var solid = y > 24;
    if (nav) nav.classList.toggle("is-solid", solid);
    var bottom = nav ? nav.offsetHeight : 0;
    if (pillBar) {
      var top = parseFloat(getComputedStyle(pillBar).top) || 0;
      var docked = pillBar.getBoundingClientRect().top <= top + 1.5;
      pillBar.classList.toggle("docked", docked);
      /* Přilepení mění geometrii pod lištou. Kdo se o zvýraznění stará,
         musí přeměřit znovu — jinak zůstane viset stav z okamžiku,
         kdy lišta ještě nebyla stažená, a po doskoku nesvítí nic. */
      if (docked !== byloDocked) { byloDocked = docked; prekresliSpy(); }
      /* Rozostřená vrstva má rovnou sedět na stáhnuté výšce lišty, ať
         během těch dvou desetin sekundy nepodbíhá. */
      if (docked) bottom = Math.max(bottom, top + (vyskaListy || pillBar.offsetHeight));
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

  /* ---- Odkazy na kotvy na stejné stránce: plynulý posun ----
     Cíl se počítá ručně, ne přes scrollIntoView, ať se dá výsledek
     zastropovat koncem stránky a ať je vidět, z čeho vychází. */
  function cilSkoku(t) {
    var okraj = parseFloat(getComputedStyle(t).scrollMarginTop) || 0;
    var y = t.getBoundingClientRect().top + window.scrollY - okraj - odsazeniSkoku();
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(0, Math.min(max, Math.round(y)));
  }
  document.querySelectorAll('a[href*="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var url = new URL(a.href, location.href);
      if (url.pathname.replace(/index\.html$/, "") !== location.pathname.replace(/index\.html$/, "") || !url.hash) return;
      var t = document.querySelector(url.hash);
      if (!t) return;
      e.preventDefault();
      setMenu(false);
      window.scrollTo({ top: cilSkoku(t), behavior: reduce ? "auto" : "smooth" });
      /* Pojistka pro případ, že poslední událost scroll přišla dřív, než se
         lišta stáhla: po doklouzání se zvýraznění přepočítá ještě jednou. */
      setTimeout(prekresliSpy, 420);
      setTimeout(prekresliSpy, 1000);
      try { history.replaceState(null, "", url.hash); } catch (err) {}
    });
  });

  /* ---- Orientační lišta sekcí: zvýrazní sekci, ve které právě jste ---- */
  var pills = Array.prototype.slice.call(document.querySelectorAll(".pillnav a"));
  if (pills.length) {
    var targets = pills.map(function (p) { return document.querySelector(p.getAttribute("href")); });
    /* Cíl, který si pro skok přidává vlastní vzduch (scroll-margin-top),
       dosedne o ten kus níž — bez něj by pilulka po doskoku nezůstala
       zvýrazněná, protože sekce hranici nikdy nepřekročila. */
    var okraje = [];
    function zmerOkraje() {
      okraje = targets.map(function (t) { return t ? parseFloat(getComputedStyle(t).scrollMarginTop) || 0 : 0; });
    }
    zmerOkraje();
    window.addEventListener("resize", zmerOkraje);
    var spyTick = false, lastActive = null;
    var spy = function () {
      spyTick = false;
      /* Stejná hranice, na jakou skáče kliknutí — sekce se zvýrazní
         přesně v okamžiku, kdy dosedne pod lišty (pár pixelů rezervy). */
      var line = odsazeniSkoku() + 6, cur = -1;
      targets.forEach(function (t, k) { if (t && t.getBoundingClientRect().top - okraje[k] <= line) cur = k; });
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
    if ("onscrollend" in window) window.addEventListener("scrollend", spy);
    prekresliSpy = function () { requestAnimationFrame(spy); };
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

    /* Jednofotkové karusely (nabídka, galerie v medailoncích) se chovají
       stejně jako rotátor na filip-dvorak.com:
         - samy od sebe se fotka PROLNE (první po 3,5 s, pak každých 5,3 s),
         - ručně (šipka, tečka, prst) se POSUNE do strany,
         - přejetí prstem fotku přehodí až po puštění, nejde za prstem.
       Karusel ohlasů na kontaktu ukazuje víc položek vedle sebe, takže si
       nechává původní chování. */
    var rotator = (root.getAttribute("data-per-view") || "4,2,1") === "1,1,1";
    var DRZ = 3500, STANI = 4200, PROLNUTI = 1100, POSUN = 520, PRAH = 45;
    var prolinani = null, prvniPusteni = true;
    if (rotator) {
      root.classList.add("car-rotator");
      root.style.setProperty("--rot-fade", PROLNUTI + "ms");
      root.style.setProperty("--car-anim", POSUN + "ms");
      auto = !reduce;
      interval = STANI + PROLNUTI;
    }

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
          (function (k) { b.addEventListener("click", function () { go(n + k); poRucnim(); }); })(d);
          dotsBox.appendChild(b);
        }
      }
      markDots();
    }
    function gap() { return parseFloat(getComputedStyle(track).columnGap) || 0; }
    /* Fotky, které karusel zatím neukázal, mají adresu schovanou v data-src.
       Prohlížeč totiž u `loading="lazy"` bere ohled jen na to, jak daleko je
       obrázek svisle — a všechny snímky karuselu leží ve stejné výšce, takže
       jakmile se k pásu blížíme, stáhly by se naráz úplně všechny. Takhle se
       dotáhne jen ten právě ukázaný a jeho dva sousedi, aby posun na další
       nikdy nečekal. */
    function dotahniSnimek(el) {
      if (!el) return;
      el.querySelectorAll("img[data-src]").forEach(function (im) {
        if (im.dataset.srcset) { im.setAttribute("srcset", im.dataset.srcset); delete im.dataset.srcset; }
        if (im.dataset.sizes) { im.setAttribute("sizes", im.dataset.sizes); delete im.dataset.sizes; }
        im.setAttribute("src", im.dataset.src); delete im.dataset.src;
      });
    }
    function dotahniOkoli() {
      for (var i = idx - 1; i <= idx + n; i++) dotahniSnimek(track.children[i]);
    }
    function place(anim) {
      track.classList.toggle("is-anim", !!anim && !reduce);
      track.style.transform = "translateX(calc(" + (-idx) + " * (100% + " + gap() + "px) / " + n + "))";
      dotahniOkoli();
    }
    function markDots() {
      if (!dotsBox) return;
      var real = ((idx - n) % N + N) % N;
      Array.prototype.forEach.call(dotsBox.children, function (b, k) { b.setAttribute("aria-current", k === real ? "true" : "false"); });
    }
    function go(to) {
      if (prolinani) {                    /* rozdělané prolnutí se dokončí skokem */
        var rozdil = to - idx;
        zrusProlnuti(true);
        to = idx + rozdil;
        void track.offsetWidth;
      }
      if (busy) {                         /* rychlé klikání: dokončit předchozí posun skokem */
        var diff = to - idx;
        settle();
        to = idx + diff;
        void track.offsetWidth;
      }
      idx = to; busy = true;
      place(true); markDots();
      clearTimeout(settleT);
      settleT = setTimeout(settle, reduce ? 0 : (rotator ? POSUN + 140 : 900));
    }

    /* Prolnutí: do rámečku současné fotky se vloží kopie té další a
       zesvětlí se. Když dojede, pás pod ní skočí na nové místo (bez
       animace) a kopie zmizí — výměna není vidět, protože obojí ukazuje
       totéž. Pás tím pádem nemusí nikam jezdit a nic nebliká.

       Kopie je schválně **jen <img> vložený do téhož <figure>**, ne celý
       snímek položený přes rám karuselu. Rám pásu je kvůli posouvání
       vykreslovaný jako vlastní vrstva a ta se zarovnává na celé pixely;
       kopie mimo něj se kreslí do stránky. Obojí pak sedí na stejném
       místě jen „skoro" — a když se na konci prolnutí kopie vyměnila za
       pás, fotka o zlomek pixelu cukla. Takhle vznikají obě fotky ve
       stejném rámečku, se stejným ořezem, a kreslí je stejná vrstva. */
    function prolni(to) {
      if (reduce) { go(to); return; }
      if (busy) settle();
      var cilovy = track.children[to], soucasny = track.children[idx];
      if (!cilovy || !soucasny) { go(to); return; }
      dotahniSnimek(cilovy);
      var cilovaFotka = cilovy.querySelector("img");
      var ramecek = soucasny.querySelector("figure") || soucasny;
      if (!cilovaFotka) { go(to); return; }
      var kopie = cilovaFotka.cloneNode(true);
      kopie.classList.add("car-prolnuti");
      kopie.setAttribute("aria-hidden", "true");
      kopie.removeAttribute("loading");
      kopie.removeAttribute("id");
      /* Výřez (object-position) si nese každá fotka svůj, a kopie teď visí
         v cizím rámečku — musí si ho proto vzít s sebou napevno. */
      kopie.style.objectPosition = getComputedStyle(cilovaFotka).objectPosition;
      ramecek.appendChild(kopie);
      kopie.getBoundingClientRect();
      kopie.classList.add("je-videt");
      busy = true;
      prolinani = { el: kopie, to: to, t: setTimeout(function () { zrusProlnuti(true); }, PROLNUTI + 40) };
    }
    function zrusProlnuti(dokonci) {
      if (!prolinani) return;
      var p = prolinani; prolinani = null;
      clearTimeout(p.t);
      if (dokonci) { idx = p.to; place(false); markDots(); }
      if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
      busy = false;
      settle();
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
    function stop() { clearTimeout(timer); clearInterval(timer); timer = null; }
    function samo() { if (rotator && !reduce) prolni(idx + 1); else next(); }
    /* `prodleva` = kolik čekat do prvního přepnutí. Po ručním přepnutí je
       kratší o dobu posunu, aby se automatika viditelně nezadrhla. */
    function restart(prodleva) {
      stop();
      if (!auto || hovering || !visible || document.hidden) return;
      if (rotator) {
        var prvni = typeof prodleva === "number" ? prodleva
                  : (prvniPusteni ? DRZ : STANI + PROLNUTI);
        prvniPusteni = false;
        timer = setTimeout(function () {
          samo();
          timer = setInterval(samo, STANI + PROLNUTI);
        }, prvni);
        return;
      }
      timer = setInterval(next, interval);
    }
    function poRucnim() { restart(rotator ? STANI + POSUN : undefined); }

    var pb = root.querySelector("[data-prev]"), nb = root.querySelector("[data-next]");
    if (pb) pb.addEventListener("click", function () { prev(); poRucnim(); });
    if (nb) nb.addEventListener("click", function () { next(); poRucnim(); });
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
      if (rotator) return;              /* rotátor se přehodí až po puštění */
      track.classList.remove("is-anim");
      track.style.transform = "translateX(" + (drag.base + dx) + "px)";
    }, { passive: false });
    function endDrag() {
      if (!drag) return;
      var d = drag; drag = null;
      root.classList.remove("is-dragging");
      if (d.axis === "x") {
        if (rotator) {
          if (Math.abs(d.dx) > PRAH) go(idx + (d.dx < 0 ? 1 : -1));
        } else {
          var step = slideStep();
          var steps = Math.round(-d.dx / step);
          if (steps === 0 && Math.abs(d.dx) > 40) steps = d.dx < 0 ? 1 : -1;
          steps = Math.max(-n, Math.min(n, steps));
          if (steps === 0) place(true);
          else go(idx + steps);
        }
      }
      poRucnim();
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
     až v den výročí, ne už 1. ledna. Tak jsou zapsané věky členů.
     Uvnitř značky je i slovo, protože čeština ho skloňuje: 1 rok,
     2–4 roky, 5 a víc let. Stejné pravidlo má `tvar_let()` v generátoru. */
  function tvarLet(n) {
    if (n === 1) return "1 rok";
    if (n >= 2 && n <= 4) return n + " roky";
    return n + " let";
  }
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
    if (pocet >= 0) el.textContent = tvarLet(pocet);
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

    /* Stahuje se vždy jen fotka, která je na řadě. Dřív se po načtení
       stránky dotáhla celá sada naráz — na počítači to bylo osm fotek,
       skoro 4 MB, které návštěvník z větší části nikdy neuvidí. Teď se
       vždy předem připraví jen ta následující; má na stažení celou
       pauzu mezi prolnutími (6,5 s), takže střídání vypadá stejně. */
    var dotahniJednu = function (o) {
      if (!o || !o.hasAttribute("data-src")) return;
      if (o.hasAttribute("data-srcset")) { o.srcset = o.getAttribute("data-srcset"); o.removeAttribute("data-srcset"); }
      o.src = o.getAttribute("data-src"); o.removeAttribute("data-src");
    };

    /* Rozjede střídání nad tou sadou, která je zrovna vidět. Volá se
       znovu i při překlopení displeje přes 760 px — druhá sada tehdy
       začíná zase od své první fotky. */
    var rozjedHero = function () {
      if (strida) { clearTimeout(strida); strida = null; }
      var fotky = heroSada();
      if (!fotky.length) return;
      dotahniJednu(fotky[0]);
      dotahniJednu(fotky[1]);
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
          dotahniJednu(fotky[(i + 1) % fotky.length]);
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
    /* Štítek s věkem stojí vpravo na úrovni jména. Když se jméno vejde na
       jeden řádek, srovná ho na střed už mřížka v CSS. Když se zalomí na
       dva (nejužší telefony a dlouhá jména), střed celého bloku už není
       to, co člověk čeká — štítek patří k prvnímu řádku, tak ho tam
       posuneme. Měří se skutečný řádek, ne dopočítaná výška. */
    var srovnejVek = function () {
      if (!dVek || dVek.hidden) return;
      dVek.style.alignSelf = ""; dVek.style.marginTop = "";
      var rozsah = document.createRange();
      rozsah.selectNodeContents(dName);
      var radky = rozsah.getClientRects();
      if (radky.length < 2) return;
      /* Štítek se přisadí k hornímu okraji řádku se jménem a odsadí se
         přesně o rozdíl půlek — dopočítat to jedním výpočtem jde jen
         takhle. Kdyby se nechal na středu, posunul by si měřením sám
         sebe: mřížka totiž střeďuje obě položky navzájem. */
      var vrchJmena = dName.getBoundingClientRect().top;
      var stred = radky[0].top + radky[0].height / 2;
      dVek.style.alignSelf = "start";
      dVek.style.marginTop = Math.round(stred - dVek.offsetHeight / 2 - vrchJmena) + "px";
    };
    window.addEventListener("resize", function () { if (drawer.open) srovnejVek(); });
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
      srovnejVek();
      /* Na počítači se posouvá text, na telefonu celý panel (a v jedné
         šířce i samotné okno) — vynulovat je potřeba všechny tři, jinak
         další člen začne v půlce textu. */
      dInner.scrollTop = 0;
      var dPanel = drawer.querySelector(".drawer-panel");
      if (dPanel) dPanel.scrollTop = 0;
      drawer.scrollTop = 0;
      try { history.replaceState(null, "", "#" + m.id); } catch (e) {}
      planujSousedy();
    };
    var open = function (k) {
      opener = members[k]; fill(k);
      if (!drawer.open) { drawer.showModal(); document.body.classList.add("no-scroll"); }
      /* Zavřený <dialog> se nevykresluje, takže uvnitř `fill()` se řádky
         jména ještě změřit nedají — štítek se srovná až tady. */
      srovnejVek();
    };
    drawer.addEventListener("close", function () {
      clearTimeout(casSousedu); dokonci(); zrusSousedy(); polozZa(0); polozPanel(0);
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

    /* ---- Přejetí prstem po textu = další člen ----
       Nad fotkou si tažení bere karusel (přepíná fotky téhož člena),
       takže tenhle posluchač visí jen na textové části. Vodorovné
       přejetí přehodí na dalšího nebo předchozího člena, svislé se
       nechá být, aby šel text normálně posouvat. Jen pro prst —
       myší se text vybírá, ne posouvá.

       Medailonek se při tažení opravdu posouvá: drží se prstu přesně,
       a po puštění buď doklouže na stranu, kam prst táhl (a z druhé
       strany přijede další člen), nebo se vrátí na místo. Směr sedí s tím, co
       prst dělá — tah doleva posune obsah doleva a odkryje dalšího
       člena, tah doprava předchozího. */
    var posuv = drawer.querySelector(".drawer-inner") || dInner;
    /* Posouvání mezi členy je jedna stránkovaná řada: po obou stranách
       současného medailonku stojí neživé kopie sousedů a jedou s prstem
       spolu s ním. Mezi členy tak nikde neprosvítá pozadí a po puštění
       pohyb jen dojede setrvačností tam, kam prst mířil. Kopie se
       chystají dopředu, hned po otevření medailonku — fotka souseda je
       díky tomu stažená dřív, než na ni přijde řada, takže nic neproblikne. */
    var ZPET = "transform .34s cubic-bezier(.22, .85, .3, 1)";
    var KRIVKA = "cubic-bezier(.17, .84, .34, 1)";   /* dojezd: zpomaluje, nepruží */
    var dotykovy = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    var kopie = { "-1": null, "1": null };
    var casSousedu = null, dobeh = null;

    function sirkaPosuvu() {
      return posuv.getBoundingClientRect().width || window.innerWidth || 320;
    }
    function polozZa(x, prechod) {
      posuv.style.transition = prechod || "none";
      posuv.style.transform = x ? "translate3d(" + Math.round(x) + "px, 0, 0)" : "";
    }
    function uklid(za) {
      setTimeout(function () { posuv.style.transition = ""; posuv.style.willChange = ""; }, za);
    }
    /* Doběh se dá kdykoliv dokončit předčasně — když návštěvník sáhne na
       medailonek dřív, než dojede, nezůstane rozdělaný stav. */
    function dokonci() {
      if (!dobeh) return;
      clearTimeout(dobeh.t);
      var f = dobeh.fn; dobeh = null; f();
    }
    function potom(fn, za) {
      dokonci();
      dobeh = { fn: fn, t: setTimeout(function () { dobeh = null; fn(); }, za) };
    }

    /* Neživá kopie sousedního medailonku: jen obrázek stavu, nereaguje na
       dotyk, čtečka ji přeskočí. Karusel v ní nikdo neoživí, tak v něm
       zůstane jen první fotka. */
    function kopieClena(smer) {
      var m = members[(cur + smer + members.length) % members.length];
      var kop = posuv.cloneNode(true);
      kop.removeAttribute("id");
      kop.setAttribute("aria-hidden", "true");
      kop.querySelectorAll("[id]").forEach(function (e) { e.removeAttribute("id"); });
      var foto = kop.querySelector(".drawer-photo"), prez = kop.querySelector(".drawer-nick"),
          jmeno = kop.querySelector(".drawer-name"), vekEl = kop.querySelector(".drawer-vek"),
          bioEl = kop.querySelector(".drawer-bio"), telo = kop.querySelector(".drawer-body");
      var sablona = m.querySelector("template.m-velke");
      var ph = sablona ? sablona.content.firstElementChild.cloneNode(true)
                       : m.querySelector(".m-photo").cloneNode(true);
      ph.querySelectorAll("img").forEach(function (im) { im.removeAttribute("loading"); });
      var drah = ph.querySelector(".car-track");
      if (drah) {
        while (drah.children.length > 1) drah.removeChild(drah.lastChild);
        drah.style.setProperty("--n", 1);
        drah.style.transform = "none";
      }
      /* Tečky v kopii jsou jen nakreslené — tolik, kolik má soused fotek,
         první zvýrazněná. Bez nich by se během posouvání pod fotkou
         střídavě objevovaly a mizely. */
      var tecky = ph.querySelector(".car-dots");
      if (tecky) {
        var pocet = sablona ? sablona.content.querySelectorAll(".car-slide").length : 0;
        tecky.innerHTML = "";
        for (var d = 0; d < pocet; d++) {
          var b = document.createElement("button");
          b.type = "button"; b.tabIndex = -1; b.setAttribute("aria-hidden", "true");
          if (d === 0) b.setAttribute("aria-current", "true");
          tecky.appendChild(b);
        }
      }
      if (foto) { foto.innerHTML = ""; foto.appendChild(ph); }
      if (prez) { prez.textContent = m.dataset.nick ? "„" + m.dataset.nick + "“" : ""; prez.hidden = !m.dataset.nick; }
      if (jmeno) jmeno.textContent = m.dataset.name;
      if (bioEl) {
        bioEl.innerHTML = m.querySelector(".member-bio").innerHTML;
        var vek = bioEl.querySelector(".m-vek");
        if (vekEl) {
          vekEl.innerHTML = vek ? vek.innerHTML : ""; vekEl.hidden = !vek;
          vekEl.style.alignSelf = ""; vekEl.style.marginTop = "";
          prepocitejLeta(vekEl);
        }
        if (vek) vek.remove();
        prepocitejLeta(bioEl);
      }
      if (telo) telo.scrollTop = 0;
      /* Kopie je mimo dosah dotyku i klávesnice — čtečka ani tabulátor
         do ní nevlezou. */
      if ("inert" in HTMLElement.prototype) kop.inert = true;
      kop.querySelectorAll("a, button, input, textarea, select, [tabindex]")
         .forEach(function (e) { e.setAttribute("tabindex", "-1"); });
      kop.style.position = "absolute";
      kop.style.left = "0";
      kop.style.width = "100%";
      kop.style.pointerEvents = "none";
      kop.style.transition = "none";
      return kop;
    }
    function pripravSousedy() {
      if (members.length < 2 || !drawer.open) return;
      var ramec = posuv.parentNode;
      /* Kopie visí ve stejné souřadnici jako panel, takže se posouvají
         i při svislém rolování spolu s ním. Delší medailonek souseda se
         usekne na výšku panelu (`max-height`, ne `height` — při pevné
         výšce by se mřížka uvnitř roztáhla a fotka by ujela níž). */
      var vrch = posuv.offsetTop, vyska = posuv.offsetHeight;
      [-1, 1].forEach(function (smer) {
        if (kopie[smer]) return;
        var kop = kopieClena(smer);
        kop.style.top = vrch + "px";
        kop.style.maxHeight = vyska + "px";
        kop.style.overflow = "hidden";
        /* Dokud se netáhne, kopie čekají schované přesně na panelu:
           fotky se jim stáhnou dopředu, ale nic nepřesahuje ven, takže
           panelu nenaroste šířka rolování. Na stranu se postaví až
           v okamžiku, kdy je prst potřebuje. */
        kop.style.visibility = "hidden";
        kop.style.transform = "translate3d(0, 0, 0)";
        ramec.appendChild(kop);
        kopie[smer] = kop;
      });
    }
    function probudSousedy() {
      var sirka = sirkaPosuvu();
      [-1, 1].forEach(function (smer) {
        var k = kopie[smer];
        if (!k) return;
        k.style.visibility = "";
        k.style.transition = "none";
        k.style.transform = "translate3d(" + Math.round(smer * sirka) + "px, 0, 0)";
      });
    }
    function uspiSousedy() {
      [-1, 1].forEach(function (smer) {
        var k = kopie[smer];
        if (!k) return;
        k.style.transition = "none";
        k.style.transform = "translate3d(0, 0, 0)";
        k.style.visibility = "hidden";
      });
    }
    function zrusSousedy() {
      [-1, 1].forEach(function (smer) {
        var k = kopie[smer];
        if (k && k.parentNode) k.parentNode.removeChild(k);
        kopie[smer] = null;
      });
    }
    /* Sousedé se chystají až chvíli po přepnutí — v tu dobu se nikam
       nespěchá a příprava se tak nepotká s rozjetou animací. Na myši
       nemají smysl, tam se prstem netáhne. */
    function planujSousedy() {
      clearTimeout(casSousedu);
      zrusSousedy();
      if (!dotykovy || reduce || members.length < 2) return;
      casSousedu = setTimeout(pripravSousedy, 280);
    }
    function posunVse(x, prechod) {
      polozZa(x, prechod);
      var sirka = sirkaPosuvu();
      [-1, 1].forEach(function (smer) {
        var k = kopie[smer];
        if (!k) return;
        k.style.transition = prechod || "none";
        k.style.transform = "translate3d(" + Math.round(x + smer * sirka) + "px, 0, 0)";
      });
    }
    /* smer: +1 = další člen (prst šel doleva), -1 = předchozí.
       `odkud` je místo, kde prst skončil, `rychlost` jeho tempo v px/ms —
       z toho se spočítá doba dojezdu, aby obsah plynule pokračoval tam,
       kam ho prst poslal, místo aby se zasekl a rozjel znovu. */
    function prepni(smer, odkud, rychlost) {
      if (reduce || members.length < 2) { zrusSousedy(); fill(cur + smer); polozZa(0); return; }
      pripravSousedy(); probudSousedy();
      /* Kopie na odvrácené straně už není k čemu; ta cílová dojede přesně
         na místo, kde ji pak vystřídá skutečný panel se stejným obsahem. */
      var zpet = kopie[-smer];
      if (zpet && zpet.parentNode) zpet.parentNode.removeChild(zpet);
      kopie[-smer] = null;
      var sirka = sirkaPosuvu();
      odkud = odkud || 0;
      var cil = -smer * sirka;
      var zbyva = Math.abs(cil - odkud);
      var doba = Math.max(190, Math.min(430, zbyva / Math.max(rychlost || 0, 0.6)));
      posunVse(cil, "transform " + Math.round(doba) + "ms " + KRIVKA);
      potom(function () {
        fill(cur + smer);
        polozZa(0);
        posuv.getBoundingClientRect();   /* vykreslit dřív, než kopie zmizí */
        zrusSousedy();
        uklid(0);
        planujSousedy();
      }, doba + 30);
    }
    function vratZpet() {
      posunVse(0, reduce ? "none" : ZPET);
      potom(function () {
        posuv.style.transition = ""; posuv.style.willChange = "";
        uspiSousedy();
      }, 360);
    }

    var tX = 0, tY = 0, tSmer = 0, tCas = 0, tahne = false, tZaklad = 0;
    dInner.addEventListener("touchstart", function (e) {
      dokonci();
      if (e.touches.length !== 1) { tSmer = -1; return; }
      tX = e.touches[0].clientX; tY = e.touches[0].clientY;
      tSmer = 0; tCas = Date.now(); tahne = false; tZaklad = 0;
      posuv.style.transition = "none";
      posuv.style.willChange = "transform";
      if (!kopie[1]) pripravSousedy();
    }, { passive: true });
    dInner.addEventListener("touchmove", function (e) {
      if (tSmer === -1 || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - tX, dy = e.touches[0].clientY - tY;
      /* O směru se rozhodne jednou, hned na začátku pohybu, ať se
         gesto v půlce nepřeklápí. Práh se odečte, aby obsah vyjel
         od nuly a neuskočil o těch pár pixelů, než bylo jasno. */
      if (tSmer === 0 && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        tSmer = Math.abs(dx) > Math.abs(dy) * 1.4 ? 1 : -1;
        if (tSmer === 1) { tZaklad = dx; tCas = Date.now(); pripravSousedy(); probudSousedy(); }
      }
      if (tSmer !== 1) return;
      tahne = true;
      /* Obsah jde přesně s prstem — žádné zpomalení ani stmívání. */
      posunVse(dx - tZaklad);
    }, { passive: true });
    dInner.addEventListener("touchend", function (e) {
      var bylTah = tahne, bylSmer = tSmer;
      tSmer = 0; tahne = false;
      if (bylSmer !== 1 || !bylTah) { posuv.style.willChange = ""; return; }
      var dot = e.changedTouches && e.changedTouches[0];
      if (!dot) { vratZpet(); return; }
      var dx = dot.clientX - tX - tZaklad, sirka = sirkaPosuvu();
      /* Přehodí se buď po dost dlouhém tažení, nebo po krátkém, ale
         svižném mrsknutí. */
      var rychlost = Math.abs(dx) / Math.max(1, Date.now() - tCas);
      if (Math.abs(dx) >= Math.min(110, Math.max(48, sirka * 0.18)) ||
          (rychlost > 0.4 && Math.abs(dx) > 20)) prepni(dx < 0 ? 1 : -1, dx, rychlost);
      else vratZpet();
    }, { passive: true });
    dInner.addEventListener("touchcancel", function () {
      if (tahne) vratZpet(); else posuv.style.willChange = "";
      tSmer = 0; tahne = false;
    }, { passive: true });
    window.addEventListener("resize", function () { if (drawer.open) planujSousedy(); });
    /* Prohlížeč tak ví, že vodorovné gesto patří stránce, ne posouvání. */
    dInner.style.touchAction = "pan-y pinch-zoom";

    /* ---- Stažení prstem dolů = zavřít medailonek ----
       Posluchač visí na celém panelu, takže gesto funguje i nad fotkou,
       ne jen nad textem. Začne se **jen když je medailonek úplně nahoře** —
       jinak by se místo posouvání textu zavíral. Kontrolují se všechny tři
       plochy, které se podle šířky okna posouvají (panel, text i samotné
       okno dialogu). Vodorovné gesto si bere přepínání členů a karusel
       fotek, takže se tu bere jen tah dolů. */
    var panel = posuv.parentNode;
    var zX = 0, zY = 0, zSmer = 0, zCas = 0, zTahne = false, zNahore = false;
    var ZAVRIT = "transform .3s cubic-bezier(.3, .7, .4, 1)";

    function nahore() {
      return (panel.scrollTop || 0) <= 0 && (drawer.scrollTop || 0) <= 0
          && (dInner.scrollTop || 0) <= 0;
    }
    function polozPanel(y, prechod) {
      panel.style.transition = prechod || "none";
      panel.style.transform = y ? "translate3d(0, " + Math.round(y) + "px, 0)" : "";
    }
    function zavriTahem(odkud, rychlost) {
      if (reduce) { polozPanel(0); drawer.close(); return; }
      var cil = (window.innerHeight || panel.offsetHeight) + 40;
      var doba = Math.max(160, Math.min(320, (cil - odkud) / Math.max(rychlost || 0, 1.2)));
      polozPanel(cil, "transform " + Math.round(doba) + "ms cubic-bezier(.3, .7, .4, 1)");
      setTimeout(function () {
        drawer.close();
        polozPanel(0);
        panel.style.transition = "";
      }, doba);
    }

    panel.addEventListener("touchstart", function (e) {
      if (!drawer.open || e.touches.length !== 1) { zSmer = -1; return; }
      zX = e.touches[0].clientX; zY = e.touches[0].clientY;
      zSmer = 0; zCas = Date.now(); zTahne = false;
      zNahore = nahore();
      panel.style.transition = "none";
    }, { passive: true });
    panel.addEventListener("touchmove", function (e) {
      if (zSmer === -1 || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - zX, dy = e.touches[0].clientY - zY;
      /* O směru se rozhodne jednou, hned na začátku pohybu. */
      if (zSmer === 0 && (Math.abs(dx) > 10 || Math.abs(dy) > 10))
        zSmer = (zNahore && dy > 0 && dy > Math.abs(dx) * 1.4) ? 1 : -1;
      if (zSmer !== 1) return;
      zTahne = true;
      /* Práh se odečte, ať panel vyjede od nuly a neuskočí. */
      polozPanel(Math.max(0, dy - 10));
    }, { passive: true });
    panel.addEventListener("touchend", function (e) {
      var bylTah = zTahne, bylSmer = zSmer;
      zSmer = 0; zTahne = false;
      if (bylSmer !== 1 || !bylTah) return;
      var dot = e.changedTouches && e.changedTouches[0];
      var dy = dot ? Math.max(0, dot.clientY - zY - 10) : 0;
      var rychlost = dy / Math.max(1, Date.now() - zCas);
      /* Zavře se po dost dlouhém stažení, nebo po krátkém mrsknutí dolů. */
      var prah = Math.min(180, Math.max(90, panel.offsetHeight * 0.22));
      if (dy >= prah || (rychlost > 0.5 && dy > 30)) zavriTahem(dy, rychlost);
      else polozPanel(0, reduce ? "none" : ZAVRIT);
    }, { passive: true });
    panel.addEventListener("touchcancel", function () {
      if (zTahne) polozPanel(0, reduce ? "none" : ZAVRIT);
      zSmer = 0; zTahne = false;
    }, { passive: true });
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
      var email = form.elements.email, msg = form.elements.message;
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
