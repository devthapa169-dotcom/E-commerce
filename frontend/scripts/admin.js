
// ─── STORAGE HELPERS ────────────────────────────────────────
const S = {
  get: k => { try { return JSON.parse(localStorage.getItem('apex_'+k)); } catch { return null; } },
  set: (k,v) => { localStorage.setItem('apex_'+k, JSON.stringify(v)); showSaveIndicator(); },
};

// ─── AUTH ────────────────────────────────────────────────────
const DEFAULT_PASS = 'devthapa169';
function getCredentials() {
  return S.get('creds') || { username: 'admin', password: DEFAULT_PASS };
}

function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const creds = getCredentials();
  if(u === creds.username && p === creds.password) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').classList.add('visible');
    initApp();
  } 
}

function doLogout() {
  document.getElementById('adminApp').classList.remove('visible');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginErr').style.display = 'none';
}

function changePassword() {
  const cur = document.getElementById('s-curPass').value;
  const nw = document.getElementById('s-newPass').value;
  const conf = document.getElementById('s-confPass').value;
  const creds = getCredentials();
  if(cur !== creds.password) { toast('❌ Current password is wrong', 'red'); return; }
  if(nw.length < 6) { toast('Password must be at least 6 characters', 'orange'); return; }
  if(nw !== conf) { toast('❌ Passwords do not match', 'red'); return; }
  creds.password = nw;
  S.set('creds', creds);
  document.getElementById('s-curPass').value = '';
  document.getElementById('s-newPass').value = '';
  document.getElementById('s-confPass').value = '';
  toast('🔒 Password updated!', 'green');
}

// ─── DEFAULT DATA ────────────────────────────────────────────
const DEFAULT_CATS = [
  { id:'running', name:'Running', icon:'🏃' },
  { id:'football', name:'Football', icon:'⚽' },
  { id:'basketball', name:'Basketball', icon:'🏀' },
  { id:'fitness', name:'Fitness', icon:'🏋️' },
  { id:'tennis', name:'Tennis', icon:'🎾' },
  { id:'boxing', name:'Boxing', icon:'🥊' },
  { id:'cycling', name:'Cycling', icon:'🚴' },
  { id:'swimming', name:'Swimming', icon:'🏊' },
];

const DEFAULT_PRODUCTS = [
  { id:1, name:'Nike Air Zoom Pegasus 41', cat:'running', price:109.95, oldPrice:140, img:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', badge:'New', rating:4.8, reviews:3241, prime:true, amazonId:'B0BXQHXLPZ', stock:'In Stock', hot:true, active:true },
  { id:2, name:'Adidas Predator Elite FG Cleats', cat:'football', price:129.95, oldPrice:175, img:'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&auto=format&fit=crop&q=80', badge:'Hot', rating:4.8, reviews:2104, prime:true, amazonId:'B0C4PRPBVZ', stock:'In Stock', hot:false, active:true },
  { id:3, name:'Spalding NBA Official Basketball', cat:'basketball', price:129.99, img:'https://images.unsplash.com/photo-1546519638405-a9267ffa6d7d?w=600&auto=format&fit=crop&q=80', badge:'', rating:4.9, reviews:8241, prime:true, amazonId:'B08TBG9JTK', stock:'In Stock', hot:false, active:true },
  { id:4, name:'Bowflex SelectTech 552 Dumbbells', cat:'fitness', price:279.00, oldPrice:429, img:'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80', badge:'Deal', rating:4.8, reviews:11203, prime:true, amazonId:'B001ARYU58', stock:'In Stock', hot:true, active:true },
  { id:5, name:'Everlast Pro Style Boxing Gloves', cat:'boxing', price:34.99, oldPrice:55, img:'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=600&auto=format&fit=crop&q=80', badge:'Hot', rating:4.7, reviews:7823, prime:true, amazonId:'B000WJJHT0', stock:'In Stock', hot:false, active:true },
];

const DEFAULT_SETTINGS = {
  affTag: 'apexsport-21',
  locale: 'amazon.in',
  siteName: 'APEX SPORT',
  igHandle: '@apexsport',
  igUrl: 'https://instagram.com/apexsport',
  email: '',
};

// ─── GET / SET DATA ──────────────────────────────────────────
function getProducts() { return S.get('products') || DEFAULT_PRODUCTS; }
function getCategories() { return S.get('categories') || DEFAULT_CATS; }
function getSettings() { return S.get('settings') || DEFAULT_SETTINGS; }
function saveProducts(p) { S.set('products', p); }
function saveCategories(c) { S.set('categories', c); }

// ─── INIT ────────────────────────────────────────────────────
function initApp() {
  renderDashboard();
  renderProductTable();
  renderCatGrid();
  loadSettingsForm();
  populateIGProductSelect();
  updateProdBadge();
}

// ─── PANEL NAVIGATION ────────────────────────────────────────
function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll('.mob-nav-btn').forEach(n=>n.classList.remove('active'));
  const panel = document.getElementById('panel-'+id);
  if(panel) panel.classList.add('active');
  document.querySelectorAll('[data-panel="'+id+'"]').forEach(el=>el.classList.add('active'));
  const titles = { dashboard:'Dashboard', products:'Products', categories:'Categories', instagram:'Instagram Posts', settings:'Settings', export:'Export Data' };
  document.getElementById('topbarTitle').textContent = titles[id] || id;
  if(id==='instagram') updateIGPreview();
  if(id==='products') renderProductTable();
  if(id==='categories') renderCatGrid();
  if(id==='settings') loadSettingsForm();
  window.scrollTo(0,0);
}

