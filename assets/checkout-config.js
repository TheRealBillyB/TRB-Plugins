/* Checkout settings. The only file to edit when switching sandbox -> live or adding a product.
   Client-side tokens are public by design (they can only open checkouts and show prices); never put an API key here.
   environment: "sandbox" (test cards, no real money) or "live".
   products: key -> what the page shows. Keys are neutral so a product isn't named publicly before launch;
   the plugin name is read by the support bot from the price's custom_data. */
window.TRB_CHECKOUT = {
  environment: "sandbox",
  tokens: {
    sandbox: "test_d7599658e2b43684d9aff5b435f",
    live: ""                      /* live_... client-side token, created after the live account is approved */
  },
  debug: false,                   /* true = log checkout events to the browser console */
  successUrl: "",                 /* "" = stay on this page and show the thank-you panel */
  defaultProduct: "p1",
  products: {
    p1: {
      label: "Paid plugin",       /* public name; keep generic until launch */
      blurb: "Perpetual licence, 1 server machine per licence.",
      prices: { sandbox: "pri_01m696e7f6yjfb76hc7mm31k4h", live: "" },
      games: ["ASE", "ASA"],
      maxQty: 10,
      listed: true
    }
  }
};
