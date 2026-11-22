(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Dark / light mode toggle ---------- */
  var themeBtn = document.getElementById("theme-toggle");

  function syncThemeButton() {
    var isDark = root.getAttribute("data-theme") === "dark";
    themeBtn.setAttribute("aria-pressed", String(!isDark));
    themeBtn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  }

  themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    syncThemeButton();
    drawChart(1);
  });
  syncThemeButton();

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById("menu-toggle");
  var nav = document.getElementById("site-nav");

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  menuBtn.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
  nav.addEventListener("click", function (e) { if (e.target.tagName === "A") setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* ---------- Project filter ---------- */
  var filters = document.querySelectorAll(".filter");
  var projects = document.querySelectorAll(".project");
  var status = document.getElementById("filter-status");

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cat = btn.getAttribute("data-filter");
      var shown = 0;
      filters.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      projects.forEach(function (p) {
        var match = cat === "all" || p.getAttribute("data-cat") === cat;
        p.hidden = !match;
        if (match) shown++;
      });
      status.textContent = "Showing " + shown + " " + (shown === 1 ? "project" : "projects") + (cat === "all" ? "" : " in " + cat);
    });
  });

  /* ---------- Scroll reveal + count-up numbers ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (reduceMotion) { el.textContent = target; return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        entry.target.querySelectorAll("[data-count]").forEach(countUp);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
    counters.forEach(countUp);
  }

  /* ---------- Highlight current section in nav ---------- */
  var links = document.querySelectorAll(".site-nav a");
  var sections = Array.prototype.map.call(links, function (a) { return document.querySelector(a.getAttribute("href")); });
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          var current = a.getAttribute("href") === "#" + entry.target.id;
          a.classList.toggle("is-current", current);
          if (current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { if (s) spy.observe(s); });
  }

  /* ---------- Hero chart (decorative, drawn on canvas) ---------- */
  var canvas = document.getElementById("hero-chart");
  var ctx = canvas.getContext("2d");
  var points = [];

  // Deterministic pseudo-random series so the chart looks the same on every load
  (function buildSeries() {
    var seed = 7, v = 0.35;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 70; i++) {
      v += (rnd() - 0.42) * 0.07;
      v = Math.max(0.12, Math.min(0.88, v));
      points.push(v);
    }
  })();

  function css(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var r = canvas.getBoundingClientRect();
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawChart(progress) {
    var w = canvas.getBoundingClientRect().width;
    var h = canvas.getBoundingClientRect().height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    var accent = css("--accent"), accent2 = css("--accent-2"), grid = css("--border");

    // horizontal guide lines
    ctx.strokeStyle = grid; ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
    for (var g = 1; g < 6; g++) {
      var gy = (h / 6) * g;
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    var n = Math.max(2, Math.floor(points.length * progress));
    var padTop = h * 0.15, usable = h * 0.7;
    function X(i) { return (i / (points.length - 1)) * w; }
    function Y(i) { return padTop + (1 - points[i]) * usable; }

    // area
    var area = ctx.createLinearGradient(0, 0, 0, h);
    area.addColorStop(0, accent); area.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.18; ctx.fillStyle = area;
    ctx.beginPath(); ctx.moveTo(X(0), h);
    for (var i = 0; i < n; i++) ctx.lineTo(X(i), Y(i));
    ctx.lineTo(X(n - 1), h); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    // line
    var line = ctx.createLinearGradient(0, 0, w, 0);
    line.addColorStop(0, accent); line.addColorStop(1, accent2);
    ctx.strokeStyle = line; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.shadowColor = accent; ctx.shadowBlur = 14;
    ctx.beginPath();
    for (var j = 0; j < n; j++) { if (j === 0) ctx.moveTo(X(j), Y(j)); else ctx.lineTo(X(j), Y(j)); }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // end dot
    ctx.fillStyle = accent2;
    ctx.beginPath(); ctx.arc(X(n - 1), Y(n - 1), 6, 0, Math.PI * 2); ctx.fill();
  }

  function animateChart() {
    if (reduceMotion) { drawChart(1); return; }
    var start = null, dur = 2600;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      drawChart(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); drawChart(1); }, 120);
  });

  resize();
  animateChart();

  /* ---------- Footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
