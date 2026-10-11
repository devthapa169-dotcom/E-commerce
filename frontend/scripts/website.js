// ─── CURSOR ─────────────────────────────────────────────
const cur = document.getElementById('cursor'), ring = document.getElementById('cursorRing');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove', e=>{ mx=e.clientX; my=e.clientY; cur.style.left=mx+'px'; cur.style.top=my+'px'; });
(function animRing(){ rx+=(mx-rx)*.13; ry+=(my-ry)*.13; ring.style.left=rx+'px'; ring.style.top=ry+'px'; requestAnimationFrame(animRing); })();
function addHover(el){ el.addEventListener('mouseenter',()=>{ cur.classList.add('h'); ring.classList.add('h'); }); el.addEventListener('mouseleave',()=>{ cur.classList.remove('h'); ring.classList.remove('h'); }); }
document.querySelectorAll('a,button,.cat-card,.prod-card,.brand,.ai-chip,.feat').forEach(addHover);

// ─── NAV ────────────────────────────────────────────────
window.addEventListener('scroll',()=> document.getElementById('navbar').classList.toggle('scrolled', scrollY>60));

// ─── REVEAL ─────────────────────────────────────────────
const ro = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); }), {threshold:.1});
document.querySelectorAll('.reveal').forEach(r=>ro.observe(r));

// ─── PRODUCTS DATA ──────────────────────────────────────
// Fetched from the backend instead of hardcoded.
let PRODUCTS = [];
let savedPicks = [];
let visibleCount = 6;
let currentFilter = 'all';

// Converts a backend product object into the shape the frontend expects
function mapProduct(p) {
  const offer = (p.affiliate_offers && p.affiliate_offers[0]) || {};
  return {
    id: String(p.id),
    name: p.name,
    description: p.description,
    category: p.categories ? p.categories.slug : '',
    sport: p.sport,
    brand: p.brand,
    price: p.price,
    originalPrice: p.original_price,
    currency: p.currency,
    image: p.image_url,
    badge: p.badge || '',
    rating: p.rating,
    reviewCount: p.review_count,
    affiliateUrl: offer.affiliate_url || '',
    featured: p.featured,
    active: p.active
  };
}

async function fetchProducts() {
  try {
    const res = await fetch('/products');
    const data = await res.json();
    PRODUCTS = data.map(mapProduct);
  } catch (err) {
    console.error('Failed to load products from backend:', err);
    PRODUCTS = [];
  }
}

function formatPrice(product){
  const symbol = product.currency === 'INR' ? '₹' : '$';
  return `${symbol}${Number(product.price).toFixed(2)}`;
}
function formatOriginalPrice(product){
  if(product.originalPrice == null) return '';
  const symbol = product.currency === 'INR' ? '₹' : '$';
  return `<span class="old">${symbol}${Number(product.originalPrice).toFixed(2)}</span>`;
}

