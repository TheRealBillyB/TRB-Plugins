/* TRB checkout: Paddle.js overlay. Settings live in checkout-config.js (environment, token, price IDs).
   custom_data sent with every checkout (read by TRB_SupportBot from the transaction.completed webhook):
     discord_id  buyer's Discord user ID (licences are added to this account)
     game        ASE | ASA
     product     neutral product key from the config (the plugin name comes from the price's own custom_data)
     src         "site-checkout", v: 1
   The page also opens a checkout from a payment link (?_ptxn=txn_...): Paddle.js does that on Initialize. */
(function () {
  "use strict";
  var C = window.TRB_CHECKOUT || {}, env = C.environment === "live" ? "live" : "sandbox";
  var token = (C.tokens || {})[env] || "";
  var $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search);
  var products = Object.keys(C.products || {}).filter(function (k) {
    var p = C.products[k]; return p && (p.prices || {})[env] && (p.listed !== false || qs.get("p") === k);
  });
  var form = $("co-form"), go = $("co-go"), err = $("co-err");
  var DISCORD = /^[0-9]{17,20}$/, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (env === "sandbox") $("co-test").classList.remove("d-none");
  if (!token || !window.Paddle) { $("co-off").classList.remove("d-none"); return; }

  function showErr(t) { err.textContent = t; err.classList.toggle("d-none", !t); }
  function cur() { return C.products[$("co-product").value]; }
  function priceId() { return cur().prices[env]; }
  function qty() { var n = parseInt($("co-qty").value, 10); return isNaN(n) ? 1 : n; }

  function done(data) {
    form.classList.add("d-none");
    $("co-ref").textContent = (data && (data.transaction_id || data.id)) || "-";
    $("co-done").classList.remove("d-none");
    if (C.successUrl) location.href = C.successUrl;
  }

  try {
    if (env === "sandbox") Paddle.Environment.set("sandbox");
    Paddle.Initialize({
      token: token,
      checkout: { settings: { displayMode: "overlay", theme: "dark", locale: "en", allowLogout: false } },
      eventCallback: function (ev) {
        if (!ev || !ev.name) return;
        if (C.debug && window.console) console.log("checkout event", ev.name, ev.data && ev.data.status);
        if (ev.name === "checkout.completed") done(ev.data);
        if (ev.name === "checkout.error") showErr("The checkout hit a problem. Please try again, or ask in #support.");
      }
    });
  } catch (e) { $("co-off").classList.remove("d-none"); return; }

  if (qs.get("_ptxn")) return;                          // payment link: Paddle.js opens that transaction itself
  if (!products.length) { $("co-off").classList.remove("d-none"); return; }

  products.forEach(function (k) {
    var o = document.createElement("option"); o.value = k; o.textContent = C.products[k].label || k;
    $("co-product").appendChild(o);
  });
  var want = qs.get("p") || C.defaultProduct;
  if (products.indexOf(want) >= 0) $("co-product").value = want;

  function fillProduct() {
    var p = cur(), g = $("co-game"), wantG = (qs.get("game") || "").toUpperCase();
    $("co-blurb").textContent = p.blurb || "";
    g.innerHTML = "";
    (p.games || ["ASE", "ASA"]).forEach(function (x) {
      var o = document.createElement("option"); o.value = x; o.textContent = x; g.appendChild(o);
    });
    if (wantG && (p.games || []).indexOf(wantG) >= 0) g.value = wantG;
    $("co-qty").max = p.maxQty || 10;
    price();
  }

  var seq = 0;
  function price() {
    var n = Math.max(1, Math.min(qty(), cur().maxQty || 10)), my = ++seq;
    go.disabled = true; go.textContent = "Loading\u2026"; $("co-price").textContent = "";
    Paddle.PricePreview({ items: [{ priceId: priceId(), quantity: n }] }).then(function (r) {
      if (my !== seq) return;
      var li = r.data.details.lineItems[0], t = li.formattedTotals;
      $("co-price").textContent = n + (n === 1 ? " licence: " : " licences: ") + t.subtotal +
        (li.price.taxMode === "internal" ? " incl. tax" : " + tax where it applies");
      go.disabled = false; go.textContent = "Continue to payment";
    }).catch(function (e) {
      if (window.console) console.warn("price preview failed", e);
      if (my !== seq) return;
      go.disabled = false; go.textContent = "Continue to payment";
    });
  }

  function valid() {
    var ok = true, d = $("co-discord"), e = $("co-email"), t = $("co-terms");
    d.value = d.value.replace(/\D/g, "");
    [[d, DISCORD.test(d.value)], [e, !e.value || EMAIL.test(e.value.trim())], [t, t.checked],
     [$("co-qty"), qty() >= 1 && qty() <= (cur().maxQty || 10)]].forEach(function (x) {
      x[0].classList.toggle("is-invalid", !x[1]); ok = ok && x[1];
    });
    return ok;
  }

  $("co-product").addEventListener("change", fillProduct);
  $("co-qty").addEventListener("change", price);
  form.addEventListener("submit", function (ev) {
    ev.preventDefault(); showErr("");
    if (!valid()) return;
    var email = $("co-email").value.trim(), opts = {
      items: [{ priceId: priceId(), quantity: qty() }],
      customData: { discord_id: $("co-discord").value, game: $("co-game").value, product: $("co-product").value,
                    src: "site-checkout", v: 1 },
      settings: { displayMode: "overlay", theme: "dark", locale: "en" }
    };
    if (email) opts.customer = { email: email };
    if (C.successUrl) opts.settings.successUrl = C.successUrl;
    Paddle.Checkout.open(opts);
  });

  form.classList.remove("d-none");
  fillProduct();
})();
