/* Varu app state — localStorage prototype */
(function () {
  const KEY = "varu.v1";

  function seedState() {
    return {
      islands: JSON.parse(JSON.stringify(VARU_SEED.islands)),
      plans: JSON.parse(JSON.stringify(VARU_SEED.plans)),
      users: [
        {
          id: "u-admin",
          name: "Master Admin",
          email: "admin@varu.mv",
          phone: "7992400",
          password: "varuadmin",
          role: "admin",
          island: "fuvahmulah",
          plan: "plus",
          verified: { email: true, phone: true }
        },
        {
          id: "u-demo",
          name: "Mariyam Nala",
          email: "nala@varu.mv",
          phone: "7901122",
          password: "nala123",
          role: "member",
          island: "fuvahmulah",
          plan: "household",
          verified: { email: true, phone: true }
        }
      ],
      vendors: [
        { id: "v1", name: "Fuvahmulah Fresh", island: "fuvahmulah", cats: "groceries", status: "live" },
        { id: "v2", name: "KUDA BOH", island: "fuvahmulah", cats: "kids", status: "live" },
        { id: "v3", name: "Addu Baby House", island: "hithadhoo", cats: "kids", status: "live" },
        { id: "v4", name: "Hulhumalé Chemist", island: "hulhumale", cats: "beauty", status: "live" }
      ],
      session: null,
      cart: [],
      island: "fuvahmulah",
      orders: [
        { id: "ORD-1042", user: "Mariyam Nala", island: "fuvahmulah", total: 412, status: "Out for delivery" },
        { id: "ORD-1041", user: "Ahmed Ziyad", island: "hithadhoo", total: 188, status: "Packed" }
      ],
      inbox: [],
      settings: {
        adminEmail: (window.VARU_CONFIG && VARU_CONFIG.adminEmail) || "admin@varu.mv"
      }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const s = seedState();
        save(s);
        return s;
      }
      const parsed = JSON.parse(raw);
      const fresh = seedState();
      parsed.settings = Object.assign({}, fresh.settings, parsed.settings || {});
      parsed.inbox = parsed.inbox || [];
      return parsed;
    } catch (e) {
      return seedState();
    }
  }

  function save(s) {
    localStorage.setItem(KEY, JSON.stringify(s));
  }

  const state = load();

  window.Varu = {
    state,
    save() { save(state); },
    reset() { localStorage.removeItem(KEY); location.reload(); },
    toast(msg) {
      let el = document.querySelector(".toast");
      if (!el) {
        el = document.createElement("div");
        el.className = "toast";
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 2400);
    },
    mvr(n) { return "MVR " + Number(n).toLocaleString("en-MV"); },
    islandById(id) { return state.islands.find((i) => i.id === id); },
    liveIslands() { return state.islands.filter((i) => i.status === "live"); },
    planById(id) { return state.plans.find((p) => p.id === id); },
    currentUser() {
      if (!state.session) return null;
      return state.users.find((u) => u.id === state.session);
    },
    setIsland(id) {
      state.island = id;
      const u = this.currentUser();
      if (u) u.island = id;
      save(state);
    },
    stockOn(product, islandId) {
      const v = product.stock && product.stock[islandId];
      return v || null;
    },
    productsFor(islandId, cat, q) {
      return VARU_SEED.products.filter((p) => {
        const avail = this.stockOn(p, islandId);
        if (!avail) return false;
        if (cat && cat !== "all" && p.cat !== cat) return false;
        if (q && !`${p.name} ${p.brand}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      });
    },
    servicesFor(islandId, cat) {
      return VARU_SEED.services.filter((s) => {
        if (!s.islands.includes(islandId)) return false;
        if (cat && cat !== "all" && s.cat !== cat) return false;
        return true;
      });
    },
    memberPrice(p) {
      const u = this.currentUser();
      return u && u.plan ? p.member : p.price;
    },
    cartCount() { return state.cart.reduce((n, i) => n + i.qty, 0); },
    cartTotal() {
      return state.cart.reduce((n, i) => {
        const p = VARU_SEED.products.find((x) => x.id === i.id);
        return n + (p ? this.memberPrice(p) * i.qty : 0);
      }, 0);
    },
    addToCart(id) {
      const u = this.currentUser();
      if (!u) {
        this.toast("Create an account to order");
        setTimeout(() => (location.href = "register.html"), 700);
        return;
      }
      const row = state.cart.find((c) => c.id === id);
      if (row) row.qty += 1;
      else state.cart.push({ id, qty: 1 });
      save(state);
      this.toast("Added to basket");
      this.refreshBadges();
    },
    setQty(id, qty) {
      if (qty <= 0) state.cart = state.cart.filter((c) => c.id !== id);
      else {
        const row = state.cart.find((c) => c.id === id);
        if (row) row.qty = qty;
      }
      save(state);
    },
    login(email, password) {
      const u = state.users.find(
        (x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password
      );
      if (!u) return { ok: false, error: "Email or password is not right." };
      state.session = u.id;
      state.island = u.island || state.island;
      save(state);
      return { ok: true, user: u };
    },
    logout() {
      state.session = null;
      save(state);
      location.href = "index.html";
    },
    register(draft) {
      const exists = state.users.some(
        (u) => u.email.toLowerCase() === draft.email.toLowerCase() || u.phone === draft.phone
      );
      if (exists) return { ok: false, error: "That email or phone is already on Varu." };
      const user = {
        id: "u-" + Date.now(),
        name: draft.name,
        email: draft.email,
        phone: draft.phone,
        password: draft.password,
        role: "member",
        island: draft.island,
        plan: draft.plan,
        verified: { email: true, phone: true }
      };
      state.users.push(user);
      state.session = user.id;
      state.island = user.island;
      save(state);
      return { ok: true, user };
    },
    requireAdmin() {
      const u = this.currentUser();
      if (!u || u.role !== "admin") {
        location.href = "login.html";
        return null;
      }
      return u;
    },
    upsertIsland(island) {
      const i = state.islands.findIndex((x) => x.id === island.id);
      if (i >= 0) state.islands[i] = { ...state.islands[i], ...island };
      else state.islands.push({ shops: 0, delivery: island.status === "live", ...island });
      save(state);
    },
    setPlanPrice(id, price) {
      const p = state.plans.find((x) => x.id === id);
      if (p) { p.price = Number(price); save(state); }
    },
    setAdminEmail(email) {
      state.settings = state.settings || {};
      state.settings.adminEmail = email.trim();
      save(state);
    },
    refreshBadges() {
      document.querySelectorAll("[data-cart-count]").forEach((el) => {
        el.textContent = this.cartCount();
      });
    },
    fillIslandSelect(sel, includeAll) {
      if (!sel) return;
      const cur = state.island;
      const opts = includeAll
        ? state.islands
        : state.islands.filter((i) => i.status === "live" || i.id === cur);
      sel.innerHTML = opts.map((i) => {
        const tag = i.status === "live" ? "" : ` (${i.status})`;
        return `<option value="${i.id}" ${i.id === cur ? "selected" : ""}>${i.name}, ${i.atoll}${tag}</option>`;
      }).join("");
    }
  };

  document.addEventListener("DOMContentLoaded", () => Varu.refreshBadges());
})();