// ─── RENDER PRODUCTS ────────────────────────────────────
function renderProducts(filter='all', count=6) {
  const grid = document.getElementById('prodGrid');
  const activeProducts = PRODUCTS.filter(p=>p.active);
  const filtered = filter==='all' ? activeProducts : activeProducts.filter(p=>p.category===filter);
  const shown = filtered.slice(0, count);

  grid.innerHTML = shown.map(p => `
    <div class="prod-card reveal" id="pc-${p.id}">
      <div class="prod-img-wrap">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.opacity=.3">
        ${p.badge ? `<div class="prod-badge${p.badge==='Sale'?' sale':p.badge==='Hot'?' hot':''}">${p.badge}</div>` : ''}
        <div class="prod-actions">
          <div class="pac-btn" onclick="savePick('${p.id}')" title="Save pick">🔖</div>
          <div class="pac-btn" onclick="showToast('Saved picks will be expanded later.')" title="Wishlist">♡</div>
        </div>
      </div>
      <div class="prod-info">
        <div class="prod-sport">${p.sport}</div>
        <div class="prod-name">${p.name}</div>
        <div class="prod-footer2">
          <div class="prod-price">${formatOriginalPrice(p)}<span>${formatPrice(p)}</span></div>
          <div class="prod-stars"><div class="stars">${'★'.repeat(Math.floor(p.rating))}</div><div class="rnum">${p.rating} (${p.reviewCount})</div></div>
        </div>
        <button class="atc-btn" id="atc-${p.id}" onclick="savePick('${p.id}')">🔖 Save Pick</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.reveal').forEach((r,i)=>{
    r.style.transitionDelay=(i*0.06)+'s';
    setTimeout(()=>r.classList.add('visible'),80);
  });
  grid.querySelectorAll('.prod-card,.pac-btn,.atc-btn').forEach(addHover);

  const btn=document.getElementById('loadMoreBtn');
  btn.style.display=filtered.length>count?'inline-block':'none';
}

function filterProds(cat,el){
  currentFilter=cat;
  visibleCount=6;
  document.querySelectorAll('.ftab').forEach(t=>t.classList.remove('active'));
  if(el) el.classList.add('active');
  const grid=document.getElementById('prodGrid');
  grid.style.opacity='0'; grid.style.transform='translateY(14px)';
  setTimeout(()=>{
    renderProducts(cat,visibleCount);
    grid.style.transition='opacity .35s, transform .35s';
    grid.style.opacity='1'; grid.style.transform='translateY(0)';
  },180);
}

function filterAndScroll(cat){
  const btn=document.querySelector(`.ftab[onclick*="${cat}"]`);
  if(btn) filterProds(cat,btn);
  setTimeout(()=>document.getElementById('products').scrollIntoView({behavior:'smooth'}),100);
}
function loadMore(){ visibleCount+=6; renderProducts(currentFilter,visibleCount); }

// ─── SAVED PICKS ─────────────────────────────────────────
function savePick(id){
  const p=PRODUCTS.find(x=>x.id===id);
  if(!p) return;
  if(!savedPicks.some(x=>x.id===id)){
    savedPicks.push(p);
    showToast(`${p.name} saved to your picks.`);
  }else{
    showToast('This product is already in your picks.');
  }
  updatePicksUI();
}
function removeFromCart(id){ savedPicks=savedPicks.filter(p=>p.id!==id); updatePicksUI(); }
function updateQty(){ showToast('Quantity is not used for affiliate picks.'); }
function updatePicksUI(){
  document.getElementById('cartCount').textContent=savedPicks.length;
  document.getElementById('cartTotal').textContent=savedPicks.length;
  document.getElementById('freeShipMsg').textContent=savedPicks.length?'Your saved products are ready to compare.':'';
  const body=document.getElementById('cartBody');
  if(!savedPicks.length){
    body.innerHTML='<div class="cart-empty2"><div class="ce-icon">🔖</div><div class="ce-txt">No saved picks yet</div></div>';
    return;
  }
  body.innerHTML=savedPicks.map(p=>`
    <div class="cart-item">
      <div class="ci-img"><img src="${p.image}" alt="${p.name}" onerror="this.style.opacity=.3"></div>
      <div class="ci-info">
        <div class="ci-name">${p.name}</div>
        <div class="ci-sport">${p.sport}</div>
        <div class="ci-bottom">
          <div class="ci-price">${formatPrice(p)}</div>
          <button class="ci-rm" onclick="removeFromCart('${p.id}')">✕</button>
        </div>
      </div>
    </div>
  `).join('');
  body.querySelectorAll('button').forEach(addHover);
}
function openCart(){document.getElementById('cartSb').classList.add('open');document.getElementById('cartOv').classList.add('open');}
function closeCart(){document.getElementById('cartSb').classList.remove('open');document.getElementById('cartOv').classList.remove('open');}

// ─── TOAST ──────────────────────────────────────────────
let toastT;
function showToast(msg){
  const t=document.getElementById('toast');
  document.getElementById('toastMsg').textContent=msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT=setTimeout(()=>t.classList.remove('show'),2800);
}


// ─── AI SEARCH ──────────────────────────────────────────
function fillAI(txt) {
  document.getElementById('aiInput').value = txt;
  document.getElementById('aiInput').focus();
}

function escapeAIHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

async function askAI() {
  const q = document.getElementById('aiInput').value.trim();

  if (!q) {
    showToast('Please describe what gear you need!');
    return;
  }

  const btn = document.getElementById('aiBtn');
  const resp = document.getElementById('aiResponse');
  const respText = document.getElementById('aiResponseText');

  btn.classList.add('loading');
  btn.disabled = true;
  btn.textContent = 'Searching...';
  resp.classList.add('show');
  respText.textContent = 'Finding suitable products...';

  try {
    const response = await fetch('/ai/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'AI search is temporarily unavailable.');
    }

    // Render the AI explanation as text, not HTML.
    const message = document.createElement('p');
    message.textContent = data.message || 'Here are the closest matches.';
    respText.replaceChildren(message);

    const list = document.createElement('div');
    list.className = 'ai-product-list';

    (data.products || []).forEach(product => {
      const card = document.createElement('article');
      card.className = 'ai-product-card';

      const affiliateUrl =
        typeof product.affiliate_url === 'string' &&
        /^https:\/\//i.test(product.affiliate_url)
          ? product.affiliate_url
          : '';

      const image = document.createElement('img');
      image.src = product.image_url || '';
      image.alt = product.name || 'Sports product';
      image.loading = 'lazy';
      image.style.cssText =
        'width:90px;height:90px;object-fit:contain;background:white;border-radius:8px';
      image.onerror = () => { image.style.display = 'none'; };

      const details = document.createElement('div');
      details.style.flex = '1';

      const name = document.createElement('strong');
      name.textContent = product.name || 'Sports product';

      const category = document.createElement('p');
      category.textContent =
        [product.brand, product.category].filter(Boolean).join(' · ');

      const price = document.createElement('p');
      price.textContent =
        '₹' + Number(product.price).toLocaleString('en-IN');
      price.style.color = 'var(--red)';
      price.style.fontWeight = '700';

      details.append(name, category, price);

      if (product.rating != null) {
        const rating = document.createElement('p');
        rating.textContent =
          `★ ${product.rating} (${product.review_count ?? 0} reviews)`;
        details.appendChild(rating);
      }

      if (affiliateUrl) {
        const link = document.createElement('a');
        link.href = affiliateUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer sponsored';
        link.textContent = 'View on retailer ↗';
        details.appendChild(link);
      }

      card.style.cssText =
        'display:flex;gap:14px;align-items:center;padding:14px 0;border-top:1px solid rgba(255,255,255,.12)';

      card.append(image, details);
      list.appendChild(card);
    });

    if (list.children.length) {
      respText.appendChild(list);
    }
  } catch (error) {
    respText.textContent =
      error.message || 'AI search failed. Please try again.';
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
    btn.textContent = 'Ask AI →';
  }
}


// ─── SUBSCRIBE ─────────────────────────────────────────
function subscribe(){
  const v=document.getElementById('nlEmail').value.trim();
  if(!v||!v.includes('@')){showToast('Please enter a valid email!');return;}
  showToast('🎉 You are on the APEX SPORT list!');
  document.getElementById('nlEmail').value='';
}

// ─── INIT ───────────────────────────────────────────────
(async function init() {
  await fetchProducts();
  renderProducts();
  updatePicksUI();
})();