// ─── SAVE INDICATOR ─────────────────────────────────────────
function showSaveIndicator() {
  const el = document.getElementById('saveIndicator');
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2000);
}

// ─── TOAST ──────────────────────────────────────────────────
let toastT;
function toast(msg, color='orange') {
  const t=document.getElementById('adminToast');
  document.getElementById('adminToastMsg').textContent=msg;
  const dot=document.getElementById('toastDot');
  dot.className='ta-dot '+color;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT=setTimeout(()=>t.classList.remove('show'),2600);
}

// ─── DASHBOARD ──────────────────────────────────────────────
function renderDashboard() {
  const prods = getProducts();
  const cats = getCategories();
  const active = prods.filter(p=>p.active).length;
  const deals = prods.filter(p=>p.oldPrice).length;
  const settings = getSettings();

  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card"><div class="stat-card-label">Total Products</div><div class="stat-card-num orange">${prods.length}</div><div class="stat-card-sub">${active} active</div></div>
    <div class="stat-card"><div class="stat-card-label">Categories</div><div class="stat-card-num">${cats.length}</div><div class="stat-card-sub">sport categories</div></div>
    <div class="stat-card"><div class="stat-card-label">Active Deals</div><div class="stat-card-num green">${deals}</div><div class="stat-card-sub">with discounts</div></div>
    <div class="stat-card"><div class="stat-card-label">Affiliate Tag</div><div class="stat-card-num" style="font-size:1.1rem;font-family:'DM Sans';padding-top:6px;">${settings.affTag||'Not set'}</div><div class="stat-card-sub">${settings.locale}</div></div>
  `;

  document.getElementById('recentProds').innerHTML = prods.slice(-5).reverse().map(p=>`
    <div class="recent-product">
      <div class="rp-img"><img src="${p.img}" alt="${p.name}" onerror="this.style.opacity=.3"></div>
      <div class="rp-name">${p.name}<div style="font-size:.65rem;color:var(--muted);margin-top:2px;">${p.cat}</div></div>
      <div class="rp-price">$${p.price}</div>
    </div>
  `).join('');
}

// ─── PRODUCT TABLE ───────────────────────────────────────────
let editingProductId = null;

function renderProductTable() {
  const search = document.getElementById('prodSearch').value.toLowerCase();
  const catF = document.getElementById('prodCatFilter').value;
  let prods = getProducts();

  // Populate cat filter
  const cats = getCategories();
  const sel = document.getElementById('prodCatFilter');
  const cur = sel.value;
  sel.innerHTML = '<option value="all">All Categories</option>' + cats.map(c=>`<option value="${c.id}" ${cur===c.id?'selected':''}>${c.icon} ${c.name}</option>`).join('');

  if(search) prods = prods.filter(p=>p.name.toLowerCase().includes(search) || p.cat.toLowerCase().includes(search));
  if(catF && catF!=='all') prods = prods.filter(p=>p.cat===catF);

  const tbody = document.getElementById('prodTableBody');
  if(!prods.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📦</div><div class="empty-text">No products found</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = prods.map(p=>`
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="pt-img"><img src="${p.img}" alt="${p.name}" onerror="this.style.opacity=.3"></div>
          <div><div class="pt-name">${p.name}</div><div class="pt-cat">${p.cat}</div></div>
        </div>
      </td>
      <td><span class="pt-asin">${p.amazonId||'—'}</span></td>
      <td>
        <div class="pt-price">$${p.price}</div>
        ${p.oldPrice?`<div class="pt-old">$${p.oldPrice}</div>`:''}
      </td>
      <td><span class="pt-stars">${'★'.repeat(Math.floor(p.rating||0))}☆</span><br><span style="font-size:.7rem;color:var(--muted)">${p.rating} (${(p.reviews||0).toLocaleString()})</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="toggle-btn ${p.active?'on':''}" onclick="toggleProductActive(${p.id})" title="Toggle visibility"></button>
          <span class="status-badge ${p.active?'status-active':'status-hidden'}">${p.active?'Active':'Hidden'}</span>
        </div>
      </td>
      <td>
        <div class="pt-actions">
          <button class="btn-edit" onclick="editProduct(${p.id})">✏️ Edit</button>
          <button class="btn-danger" onclick="deleteProduct(${p.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
  updateProdBadge();
}

