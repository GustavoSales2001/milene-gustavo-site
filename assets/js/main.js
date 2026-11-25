(() => {
  const cfg = window.WEDDING_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const money = value => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  window.addEventListener("load", () => setTimeout(() => $("#preloader")?.classList.add("done"), 450));

  const menu = $("#nav"), toggle = $("#menuToggle");
  const topbar = $(".topbar");
  const updateTopbar = () => topbar?.classList.toggle("scrolled", window.scrollY > 36);
  updateTopbar();
  window.addEventListener("scroll", updateTopbar, { passive: true });
  toggle?.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  });
  menu?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    menu.classList.remove("open"); toggle?.setAttribute("aria-expanded", "false");
  }));

  const target = new Date(cfg.weddingDate || "2027-12-04T15:00:00-03:00").getTime();
  function tick() {
    let diff = Math.max(0, target - Date.now());
    const days = Math.floor(diff / 86400000); diff %= 86400000;
    const hours = Math.floor(diff / 3600000); diff %= 3600000;
    const mins = Math.floor(diff / 60000); const secs = Math.floor((diff % 60000) / 1000);
    [["#days", days, 3], ["#hours", hours, 2], ["#minutes", mins, 2], ["#seconds", secs, 2]].forEach(([id, n, pad]) => { const el = $(id); if (el) el.textContent = String(n).padStart(pad, "0"); });
  }
  tick(); setInterval(tick, 1000);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
  } else document.querySelectorAll(".reveal").forEach(el => el.classList.add("visible"));

  const lightbox = $("#photoLightbox"), lightboxImage = $("#lightboxImage");
  const galleryPhotos = [...document.querySelectorAll(".gallery-photo")];
  let activePhoto = 0;
  function showPhoto(index) {
    activePhoto = (index + galleryPhotos.length) % galleryPhotos.length;
    const button = galleryPhotos[activePhoto], img = $("img", button);
    lightboxImage.src = button.dataset.full; lightboxImage.alt = img.alt;
    $("#lightboxCaption").textContent = `${img.alt} · ${activePhoto + 1} de ${galleryPhotos.length}`;
  }
  galleryPhotos.forEach((button, index) => button.addEventListener("click", () => {
    showPhoto(index); lightbox.showModal(); $("#photoLightbox .lightbox-close")?.focus();
  }));
  $("#lightboxPrev")?.addEventListener("click", () => showPhoto(activePhoto - 1));
  $("#lightboxNext")?.addEventListener("click", () => showPhoto(activePhoto + 1));
  lightbox?.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") showPhoto(activePhoto - 1);
    if (event.key === "ArrowRight") showPhoto(activePhoto + 1);
  });
  $(".lightbox-close")?.addEventListener("click", () => lightbox.close());
  lightbox?.addEventListener("click", event => { if (event.target === lightbox) lightbox.close(); });

  const mapButton = $("#showMap"), mapFrame = $("#mapPreview iframe"), mapPreview = $("#mapPreview");
  mapButton?.addEventListener("click", () => {
    const opening = mapPreview.hidden;
    mapPreview.hidden = !opening;
    mapButton.setAttribute("aria-expanded", String(opening));
    mapButton.innerHTML = opening ? "Ocultar mapa <span>⌃</span>" : "Visualizar mapa <span>⌄</span>";
    if (opening) {
      mapPreview.classList.add("open");
      if (!mapFrame.src) {
        const address = "Rua Frei Policarpo Van Leeuwem, s/n - Conj. Hab. Ana Paula, Mogi das Cruzes - SP, 08725-400";
        mapFrame.src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
      }
    } else mapPreview.classList.remove("open");
  });

  const pixEl = $("#pixKey"), copyPix = $("#copyPix"), pixFeedback = $("#pixFeedback");
  if (cfg.pixKey && pixEl && copyPix) {
    pixEl.textContent = cfg.pixKey;
    pixFeedback.textContent = cfg.pixReceiver ? `Recebedor: ${cfg.pixReceiver}` : "Confira o recebedor no seu aplicativo bancário.";
    copyPix.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(cfg.pixKey); pixFeedback.textContent = "Chave Pix copiada. Confira o recebedor antes de pagar."; }
      catch { pixFeedback.textContent = "Não foi possível copiar automaticamente. Selecione a chave acima."; }
    });
  } else copyPix?.addEventListener("click", () => { pixFeedback.textContent = "A chave Pix ainda não foi cadastrada pelos noivos."; });

  const giftButtons = [...document.querySelectorAll(".gift-button")];
  const catalog = new Map(giftButtons.map(button => [button.dataset.giftId, {
    id: button.dataset.giftId, name: button.dataset.name, value: Number(button.dataset.value),
    icon: button.closest(".gift-card").querySelector(".gift-art svg")
  }]));
  const cart = [];
  const cartDialog = $("#cartDialog");
  const openCart = () => { if (!cartDialog.open) cartDialog.showModal(); };
  $("#openCart")?.addEventListener("click", openCart);
  $("#closeCart")?.addEventListener("click", () => cartDialog.close());
  $("#continueShopping")?.addEventListener("click", () => cartDialog.close());
  cartDialog?.addEventListener("click", event => { if (event.target === cartDialog) cartDialog.close(); });
  const cartItems = $("#cartItems"), cartTotal = $("#cartTotal"), cartCount = $("#cartCount"), cartBadge = $("#cartBadge");
  const CART_STORAGE_KEY = "mg-wedding-cart-v1";
  function saveCart() {
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart.map(({ id, quantity, value }) => ({ id, quantity, value })))); }
    catch { /* O carrinho continua funcionando enquanto esta página estiver aberta. */ }
  }
  function restoreCart() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]"); } catch { saved = []; }
    if (!Array.isArray(saved)) return;
    saved.slice(0, 30).forEach(entry => {
      if (!entry || !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 99) return;
      if (entry.id === "contribuicao-livre") {
        const value = Number(entry.value);
        if (Number.isFinite(value) && value >= 1 && value <= 100000) cart.push({ id: entry.id, name: "Contribuição livre", value, quantity: entry.quantity, icon: null });
        return;
      }
      const product = catalog.get(entry.id);
      if (product) cart.push({ ...product, quantity: entry.quantity });
    });
  }
  function formatItemSubtotal(item) { return money(item.value * item.quantity); }
  function renderCart() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + item.value * item.quantity, 0);
    cartCount.textContent = `${count} ${count === 1 ? "item" : "itens"}`;
    cartTotal.textContent = money(total);
    cartBadge.textContent = String(count);
    $(".cart-shortcut").setAttribute("aria-label", `Abrir carrinho; ${count} ${count === 1 ? "item" : "itens"}`);
    cartItems.replaceChildren();
    if (!cart.length) {
      const empty = document.createElement("p"); empty.className = "cart-empty"; empty.textContent = "Seu carrinho está vazio. Escolha uma contribuição simbólica para começar.";
      cartItems.append(empty);
      $("#clearCart").disabled = true;
      saveCart(); return;
    }
    $("#clearCart").disabled = false;
    cart.forEach((item, index) => {
      const row = document.createElement("article"); row.className = "cart-item";
      const picture = document.createElement("div"); picture.className = "cart-item-picture";
      if (item.icon) picture.append(item.icon.cloneNode(true));
      else { picture.classList.add("free-gift-icon"); picture.textContent = "✧"; }
      const details = document.createElement("div"); details.className = "cart-item-details";
      const name = document.createElement("strong"); name.textContent = item.name;
      const unit = document.createElement("small"); unit.textContent = `${money(item.value)} por contribuição`;
      const sub = document.createElement("small"); sub.className = "cart-item-subtotal"; sub.textContent = `Subtotal: ${formatItemSubtotal(item)}`;
      details.append(name, unit, sub);
      const controls = document.createElement("div"); controls.className = "cart-controls";
      const minus = document.createElement("button"); minus.type = "button"; minus.dataset.cartAction = "minus"; minus.dataset.index = String(index); minus.setAttribute("aria-label", `Diminuir quantidade de ${item.name}`); minus.textContent = "−";
      const quantity = document.createElement("span"); quantity.textContent = String(item.quantity); quantity.setAttribute("aria-label", `Quantidade ${item.quantity}`);
      const plus = document.createElement("button"); plus.type = "button"; plus.dataset.cartAction = "plus"; plus.dataset.index = String(index); plus.setAttribute("aria-label", `Aumentar quantidade de ${item.name}`); plus.textContent = "+";
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-item"; remove.dataset.cartAction = "remove"; remove.dataset.index = String(index); remove.textContent = "Remover";
      controls.append(minus, quantity, plus, remove); row.append(picture, details, controls); cartItems.append(row);
    });
    saveCart();
  }
  function announce(message) {
    const toast = $("#cartToast"); toast.textContent = message; toast.classList.add("visible");
    clearTimeout(announce.timer); announce.timer = setTimeout(() => toast.classList.remove("visible"), 2600);
    $("#giftFeedback").textContent = message;
  }
  function addItem(item) {
    const existing = cart.find(current => current.id === item.id && current.value === item.value);
    if (existing) existing.quantity = Math.min(99, existing.quantity + 1);
    else cart.push({ ...item, quantity: 1 });
    renderCart(); announce(`${item.name} adicionado ao carrinho.`);
  }
  restoreCart(); renderCart();
  giftButtons.forEach(button => button.addEventListener("click", () => {
    const item = catalog.get(button.dataset.giftId); if (!item) return;
    addItem(item);
    button.classList.add("added"); setTimeout(() => button.classList.remove("added"), 550);
  }));
  cartItems.addEventListener("click", event => {
    const button = event.target.closest("button[data-cart-action]"); if (!button) return;
    const index = Number(button.dataset.index), item = cart[index]; if (!item) return;
    if (button.dataset.cartAction === "plus") item.quantity = Math.min(99, item.quantity + 1);
    if (button.dataset.cartAction === "minus") item.quantity -= 1;
    if (button.dataset.cartAction === "remove" || item.quantity < 1) cart.splice(index, 1);
    renderCart();
  });
  $("#clearCart")?.addEventListener("click", () => {
    if (!cart.length || !window.confirm("Deseja remover todos os itens do carrinho?")) return;
    cart.splice(0, cart.length); renderCart(); announce("Carrinho limpo.");
  });
  $("#addFreeGift")?.addEventListener("click", () => {
    const input = $("#freeAmount"), amount = Number(input.value);
    if (!input.value.trim() || !Number.isFinite(amount) || amount < 1 || amount > 100000) { input.setCustomValidity("Informe um valor entre R$ 1,00 e R$ 100.000,00."); input.reportValidity(); return; }
    input.setCustomValidity(""); addItem({ id: "contribuicao-livre", name: "Contribuição livre", value: Math.round(amount * 100) / 100, icon: null }); input.value = "";
  });
  $("#giftCheckout")?.addEventListener("click", () => {
    if (!cart.length) { announce("Adicione um presente ao carrinho para continuar."); return; }
    const giver = $("#giverName");
    if (!giver.value.trim()) { giver.setCustomValidity("Informe seu nome para revisar a contribuição."); giver.reportValidity(); return; }
    giver.setCustomValidity("");
    const summary = $("#checkoutSummary"); summary.replaceChildren();
    cart.forEach(item => {
      const row = document.createElement("div"); row.className = "checkout-line";
      const title = document.createElement("span"); title.textContent = `${item.name} × ${item.quantity}`;
      const value = document.createElement("strong"); value.textContent = formatItemSubtotal(item);
      row.append(title, value); summary.append(row);
    });
    const totalLine = document.createElement("div"); totalLine.className = "checkout-line checkout-grand-total";
    const totalLabel = document.createElement("strong"); totalLabel.textContent = "Total";
    const totalValue = document.createElement("strong"); totalValue.textContent = cartTotal.textContent;
    totalLine.append(totalLabel, totalValue); summary.append(totalLine);
    const note = $("#giftNote").value.trim();
    $("#checkoutIdentity").textContent = note ? `${giver.value.trim()} · “${note}”` : giver.value.trim();
    $("#checkoutDialog").showModal();
  });
  $("#closeCheckout")?.addEventListener("click", () => $("#checkoutDialog").close());
  $(".checkout-close")?.addEventListener("click", () => $("#checkoutDialog").close());
  $("#checkoutDialog")?.addEventListener("click", event => { if (event.target === event.currentTarget) event.currentTarget.close(); });

  const templates = {
    romantica: ["Que o amor de vocês continue sendo abrigo, parceria e alegria em todos os dias. Que essa nova etapa seja repleta de carinho e sonhos realizados. Com muito amor!", "Que nunca faltem motivos para escolher um ao outro, paciência para caminhar juntos e amor para transformar os dias simples em momentos inesquecíveis."],
    divertida: ["Desejo muito amor, boas risadas, parceria e paciência para decidir o que pedir no jantar! Que a vida a dois seja leve e cheia de histórias incríveis.", "Que nunca faltem amor, bom humor e disposição para dividir a coberta. Felicidades nessa aventura linda que está só começando!"],
    emocionante: ["É lindo ver duas pessoas escolhendo construir uma vida juntas. Que cada novo capítulo seja ainda mais bonito e que vocês encontrem força um no outro em todos os momentos.", "Que este dia seja apenas o primeiro de infinitas lembranças felizes. Que a caminhada de vocês seja iluminada por respeito, amizade, cuidado e amor verdadeiro."],
    curta: ["Que a felicidade acompanhe vocês em cada passo. Muito amor nessa nova caminhada!", "Um brinde ao amor, à parceria e a toda a felicidade que ainda está por vir!"],
    religiosa: ["Que Deus abençoe essa união, ilumine as escolhas de vocês e seja sempre a base desse lar. Que nunca faltem fé, amor, saúde e sabedoria.", "Que Deus esteja presente em cada passo dessa caminhada, fortalecendo o amor e abençoando a família que vocês estão construindo."],
    amigos: ["Que privilégio fazer parte desse momento! Desejo uma vida cheia de viagens, conquistas, risadas e muito amor. Estamos juntos nessa!", "Amigos, que essa nova fase seja incrível! Que vocês continuem sendo esse time que se apoia, se diverte e cresce junto. Muitas felicidades!"],
    familia: ["Que a união de vocês seja sempre cercada de amor, respeito e cuidado. Desejamos uma vida abençoada e cheia de momentos felizes. Contem sempre conosco!", "Hoje celebramos não só um casamento, mas o começo de uma nova família. Que nunca faltem união, diálogo, saúde e amor no lar de vocês."]
  };
  const output = $("#messageOutput"), loading = $("#messageLoading");
  $("#generateMessage")?.addEventListener("click", () => {
    loading.classList.add("active"); output.value = "";
    const list = templates[$("#messageStyle").value] || templates.romantica;
    setTimeout(() => { output.value = list[Math.floor(Math.random() * list.length)]; $("#charCount").textContent = output.value.length; loading.classList.remove("active"); }, 500);
  });
  output?.addEventListener("input", () => { $("#charCount").textContent = output.value.length; });
  $("#copyMessage")?.addEventListener("click", async () => {
    if (!output.value.trim()) { output.focus(); return; }
    try { await navigator.clipboard.writeText(output.value); }
    catch { output.select(); document.execCommand("copy"); }
    $("#copyMessage").textContent = "Mensagem copiada ✓";
  });

  $("#rsvpForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget, feedback = $("#rsvpFeedback"), submit = form.querySelector('[type="submit"]');
    if (!cfg.rsvpEndpoint) { feedback.textContent = "O serviço de confirmação ainda não está configurado. Sua resposta não foi armazenada nem enviada."; return; }
    const data = Object.fromEntries(new FormData(form).entries());
    submit.disabled = true; feedback.textContent = "Enviando sua confirmação…";
    try {
      const response = await fetch(cfg.rsvpEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!response.ok) throw new Error("Falha no envio");
      const result = await response.json();
      if (result.saved !== true) throw new Error("O servidor não confirmou o armazenamento");
      feedback.textContent = "Sua resposta foi registrada. Muito obrigado!"; form.reset();
    } catch { feedback.textContent = "Não foi possível confirmar o armazenamento da resposta. Tente novamente mais tarde."; }
    finally { submit.disabled = false; }
  });
})();
