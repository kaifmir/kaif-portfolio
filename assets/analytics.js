/* Google Analytics 4 for the portfolio.
   One file, included on every page. Tracks: visits + traffic source (incl. ?ref=),
   case study card clicks, every link click by type, scroll depth, reading time,
   and slide progress on the story / deck pages.

   Your own visits: open any page once with ?ga_me=1 to stop counting yourself on
   that browser (?ga_me=0 to undo). Localhost never sends data unless ?ga_debug=1. */
(function () {
  var GA_ID = "G-B3QNJWM37Y";
  if (!/^G-[A-Z0-9]{6,}$/.test(GA_ID) || GA_ID === "G-XXXXXXXXXX") return;

  var qs = new URLSearchParams(location.search);
  var store = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  if (qs.get("ga_me") === "1") store("ga_me", "1");
  if (qs.get("ga_me") === "0") store("ga_me", null);
  if (store("ga_me") === "1") return;

  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var debug = qs.get("ga_debug") === "1";
  if (local && !debug) return;

  // ?ref=acme-recruiter on a link you share sticks for the whole visit
  var ref = qs.get("ref");
  try { if (ref) sessionStorage.setItem("ga_ref", ref); else ref = sessionStorage.getItem("ga_ref"); } catch (e) {}

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());

  var page = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  var cfg = { page_type: page === "index" ? "home" : "case_study" };
  if (ref) cfg.ref = ref;
  if (debug) cfg.debug_mode = true;
  gtag("config", GA_ID, cfg);
  if (ref) gtag("set", "user_properties", { ref: ref });

  function send(name, params) {
    params = params || {};
    params.page_name = page;
    gtag("event", name, params);
  }

  // Clicks
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    var url = a.href;
    var text = (a.innerText || a.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 100);
    var section = a.closest("section[id], [id]");

    var card = a.closest(".case");
    if (card) {
      var cards = Array.prototype.slice.call(document.querySelectorAll(".case"));
      var chip = card.querySelector(".chip");
      send("case_study_click", {
        case_name: chip ? chip.textContent.trim() : href,
        case_position: cards.indexOf(card) + 1,
        link_url: url
      });
      return;
    }

    var type = "internal";
    if (/^mailto:/i.test(href)) type = "email";
    else if (/^tel:/i.test(href)) type = "phone";
    else if (/linkedin\.com/i.test(url)) type = "linkedin";
    else if (/\.pdf($|\?)/i.test(url) || /resume|\bcv\b/i.test(text)) type = "resume";
    else if (href.charAt(0) === "#") type = "anchor";
    else if (a.host && a.host !== location.host) type = "outbound";

    send(type === "email" || type === "linkedin" || type === "phone" ? "contact_click" : "link_click", {
      link_type: type,
      link_text: text,
      link_url: url,
      section: section ? section.id : ""
    });
  }, true);

  // Scroll depth
  var marks = [25, 50, 75, 100], hit = {};
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (max < 200) return;
    var pct = Math.round((h.scrollTop || document.body.scrollTop) / max * 100);
    marks.forEach(function (m) { if (pct >= m - 2 && !hit[m]) { hit[m] = 1; send("scroll_depth", { percent: m }); } });
  }
  addEventListener("scroll", function () { clearTimeout(onScroll.t); onScroll.t = setTimeout(onScroll, 200); }, { passive: true });

  // Reading time (only counts while the tab is visible)
  var seen = 0, steps = [30, 60, 120, 300, 600], done = {};
  setInterval(function () {
    if (document.visibilityState !== "visible") return;
    seen += 5;
    steps.forEach(function (t) { if (seen >= t && !done[t]) { done[t] = 1; send("read_time", { seconds: t }); } });
  }, 5000);

  // Slide progress on story / deck pages (they change the hash with replaceState)
  var lastSlide = null, maxSlide = 0;
  function slideNow() { var m = location.hash.match(/^#(\d+)$/); return m ? +m[1] : null; }
  function checkSlide() {
    var n = slideNow();
    if (n === null || n === lastSlide) return;
    lastSlide = n;
    if (n > maxSlide) maxSlide = n;
    send("slide_view", { slide: n });
  }
  setInterval(checkSlide, 800);
  addEventListener("hashchange", checkSlide);
  addEventListener("pagehide", function () {
    if (maxSlide) send("story_exit", { max_slide: maxSlide });
  });
})();