function updateProdBadge() {
  document.getElementById('prodBadge').textContent = getProducts().length;
}

function toggleProductActive(id) {
  const prods = getProducts();
  const p = prods.find(x=>x.id===id);
  if(!p) return;
  p.active = !p.active;
  saveProducts(prods);
  renderProductTable();
  toast(p.active ? '✓ Product visible on site' : 'Product hidden', 'orange');
}

function deleteProduct(id) {
  if(!confirm('Delete this product? This cannot be undone.')) return;
  const prods = getProducts().filter(p=>p.id!==id);
  saveProducts(prods);
  renderProductTable();
  renderDashboard();
  toast('🗑️ Product deleted', 'red');
}

// ─── PRODUCT MODAL ───────────────────────────────────────────
function openProductModal(id=null) {
  editingProductId = id;
  const cats = getCategories();
  document.getElementById('f-cat').innerHTML = cats.map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

  if(id) {
    const p = getProducts().find(x=>x.id===id);
    if(!p) return;
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('f-name').value = p.name;
    document.getElementById('f-asin').value = p.amazonId||'';
    document.getElementById('f-cat').value = p.cat;
    document.getElementById('f-price').value = p.price;
    document.getElementById('f-oldprice').value = p.oldPrice||'';
    document.getElementById('f-rating').value = p.rating||'';
    document.getElementById('f-reviews').value = p.reviews||'';
    document.getElementById('f-badge').value = p.badge||'';
    document.getElementById('f-stock').value = p.stock||'';
    document.getElementById('f-img').value = p.img||'';
    document.getElementById('f-prime').value = String(p.prime||false);
    document.getElementById('f-hot').value = String(p.hot||false);
    document.getElementById('f-active').value = String(p.active !== false);
    updateImgPreview();
  } else {
    document.getElementById('productModalTitle').textContent = 'Add Product';
    ['f-name','f-asin','f-price','f-oldprice','f-rating','f-reviews','f-stock','f-img'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('f-badge').value='';
    document.getElementById('f-prime').value='true';
    document.getElementById('f-hot').value='false';
    document.getElementById('f-active').value='true';
    document.getElementById('imgPreviewBox').style.display='none';
  }
  document.getElementById('productModal').classList.add('open');
}

function editProduct(id) { openProductModal(id); }

function closeProductModal() { document.getElementById('productModal').classList.remove('open'); editingProductId=null; }

function saveProduct() {
  const name = document.getElementById('f-name').value.trim();
  const asin = document.getElementById('f-asin').value.trim();
  const cat = document.getElementById('f-cat').value;
  const price = parseFloat(document.getElementById('f-price').value);
  const img = document.getElementById('f-img').value.trim();

  if(!name||!price||!img||!cat) { toast('❌ Name, price, image, and category are required', 'red'); return; }

  const prods = getProducts();
  const product = {
    id: editingProductId || Date.now(),
    name,
    amazonId: asin,
    cat,
    price,
    oldPrice: parseFloat(document.getElementById('f-oldprice').value)||null,
    rating: parseFloat(document.getElementById('f-rating').value)||4.5,
    reviews: parseInt(document.getElementById('f-reviews').value)||0,
    badge: document.getElementById('f-badge').value,
    stock: document.getElementById('f-stock').value.trim(),
    img,
    prime: document.getElementById('f-prime').value==='true',
    hot: document.getElementById('f-hot').value==='true',
    active: document.getElementById('f-active').value==='true',
  };

  if(editingProductId) {
    const idx = prods.findIndex(p=>p.id===editingProductId);
    if(idx>-1) prods[idx]=product;
  } else {
    prods.push(product);
  }

  const wasEditing = editingProductId !== null;
  saveProducts(prods);
  closeProductModal();
  renderProductTable();
  renderDashboard();
  populateIGProductSelect();
  toast(wasEditing ? '✓ Product updated!' : '✓ Product added!', 'green');
}

function updateImgPreview() {
  const val = document.getElementById('f-img').value;
  const box = document.getElementById('imgPreviewBox');
  const el = document.getElementById('imgPreviewEl');
  if(val) { box.style.display='block'; el.src=val; }
  else box.style.display='none';
}

function openAmazonLookup() {
  const settings = getSettings();
  window.open(`https://${settings.locale}/s?k=sports+gear`, '_blank');
  toast('Find the product on Amazon, copy the ASIN from the URL', 'orange');
}

// ─── CATEGORIES ─────────────────────────────────────────────
function renderCatGrid() {
  const cats = getCategories();
  const prods = getProducts();
  document.getElementById('catGridAdmin').innerHTML = cats.map(c=>`
    <div class="cat-admin-card">
      <div class="cat-admin-icon">${c.icon}</div>
      <div class="cat-admin-info">
        <div class="cat-admin-name">${c.name}</div>
        <div class="cat-admin-count">${prods.filter(p=>p.cat===c.id).length} products</div>
      </div>
      <div class="cat-admin-actions">
        <button class="btn-danger" onclick="deleteCategory('${c.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

let editingCatId = null;

function openCatModal(id=null) {
  editingCatId=id;
  document.getElementById('catModalTitle').textContent = id ? 'Edit Category' : 'Add Category';
  if(id) {
    const c = getCategories().find(x=>x.id===id);
    if(c) { document.getElementById('fc-name').value=c.name; document.getElementById('fc-icon').value=c.icon; document.getElementById('fc-id').value=c.id; }
  } else {
    ['fc-name','fc-icon','fc-id'].forEach(i=>document.getElementById(i).value='');
  }
  document.getElementById('catModal').classList.add('open');
}

function closeCatModal() { document.getElementById('catModal').classList.remove('open'); editingCatId=null; }

function saveCategory() {
  const name = document.getElementById('fc-name').value.trim();
  const icon = document.getElementById('fc-icon').value.trim();
  const id = document.getElementById('fc-id').value.trim().toLowerCase().replace(/\s+/g,'');
  if(!name||!icon||!id) { toast('All fields required', 'red'); return; }
  const cats = getCategories();
  if(cats.some(c=>c.id===id && c.id!==editingCatId)) { toast('Category ID already exists', 'red'); return; }
  if(editingCatId) {
    const idx=cats.findIndex(c=>c.id===editingCatId);
    if(idx>-1) {
      cats[idx]={id,name,icon};
      if(id!==editingCatId) {
        const prods=getProducts();
        let changed=false;
        prods.forEach(p=>{ if(p.cat===editingCatId){ p.cat=id; changed=true; } });
        if(changed) saveProducts(prods);
      }
    }
  } else {
    cats.push({id,name,icon});
  }
  saveCategories(cats);
  closeCatModal();
  renderCatGrid();
  renderDashboard();
  toast('✓ Category saved!', 'green');
}

function deleteCategory(id) {
  const count = getProducts().filter(p=>p.cat===id).length;
  if(count > 0) {
    toast(`Cannot delete: ${count} product${count===1?'':'s'} still use this category`, 'red');
    return;
  }
  if(!confirm('Delete this category?')) return;
  saveCategories(getCategories().filter(c=>c.id!==id));
  renderCatGrid();
  renderDashboard();
  toast('Category deleted', 'red');
}

// ─── SETTINGS ───────────────────────────────────────────────
function loadSettingsForm() {
  const s = getSettings();
  document.getElementById('s-affTag').value = s.affTag||'';
  document.getElementById('s-locale').value = s.locale||'amazon.in';
  document.getElementById('s-siteName').value = s.siteName||'';
  document.getElementById('s-igHandle').value = s.igHandle||'';
  document.getElementById('s-igUrl').value = s.igUrl||'';
  document.getElementById('s-email').value = s.email||'';
}

function saveSettings() {
  S.set('settings', {
    affTag: document.getElementById('s-affTag').value.trim(),
    locale: document.getElementById('s-locale').value,
    siteName: document.getElementById('s-siteName').value.trim(),
    igHandle: document.getElementById('s-igHandle').value.trim(),
    igUrl: document.getElementById('s-igUrl').value.trim(),
    email: document.getElementById('s-email').value.trim(),
  });
  renderDashboard();
  toast('✓ Settings saved!', 'green');
}

// ─── INSTAGRAM POST GENERATOR ────────────────────────────────
const IG_HASHTAGS = {
  running: '#running #runningshoes #marathon #runnersworld #trailrunning #fitness #sportsgear #amazondeals #runningcommunity',
  football: '#football #soccer #footballboots #cleats #footballlife #sportsdeals #amazonindia #footballgear #gol',
  basketball: '#basketball #nba #basketballshoes #hoops #ballislife #sportsgear #amazondeals #bball',
  fitness: '#fitness #gym #workout #homegym #fitnessgear #dumbbells #amazondeals #gymlife #fitfam',
  tennis: '#tennis #tennisracket #tennislife #sportstyle #amazondeals #tenniscourt #wimbledon',
  boxing: '#boxing #boxinggloves #mma #martialarts #boxinglife #punchingbag #amazondeals #boxing',
  cycling: '#cycling #cyclist #roadbike #cyclinglife #bikelife #amazondeals #cyclinggear',
  swimming: '#swimming #swimmer #swimlife #aquatics #amazondeals #swimmingpool',
};

const IG_TEMPLATES = {
  deal: (p, settings) => `🔥 DEAL ALERT! ${p.name}\n\n💰 Was: $${p.oldPrice||p.price} → Now: $${p.price}${p.oldPrice?' (Save '+Math.round((1-p.price/p.oldPrice)*100)+'%)':''}\n\n⭐ Rated ${p.rating}/5 by ${p.reviews?.toLocaleString()} buyers on Amazon\n${p.prime?'📦 FREE Amazon Prime Delivery\n':''}\n🛒 Link in bio to grab this deal!\n\n${settings.igHandle} | Affiliate link — I earn a small commission ♥`,
  review: (p, settings) => `⭐ HONEST REVIEW: ${p.name}\n\nI've been testing this and here's what I think:\n✅ Top-rated on Amazon (${p.rating}★)\n✅ ${p.reviews?.toLocaleString()}+ real buyer reviews\n✅ ${p.prime?'Amazon Prime eligible':'Ships fast'}\n✅ Price: $${p.price}\n\n🔗 Full link in bio!\n\n${settings.igHandle} | Affiliate link`,
  comparison: (p, settings) => `🏆 BEST PICK THIS WEEK\n\nOut of everything I reviewed in ${p.cat.toUpperCase()}, this wins:\n👉 ${p.name}\n\n• $${p.price} on Amazon\n• ${p.rating}★ — ${p.reviews?.toLocaleString()} reviews\n• ${p.prime?'Prime delivery 📦':''}\n${p.oldPrice?`• ${Math.round((1-p.price/p.oldPrice)*100)}% cheaper than retail\n`:''}\nLink in bio 🔗 ${settings.igHandle}`,
  motivation: (p, settings) => `💪 YOUR GEAR SHOULD MATCH YOUR GRIND\n\n${p.name} is what separates good from great.\n\n📦 Available on Amazon — $${p.price}\n⭐ ${p.rating} stars | ${p.reviews?.toLocaleString()} athletes trust it\n\nLink in bio. Let's go. 🔥\n\n${settings.igHandle} | #affiliate`,
};

function populateIGProductSelect() {
  const sel = document.getElementById('igProduct');
  const prods = getProducts().filter(p=>p.active);
  sel.innerHTML = prods.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  updateIGPreview();
}

function updateIGPreview() {
  const sel = document.getElementById('igProduct');
  if(!sel.value) return;
  const prods = getProducts();
  const p = prods.find(x=>String(x.id)===String(sel.value));
  if(!p) return;
  const settings = getSettings();
  const type = document.getElementById('igPostType').value;
  const note = document.getElementById('igCustomNote').value;
  const template = IG_TEMPLATES[type] || IG_TEMPLATES.deal;
  const caption = template(p, settings) + (note ? '\n\n' + note : '');
  const hashtags = IG_HASHTAGS[p.cat] || '#sportsgear #amazondeals #fitness';

  document.getElementById('igPreviewImg').src = p.img;
  document.getElementById('igPreviewCaption').textContent = caption;
  document.getElementById('igPreviewHash').textContent = hashtags;
  document.getElementById('igPreviewUser').textContent = settings.igHandle || '@apexsport';
  document.getElementById('igCopyArea').textContent = caption + '\n\n' + hashtags;
}

async function regenerateIGCaption() {
  const sel = document.getElementById('igProduct');
  if(!sel.value) return;
  const prods = getProducts();
  const p = prods.find(x=>String(x.id)===String(sel.value));
  if(!p) return;
  const settings = getSettings();
  const type = document.getElementById('igPostType').value;
  toast('✨ Generating with AI...', 'orange');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You write viral Instagram captions for sports affiliate marketing. Write punchy, engaging captions that drive people to click "link in bio". Use emojis strategically. Keep it under 150 words. Always end with "Link in bio 🔗" and the handle. Always add a one-line affiliate disclosure.`,
        messages: [{ role: 'user', content: `Write a ${type} Instagram caption for: ${p.name}. Price: $${p.price}${p.oldPrice?', was $'+p.oldPrice:''}. Rating: ${p.rating}/5. Category: ${p.cat}. Instagram handle: ${settings.igHandle}. Available on Amazon.` }]
      })
    });
    if(!res.ok) throw new Error(`AI request failed: ${res.status}`);
    const data = await res.json();
    const caption = data.content?.map(b=>b.text||'').join('') || '';
    if(!caption) throw new Error('AI returned an empty caption');
    const hashtags = IG_HASHTAGS[p.cat] || '#sportsgear';
    document.getElementById('igPreviewCaption').textContent = caption;
    document.getElementById('igCopyArea').textContent = caption + '\n\n' + hashtags;
    toast('✨ AI caption ready!', 'green');
  } catch(e) {
    toast('AI unavailable — using template', 'orange');
  }
}

function copyIGCaption() {
  const text = document.getElementById('igCopyArea').textContent;
  navigator.clipboard.writeText(text).then(()=>toast('📋 Copied to clipboard!', 'green')).catch(()=>toast('Select and copy manually', 'orange'));
}

// ─── EXPORT / IMPORT ─────────────────────────────────────────
function exportProducts() {
  const data = { products: getProducts(), categories: getCategories(), settings: getSettings(), exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'apexsport-data.json';
  a.click();
  toast('⬇️ Downloaded!', 'green');
}

function importProducts(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if(!data || typeof data!=='object' ||
        (data.products!==undefined && !Array.isArray(data.products)) ||
        (data.categories!==undefined && !Array.isArray(data.categories)) ||
        (data.settings!==undefined && (typeof data.settings!=='object' || Array.isArray(data.settings)))) {
        throw new Error('Invalid data structure');
      }
      if(data.products) saveProducts(data.products);
      if(data.categories) saveCategories(data.categories);
      if(data.settings) S.set('settings', data.settings);
      initApp();
      e.target.value = '';
      toast('✓ Data imported!', 'green');
    } catch { e.target.value = ''; toast('❌ Invalid JSON file', 'red'); }
  };
  reader.readAsText(file);
}

function resetAll() {
  if(!confirm('⚠️ This will delete ALL products and categories. Are you sure?')) return;
  if(!confirm('Last chance. Really reset everything?')) return;
  localStorage.removeItem('apex_products');
  localStorage.removeItem('apex_categories');
  localStorage.removeItem('apex_settings');
  localStorage.removeItem('apex_creds');
  initApp();
  toast('All data reset', 'red');
}

// ─── CLOSE MODALS ON OVERLAY CLICK ──────────────────────────
document.getElementById('productModal').addEventListener('click', e => { if(e.target===document.getElementById('productModal')) closeProductModal(); });
document.getElementById('catModal').addEventListener('click', e => { if(e.target===document.getElementById('catModal')) closeCatModal(); });

// ─── KEYBOARD SHORTCUTS ──────────────────────────────────────
document.addEventListener('keydown', e => {
  if(e.key==='Escape') { closeProductModal(); closeCatModal(); }
  if(e.key==='n' && (e.ctrlKey||e.metaKey) && document.getElementById('panel-products').classList.contains('active')) {
    e.preventDefault(); openProductModal();
  }
});
