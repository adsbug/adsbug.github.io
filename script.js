const SUPABASE_URL = "https://drulftdfhnxjauwfrmxp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uMRmnoxZ452-dOtzJAfsog_L9moxMIq";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------------- static data ---------------- */
const CATEGORIES = ["All","Design & Branding","Web Development"];
const ICON_COLORS = {c1:"#3A1A4A", c2:"#1A3A4A", c3:"#4A3A1A", c4:"#2A2A2A", c5:"#1A4A38"};
const ICON_FG = {c1:"#C88CFF", c2:"#4FA8FF", c3:"#FFB020", c4:"#B4B4B4", c5:"#4ADE80"};
const STATUS_LABEL = {PaymentPending:"Payment Pending Verification", Confirmed:"Confirmed", InProgress:"In Progress", Delivered:"Delivered", Cancelled:"Cancelled"};
const STATUS_CLASS = {PaymentPending:"st-paymentpending", Confirmed:"st-confirmed", InProgress:"st-inprogress", Delivered:"st-delivered", Cancelled:"st-cancelled"};
const SUPPORT_EMAIL = "adsbugshop@gmail.com";
const SUPPORT_PHONE = "+91 9XXXXXXXXX";
const LOGO_URL = "https://adsbug.github.io/logo.png";

/* payment settings */
const UPI_ID = "8609392902-7@airtel";
const UPI_PAYEE_NAME = "Adsbug";
const CRYPTO_ACCEPTED = "USDT, ETH or BNB (ERC-20 / BEP-20 networks)";
const CRYPTO_ADDRESS = "0xf6Ac9a4F10596D1cE4B9F7bde322D103cbA77388";

/* Product images — upload files with these exact names to an "images" folder
   in your GitHub repo (same folder as index.html). If a file is missing, the
   card automatically falls back to the colored icon so nothing ever breaks. */
const IMG_MAP = {
  p1: "images/logo-design.png",
  p2: "images/poster-design.png",
  p3: "images/banner-design.png",
  p4: "images/visiting-card.png",
  p5: "images/website-subdomain.png",
  p6: "images/website-maindomain.png"
};

const FALLBACK_PRODUCTS = [
  {id:"p1", name:"Logo Design", category:"Design & Branding", spec:"1 concept, 2 revisions", price:29, icon:"logo", color:"c1"},
  {id:"p2", name:"Social Media Poster", category:"Design & Branding", spec:"Custom size, 1 revision", price:69, icon:"poster", color:"c2"},
  {id:"p3", name:"Banner Design", category:"Design & Branding", spec:"Print or digital ready", price:149, icon:"banner", color:"c3"},
  {id:"p4", name:"Visiting Card Design", category:"Design & Branding", spec:"Front & back, print ready", price:49, icon:"card", color:"c4"},
  {id:"p5", name:"Single Page Website (Sub-domain)", category:"Web Development", spec:"Hosted on a free sub-domain", price:2999, icon:"website", color:"c5"},
  {id:"p6", name:"Single Page Website (Main Domain)", category:"Web Development", spec:"Hosted on your own domain", price:4999, icon:"website", color:"c5"}
];

/* ---------------- state ---------------- */
let state = {
  products:null, orders:[], cart:{},
  session:null, profile:null,
  route:"home", category:"All", searchQuery:"",
  loading:true, formError:"", infoMsg:"",
  draftOrder:null, payMethod:"upi", logoFallback:false, imgFallback:{},
  wantAdmin:false, resetIdentifier:null
};

/* ---------------- local cart persistence (device-only, non-sensitive) ---------------- */
async function loadCart(){ try{ const c = await window.storage.get("cart", false); state.cart = JSON.parse(c.value); }catch(e){ state.cart = {}; } }
async function saveCart(){ try{ await window.storage.set("cart", JSON.stringify(state.cart), false); }catch(e){} }

/* ---------------- data loading ---------------- */
async function loadProducts(){
  try{
    const {data, error} = await sb.from("products").select("*").order("id");
    if(error || !data || data.length===0) throw error || new Error("empty");
    state.products = data;
  }catch(e){ state.products = FALLBACK_PRODUCTS; }
}
async function loadProfile(){
  if(!state.session){ state.profile = null; return; }
  const {data, error} = await sb.from("profiles").select("*").eq("id", state.session.user.id).single();
  state.profile = error ? null : data;
}
async function loadOrders(){
  if(!state.session || !state.profile){ state.orders = []; return; }
  let q = sb.from("orders").select("*").order("created_at", {ascending:false});
  if(!state.profile.is_admin) q = q.eq("user_id", state.session.user.id);
  const {data, error} = await q;
  state.orders = error ? [] : data;
}

async function loadState(){
  await loadCart();
  await loadProducts();
  const {data:{session}} = await sb.auth.getSession();
  state.session = session;
  await loadProfile();
  await loadOrders();
  state.loading = false;

  if(window.location.hash.includes("type=recovery")){ state.route = "reset-password"; }
  else if(new URLSearchParams(window.location.search).get("admin") === "1"){
    if(!state.session){ state.wantAdmin = true; state.route = "login"; }
    else if(state.profile && state.profile.is_admin){ state.route = "admin"; }
    else { state.route = "admin-denied"; }
  }
  render();

  sb.auth.onAuthStateChange(async (event, session)=>{
    if(event === "PASSWORD_RECOVERY"){ state.session = session; goto("reset-password"); }
  });
}

/* ---------------- helpers ---------------- */
function fmt(n){ return "\u20b9" + Number(n).toLocaleString("en-IN"); }
function cartCount(){ return Object.values(state.cart).reduce((a,b)=>a+b,0); }
function cartTotal(){ let t=0; for(const id in state.cart){ const p=state.products.find(x=>x.id===id); if(p) t+=p.price*state.cart[id]; } return t; }
function showToast(msg){ const old=document.querySelector(".toast"); if(old) old.remove(); const el=document.createElement("div"); el.className="toast"; el.textContent=msg; document.getElementById("app").appendChild(el); setTimeout(()=>el.remove(),2600); }
function goto(route){ state.route=route; state.formError=""; state.infoMsg=""; render(); window.scrollTo(0,0); }
function qrUrl(data){ return "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data="+encodeURIComponent(data); }

/* ---------------- icons ---------------- */
function categoryIconSvg(icon, fg){
  const s = {
    logo:'<circle cx="19" cy="17" r="11" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M13 21 L19 10 L25 21" stroke="'+fg+'" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="15.5" y1="17" x2="22.5" y2="17" stroke="'+fg+'" stroke-width="2.5"/>',
    poster:'<rect x="8" y="6" width="22" height="22" rx="2"/><circle cx="14" cy="13" r="2.5" fill="'+fg+'"/><path d="M9 24 L15 17 L19 21 L24 14 L29 24 Z" fill="'+fg+'"/>',
    banner:'<path d="M6 9 H32 L28 17 L32 25 H6 Z" fill="currentColor"/><rect x="10" y="14" width="14" height="3" rx="1" fill="'+fg+'"/>',
    card:'<rect x="5" y="10" width="28" height="17" rx="3"/><circle cx="12" cy="18.5" r="2.5" fill="'+fg+'"/><rect x="18" y="15" width="11" height="2" rx="1" fill="'+fg+'"/><rect x="18" y="20" width="8" height="2" rx="1" fill="'+fg+'"/>',
    website:'<rect x="5" y="7" width="28" height="21" rx="3"/><rect x="5" y="7" width="28" height="6" rx="3" fill="'+fg+'"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="12.5" cy="10" r="1" fill="currentColor"/>',
    custom:'<rect x="6" y="12" width="26" height="16" rx="3"/><path d="M6 18 H32" stroke="'+fg+'" stroke-width="2"/><path d="M19 12 V28" stroke="'+fg+'" stroke-width="2"/><path d="M12 12 L15 7 H23 L26 12" fill="none" stroke="currentColor" stroke-width="2"/>'
  };
  return '<svg width="38" height="34" viewBox="0 0 38 34" fill="currentColor">'+(s[icon]||s.custom)+'</svg>';
}
function productImageSrc(p){ return p.image_url || IMG_MAP[p.id] || null; }
function productIcon(p){
  const src = productImageSrc(p);
  if(src && !state.imgFallback[p.id]){
    return '<div class="card-icon" style="background:'+ICON_COLORS[p.color]+';"><img src="'+src+'" alt="'+p.name+'" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" onerror="imgFailed(\''+p.id+'\')"></div>';
  }
  return '<div class="card-icon" style="background:'+ICON_COLORS[p.color]+'; color:'+ICON_FG[p.color]+';">'+categoryIconSvg(p.icon, ICON_FG[p.color])+'</div>';
}
function imgFailed(id){ state.imgFallback[id] = true; render(); }
const sparkSvg='<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z" fill="#1E2900"/></svg>';
const cartSvg='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="21" r="1.4" fill="currentColor" stroke="none"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H5.2"/></svg>';
const userSvg='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';
const searchSvg='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
const backSvg='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
const boxSvg='<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';
function logoFailed(){ state.logoFallback = true; render(); }
function brandLogo(){
  if(state.logoFallback) return '<div class="brand-logo-fallback">'+sparkSvg+'</div>';
  return '<img class="brand-logo" src="'+LOGO_URL+'" alt="Adsbug logo" onerror="logoFailed()">';
}

/* ---------------- header ---------------- */
function renderHeader(){
  return `
  <div class="topbar">
    <div class="topbar-row">
      <div class="brand" onclick="goto('home')">
        ${brandLogo()}
        <div><div class="brand-name">Adsbug</div><div class="brand-tag">Creative designs that make your brand stand out</div></div>
      </div>
      <div class="top-actions">
        <button class="icon-btn" onclick="goto('cart')" aria-label="cart">${cartSvg}${cartCount()>0 ? '<span class="badge">'+cartCount()+'</span>' : ''}</button>
        <button class="icon-btn" onclick="goto(state.session?'dashboard':'login')" aria-label="account">${userSvg}</button>
      </div>
    </div>
    <div class="search-row">
      ${searchSvg}
      <input id="search-input" placeholder="Search services... e.g. logo, banner, website" value="${state.searchQuery}" oninput="onSearch(this.value)">
    </div>
  </div>`;
}
function onSearch(v){ state.searchQuery = v; if(state.route!=="home") state.route="home"; render(); document.getElementById("search-input").focus(); document.getElementById("search-input").setSelectionRange(v.length, v.length); }

/* ---------------- home ---------------- */
function viewHome(){
  if(state.searchQuery.trim().length > 0){
    const q = state.searchQuery.trim().toLowerCase();
    const results = state.products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    return `
    <h2 class="section-title">Results for "${state.searchQuery}" <span class="sub">${results.length} services</span></h2>
    ${results.length===0 ? `<div class="empty">${boxSvg}<div>No services found</div></div>` : `<div class="grid">${results.map(p=>productCard(p)).join("")}</div>`}
    `;
  }
  const filtered = state.category==="All" ? state.products : state.products.filter(p=>p.category===state.category);
  return `
  <div class="hero">
    <h1>Fast, affordable & professional design services</h1>
    <p>Logos, posters, banners, visiting cards and websites — order online and get your files delivered digitally.</p>
    <div class="hero-underline"></div>
  </div>
  <div class="chips">${CATEGORIES.map(c=>`<div class="chip ${c===state.category?'active':''}" onclick="setCategory('${c}')">${c}</div>`).join("")}</div>
  <h2 class="section-title">${state.category==="All"?"All Services":state.category}</h2>
  <div class="grid">${filtered.map(p=>productCard(p)).join("")}</div>
  `;
}
function productCard(p){
  const qty = state.cart[p.id] || 0;
  return `
  <div class="card">
    ${productIcon(p)}
    <div class="card-name">${p.name}</div>
    <div class="card-spec">${p.spec}</div>
    <div class="card-price">${fmt(p.price)}</div>
    ${qty>0
      ? `<div class="stepper"><button onclick="changeQty('${p.id}',-1)">&minus;</button><span>${qty}</span><button onclick="changeQty('${p.id}',1)">+</button></div>`
      : `<button class="add-btn" onclick="changeQty('${p.id}',1)">Order Now</button>`
    }
  </div>`;
}
function setCategory(c){ state.category = c; render(); }
function changeQty(id, delta){
  const cur = state.cart[id] || 0;
  let next = cur + delta;
  if(next < 0) next = 0;
  if(next === 0) delete state.cart[id]; else state.cart[id] = next;
  saveCart(); render();
  if(delta>0) showToast("Added to cart");
}

/* ---------------- cart ---------------- */
function viewCart(){
  const ids = Object.keys(state.cart);
  if(ids.length===0) return `<div class="back-row" onclick="goto('home')">${backSvg} Back to home</div><div class="empty">${boxSvg}<div>Your cart is empty</div></div>`;
  const items = ids.map(id=>{
    const p = state.products.find(x=>x.id===id);
    if(!p) return "";
    return `
    <div class="cart-item">
      <div class="ci-icon" style="background:${ICON_COLORS[p.color]}; color:${ICON_FG[p.color]};">${categoryIconSvg(p.icon, ICON_FG[p.color])}</div>
      <div class="ci-info"><div class="ci-name">${p.name}</div><div class="ci-price">${fmt(p.price)} &times; ${state.cart[id]}</div></div>
      <div class="stepper" style="min-width:88px;"><button onclick="changeQty('${p.id}',-1)">&minus;</button><span>${state.cart[id]}</span><button onclick="changeQty('${p.id}',1)">+</button></div>
    </div>`;
  }).join("");
  return `
  <div class="back-row" onclick="goto('home')">${backSvg} Continue browsing</div>
  <div class="page">
    <h2>Your Cart</h2>
    ${items}
    <div class="cart-summary">
      <div class="cart-row total"><span>Total</span><span>${fmt(cartTotal())}</span></div>
    </div>
    <button class="btn-primary" onclick="goto('${state.session?'checkout':'login'}')">Proceed to checkout</button>
  </div>`;
}

/* ---------------- auth ---------------- */
function viewLogin(){
  return `
  <div class="back-row" onclick="goto('home')">${backSvg} Back to home</div>
  <div class="page">
    <h2>Log In</h2>
    <div class="field"><label>Mobile number or email</label><input id="li-id" placeholder="98XXXXXXXX or you@gmail.com"></div>
    <div class="field"><label>Password</label><input id="li-pass" type="password" placeholder="Your password"></div>
    ${state.formError ? `<div class="error-msg">${state.formError}</div>` : ""}
    <button class="btn-primary" id="li-btn" onclick="doLogin()">Log In</button>
    <div class="switch-line"><b onclick="goto('forgot-password')">Forgot password?</b></div>
    <div class="switch-line">New here? <b onclick="goto('signup')">Create an account</b></div>
  </div>`;
}
function viewSignup(){
  return `
  <div class="back-row" onclick="goto('login')">${backSvg} Back to login</div>
  <div class="page">
    <h2>Create Account</h2>
    <div class="field"><label>Full name</label><input id="su-name" type="text" placeholder="Your name"></div>
    <div class="field"><label>Mobile number</label><input id="su-mobile" type="tel" placeholder="98XXXXXXXX"></div>
    <div class="field"><label>Email (used for login & password reset)</label><input id="su-email" type="email" placeholder="you@gmail.com"></div>
    <div class="field"><label>Password</label><input id="su-pass" type="password" placeholder="Choose a password (min 6 characters)"></div>
    ${state.formError ? `<div class="error-msg">${state.formError}</div>` : ""}
    <button class="btn-primary" id="su-btn" onclick="doSignup()">Create Account</button>
    <div class="switch-line">Already have an account? <b onclick="goto('login')">Log in</b></div>
  </div>`;
}
async function doLogin(){
  const idf = document.getElementById("li-id").value.trim();
  const pass = document.getElementById("li-pass").value;
  if(!idf || !pass){ state.formError="Enter your mobile number/email and password"; render(); return; }
  const btn = document.getElementById("li-btn"); btn.disabled = true; btn.textContent = "Logging in...";
  let email = idf;
  if(!idf.includes("@")){
    const {data, error} = await sb.rpc("get_email_by_mobile", {p_mobile: idf});
    if(error || !data){ state.formError="No account found with that mobile number"; render(); return; }
    email = data;
  }
  const {data, error} = await sb.auth.signInWithPassword({email, password: pass});
  if(error){ state.formError = "Incorrect mobile/email or password"; render(); return; }
  state.session = data.session;
  await loadProfile();
  await loadOrders();
  showToast("Logged in successfully");
  if(state.wantAdmin){
    state.wantAdmin = false;
    goto(state.profile && state.profile.is_admin ? "admin" : "admin-denied");
  } else {
    goto("dashboard");
  }
}
async function doSignup(){
  const name = document.getElementById("su-name").value.trim();
  const mobile = document.getElementById("su-mobile").value.trim();
  const email = document.getElementById("su-email").value.trim();
  const pass = document.getElementById("su-pass").value;
  if(!name || !mobile || !email || !pass){ state.formError="Fill in all fields"; render(); return; }
  if(mobile.length < 10){ state.formError="Enter a valid mobile number"; render(); return; }
  if(pass.length < 6){ state.formError="Password must be at least 6 characters"; render(); return; }
  const btn = document.getElementById("su-btn"); btn.disabled = true; btn.textContent = "Creating account...";
  const {data:existing} = await sb.rpc("get_email_by_mobile", {p_mobile: mobile});
  if(existing){ state.formError="An account already exists with this mobile number"; render(); return; }
  const {data, error} = await sb.auth.signUp({email, password: pass, options:{data:{name, mobile}}});
  if(error){ state.formError = error.message; render(); return; }
  if(data.session){
    state.session = data.session;
    await loadProfile();
    await loadOrders();
    showToast("Account created");
    goto("dashboard");
  } else {
    state.infoMsg = "Account created! Please check your email to confirm your account, then log in.";
    goto("login");
  }
}
async function doLogout(){ await sb.auth.signOut(); state.session=null; state.profile=null; state.orders=[]; goto("home"); }

/* ---------------- forgot / reset password (real Supabase email) ---------------- */
function viewForgotPassword(){
  return `
  <div class="back-row" onclick="goto('login')">${backSvg} Back to login</div>
  <div class="page">
    <h2>Forgot Password</h2>
    <p style="color:var(--muted); font-size:13.5px; margin-top:-8px; margin-bottom:16px;">Enter the mobile number or email you signed up with. We'll email you a password reset link.</p>
    <div class="field"><label>Mobile number or email</label><input id="fp-id" placeholder="98XXXXXXXX or you@gmail.com"></div>
    ${state.formError ? `<div class="error-msg">${state.formError}</div>` : ""}
    <button class="btn-primary" id="fp-btn" onclick="submitForgotPassword()">Send Reset Link</button>
  </div>`;
}
async function submitForgotPassword(){
  const idf = document.getElementById("fp-id").value.trim();
  if(!idf){ state.formError="Enter your mobile number or email"; render(); return; }
  const btn = document.getElementById("fp-btn"); btn.disabled = true; btn.textContent = "Sending...";
  let email = idf;
  if(!idf.includes("@")){
    const {data, error} = await sb.rpc("get_email_by_mobile", {p_mobile: idf});
    if(error || !data){ state.formError="No account found with that mobile number"; render(); return; }
    email = data;
  }
  const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: window.location.origin + window.location.pathname});
  if(error){ state.formError = error.message; render(); return; }
  state.resetIdentifier = email;
  goto("reset-sent");
}
function viewResetSent(){
  return `
  <div class="page">
    <h2>Check Your Email</h2>
    <div class="reset-note">
      We've sent a password reset link to <b style="color:var(--text);">${state.resetIdentifier}</b>. Open your email and click the link to set a new password.
    </div>
    <button class="btn-secondary" onclick="goto('login')">Back to login</button>
  </div>`;
}
function viewResetPassword(){
  return `
  <div class="page">
    <h2>Set New Password</h2>
    <p style="color:var(--muted); font-size:13.5px; margin-top:-8px; margin-bottom:16px;">Choose a new password for your account.</p>
    <div class="field"><label>New password</label><input id="rp-pass1" type="password" placeholder="New password"></div>
    <div class="field"><label>Confirm new password</label><input id="rp-pass2" type="password" placeholder="Confirm new password"></div>
    ${state.formError ? `<div class="error-msg">${state.formError}</div>` : ""}
    <button class="btn-primary" onclick="submitResetPassword()">Update Password</button>
  </div>`;
}
async function submitResetPassword(){
  const p1 = document.getElementById("rp-pass1").value;
  const p2 = document.getElementById("rp-pass2").value;
  if(!p1 || !p2){ state.formError="Enter and confirm your new password"; render(); return; }
  if(p1 !== p2){ state.formError="Passwords do not match"; render(); return; }
  if(p1.length < 6){ state.formError="Password must be at least 6 characters"; render(); return; }
  const {error} = await sb.auth.updateUser({password: p1});
  if(error){ state.formError = error.message; render(); return; }
  window.location.hash = "";
  await loadProfile();
  await loadOrders();
  showToast("Password updated");
  goto("dashboard");
}

/* ---------------- checkout ---------------- */
function viewCheckout(){
  const u = state.profile;
  const ids = Object.keys(state.cart);
  if(ids.length===0) return `<div class="page"><h2>Checkout</h2><div class="empty">${boxSvg}<div>Your cart is empty</div></div></div>`;
  return `
  <div class="back-row" onclick="goto('cart')">${backSvg} Back to cart</div>
  <div class="page">
    <h2>Project Details</h2>
    <div class="field"><label>Your name</label><input id="co-name" value="${u.name}"></div>
    <div class="field"><label>Mobile number</label><input id="co-mobile" value="${u.mobile}"></div>
    <div class="field"><label>Describe your requirements</label><textarea id="co-details" placeholder="Business name, colors, style preferences, reference links, etc."></textarea></div>
    <div class="cart-summary">
      <div class="cart-row"><span>Items (${cartCount()})</span><span>${fmt(cartTotal())}</span></div>
      <div class="cart-row total"><span>Total payable</span><span>${fmt(cartTotal())}</span></div>
    </div>
    <button class="btn-primary" onclick="goToPayment()">Continue to Payment</button>
  </div>`;
}
function goToPayment(){
  const name = document.getElementById("co-name").value.trim();
  const mobile = document.getElementById("co-mobile").value.trim();
  const details = document.getElementById("co-details").value.trim();
  if(!name || !mobile){ showToast("Please fill in your name and mobile number"); return; }
  state.draftOrder = {name, mobile, details};
  goto("payment");
}

/* ---------------- payment ---------------- */
function viewPayment(){
  if(!state.draftOrder) return `<div class="page"><h2>Payment</h2><div class="empty">${boxSvg}<div>No order in progress</div></div></div>`;
  const amount = cartTotal();
  const upiString = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Adsbug Order')}`;
  return `
  <div class="back-row" onclick="goto('checkout')">${backSvg} Back</div>
  <div class="page">
    <h2>Pay for Your Order</h2>
    <div class="pay-tabs">
      <div class="pay-tab ${state.payMethod==='upi'?'active':''}" onclick="setPayMethod('upi')">Pay via UPI</div>
      <div class="pay-tab ${state.payMethod==='crypto'?'active':''}" onclick="setPayMethod('crypto')">Pay via Crypto</div>
    </div>
    ${state.payMethod==='upi' ? `
    <div class="qr-box">
      <img src="${qrUrl(upiString)}" alt="UPI QR code">
      <div class="qr-amount">${fmt(amount)}</div>
      <div style="font-size:12.5px; color:var(--muted); margin-top:4px;">Scan with any UPI app (GPay, PhonePe, Paytm)</div>
      <div class="qr-id">${UPI_ID}</div>
    </div>` : `
    <div class="qr-box">
      <img src="${qrUrl(CRYPTO_ADDRESS)}" alt="Crypto wallet QR code">
      <div class="qr-amount">${fmt(amount)}</div>
      <div style="font-size:12.5px; color:var(--muted); margin-top:4px;">Send the equivalent value in ${CRYPTO_ACCEPTED} to this address</div>
      <div class="qr-id">${CRYPTO_ADDRESS}</div>
    </div>`}
    <div class="pay-note">After paying, tap the button below. Our team verifies the payment and confirms your order shortly — this keeps both you and us protected from fake or failed payments.</div>
    <button class="btn-primary" id="pay-btn" onclick="finalizePayment()">I've Completed the Payment</button>
  </div>`;
}
function setPayMethod(m){ state.payMethod = m; render(); }
async function finalizePayment(){
  const d = state.draftOrder;
  const items = Object.keys(state.cart).map(id=>{ const p=state.products.find(x=>x.id===id); return {id, name:p.name, price:p.price, qty:state.cart[id]}; });
  const orderCode = "ADB" + Date.now().toString().slice(-7);
  const btn = document.getElementById("pay-btn"); btn.disabled = true; btn.textContent = "Placing order...";
  const {error} = await sb.from("orders").insert({
    order_code: orderCode, user_id: state.session.user.id, name:d.name, mobile:d.mobile,
    details:d.details, items, total: cartTotal(), pay_method: state.payMethod, status:"PaymentPending"
  });
  if(error){ showToast("Something went wrong placing your order, please try again"); btn.disabled=false; btn.textContent="I've Completed the Payment"; return; }
  await loadOrders();
  state.cart = {}; saveCart();
  state.draftOrder = null;
  showToast("Payment received! We'll confirm your order shortly.");
  goto("dashboard");
}

/* ---------------- dashboard ---------------- */
function viewDashboard(){
  const u = state.profile;
  if(!u) return `<div class="page"><div class="empty">${boxSvg}<div>Loading your account...</div></div></div>`;
  return `
  <div class="page">
    <h2>My Account</h2>
    <div class="account-box">
      <div class="name">${u.name}</div><div class="sub">${u.mobile}</div>${u.email ? `<div class="sub">${u.email}</div>` : ""}
      <div style="margin-top:12px;"><button class="btn-danger" onclick="doLogout()">Log Out</button></div>
    </div>
    <h2 style="font-size:19px; margin-bottom:12px;">My Orders</h2>
    ${state.orders.length===0 ? `<div class="empty">${boxSvg}<div>No orders yet</div></div>` : state.orders.map(orderCard).join("")}
  </div>`;
}
function orderCard(o){
  const d = new Date(o.created_at);
  const itemsText = o.items.map(i=>i.name+" x"+i.qty).join(", ");
  return `
  <div class="order-card">
    <div class="order-top">
      <div><div class="order-id">#${o.order_code}</div><div class="order-date">${d.toLocaleDateString("en-IN")}</div></div>
      <div class="status-pill ${STATUS_CLASS[o.status]}">${STATUS_LABEL[o.status]}</div>
    </div>
    <div class="order-items">${itemsText}</div>
    ${o.details ? `<div class="order-detail">${o.details}</div>` : ""}
    <div class="order-foot"><span style="color:var(--muted); font-size:13px;">Total</span><span style="font-weight:700;">${fmt(o.total)}</span></div>
    ${o.deliverable_url ? `<a class="deliverable-btn" href="${o.deliverable_url}" target="_blank" rel="noopener">Download Your File${o.deliverable_name ? " ("+o.deliverable_name+")" : ""}</a>` : ""}
  </div>`;
}

/* ---------------- admin ---------------- */
function viewAdminDenied(){
  return `
  <div class="page">
    <h2>Not Authorized</h2>
    <div class="empty">${boxSvg}<div>This account doesn't have admin access.</div></div>
    <button class="btn-secondary" onclick="goto('home')">Back to home</button>
  </div>`;
}
function viewAdmin(){
  return `
  <div class="page">
    <h2>Admin Panel</h2>
    <div class="admin-tabs">
      <div class="admin-tab ${state.adminTab!=='products'?'active':''}" onclick="setAdminTab('orders')">Orders (${state.orders.length})</div>
      <div class="admin-tab ${state.adminTab==='products'?'active':''}" onclick="setAdminTab('products')">Services</div>
    </div>
    <div style="padding-top:16px;">
      ${state.adminTab==='products' ? adminProducts() : adminOrders()}
    </div>
    <button class="btn-secondary" style="margin-top:10px;" onclick="goto('home')">Exit admin</button>
  </div>`;
}
function setAdminTab(t){ state.adminTab = t; render(); }
function adminOrders(){
  if(state.orders.length===0) return `<div class="empty">${boxSvg}<div>No orders yet</div></div>`;
  return state.orders.map(o=>{
    const d = new Date(o.created_at);
    const itemsText = o.items.map(i=>i.name+" x"+i.qty).join(", ");
    return `
    <div class="admin-order">
      <div class="order-top">
        <div><div class="order-id">#${o.order_code}</div><div class="order-date">${d.toLocaleDateString("en-IN")} ${d.toLocaleTimeString("en-IN")}</div></div>
        <div class="status-pill ${STATUS_CLASS[o.status]}">${STATUS_LABEL[o.status]}</div>
      </div>
      <div class="cust">${o.name} &middot; ${o.mobile} &middot; paid via ${o.pay_method==='crypto'?'Crypto':'UPI'}</div>
      ${o.details ? `<div class="order-detail">${o.details}</div>` : ""}
      <div class="order-items">${itemsText}</div>
      <div class="order-foot"><span style="font-weight:700;">${fmt(o.total)}</span>
      <select onchange="updateOrderStatus('${o.id}', this.value)">
        ${Object.keys(STATUS_LABEL).map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${STATUS_LABEL[s]}</option>`).join("")}
      </select></div>
      <div class="deliver-box">
        ${o.deliverable_url ? `<div class="deliver-status">Delivered: ${o.deliverable_name||'file'}</div>` : ""}
        <label>Upload finished file (images/PDF, up to 20MB)</label>
        <input type="file" id="file-${o.id}" accept="image/*,.pdf,.zip">
        <label>Or paste a file link (Google Drive, Dropbox, etc.)</label>
        <input type="text" id="link-${o.id}" placeholder="https://drive.google.com/..." value="">
        <button onclick="saveDeliverable('${o.id}','${o.order_code}')">Save & Deliver</button>
      </div>
    </div>`;
  }).join("");
}
async function saveDeliverable(orderId, orderCode){
  const fileInput = document.getElementById("file-"+orderId);
  const linkInput = document.getElementById("link-"+orderId);
  const link = linkInput.value.trim();
  const file = fileInput.files[0];
  if(file){
    if(file.size > 20*1024*1024){ showToast("File too large — please keep it under 20MB or use a link instead"); return; }
    const path = `${orderCode}/${file.name}`;
    const {error: upErr} = await sb.storage.from("deliverables").upload(path, file, {upsert:true});
    if(upErr){ showToast("Upload failed: "+upErr.message); return; }
    const {data:pub} = sb.storage.from("deliverables").getPublicUrl(path);
    const {error} = await sb.from("orders").update({deliverable_url: pub.publicUrl, deliverable_name: file.name}).eq("id", orderId);
    if(error){ showToast("Saved file but failed to link it to the order"); return; }
    showToast("File delivered — customer can now download it from their account");
    await loadOrders(); render();
  } else if(link){
    const {error} = await sb.from("orders").update({deliverable_url: link, deliverable_name: null}).eq("id", orderId);
    if(error){ showToast("Failed to save link"); return; }
    showToast("Link saved — customer can now view it from their account");
    await loadOrders(); render();
  } else {
    showToast("Choose a file or paste a link first");
  }
}
async function updateOrderStatus(orderId, status){
  const {error} = await sb.from("orders").update({status}).eq("id", orderId);
  if(error){ showToast("Failed to update status"); return; }
  showToast("Order status updated");
  await loadOrders(); render();
}
function adminProducts(){
  const rows = state.products.map(p=>`
    <div class="prod-row">
      <div class="pr-icon" style="background:${ICON_COLORS[p.color]}; color:${ICON_FG[p.color]}; overflow:hidden;">${productImageSrc(p) && !state.imgFallback[p.id] ? '<img src="'+productImageSrc(p)+'" style="width:100%;height:100%;object-fit:cover;" onerror="imgFailed(\''+p.id+'\')">' : categoryIconSvg(p.icon, ICON_FG[p.color]).replace('width="38" height="34"','width="20" height="18"')}</div>
      <div class="pr-name">${p.name}</div>
      <input type="number" id="price-${p.id}" value="${p.price}">
      <button onclick="saveProductEdit('${p.id}')">Save</button>
      <button onclick="deleteProduct('${p.id}')" style="background:var(--danger); color:#fff; margin-left:4px;">Delete</button>
    </div>
  `).join("");
  return rows + `
    <div class="add-product-box">
      <h3 style="font-size:16px; margin-bottom:12px;">Add a New Service</h3>
      <div class="field"><label>Service name</label><input id="np-name" placeholder="e.g. Instagram Reel Editing"></div>
      <div class="field"><label>Category</label><select id="np-category">${CATEGORIES.filter(c=>c!=="All").map(c=>`<option value="${c}">${c}</option>`).join("")}</select></div>
      <div class="field"><label>Short description</label><input id="np-spec" placeholder="e.g. Up to 60 seconds, 1 revision"></div>
      <div class="field"><label>Price (₹)</label><input type="number" id="np-price" placeholder="e.g. 199"></div>
      <div class="field"><label>Image (optional but recommended)</label><input type="file" id="np-image" accept="image/*"></div>
      <button class="btn-primary" onclick="addProduct()">Add Service</button>
    </div>
  `;
}
async function saveProductEdit(id){
  const price = Number(document.getElementById("price-"+id).value);
  if(price < 0) return;
  const {error} = await sb.from("products").update({price}).eq("id", id);
  if(error){ showToast("Failed to update price"); return; }
  await loadProducts();
  showToast("Service updated"); render();
}
async function deleteProduct(id){
  if(!confirm("Delete this service? This can't be undone.")) return;
  const {error} = await sb.from("products").delete().eq("id", id);
  if(error){ showToast("Failed to delete service"); return; }
  await loadProducts();
  showToast("Service deleted"); render();
}
async function addProduct(){
  const name = document.getElementById("np-name").value.trim();
  const category = document.getElementById("np-category").value;
  const spec = document.getElementById("np-spec").value.trim();
  const price = Number(document.getElementById("np-price").value);
  const file = document.getElementById("np-image").files[0];
  if(!name || !price){ showToast("Enter at least a name and price"); return; }
  const id = "c" + Date.now().toString(36);
  let image_url = null;
  if(file){
    if(file.size > 5*1024*1024){ showToast("Image too large — please keep it under 5MB"); return; }
    const path = `${id}/${file.name}`;
    const {error: upErr} = await sb.storage.from("products").upload(path, file, {upsert:true});
    if(upErr){ showToast("Image upload failed: "+upErr.message); return; }
    const {data:pub} = sb.storage.from("products").getPublicUrl(path);
    image_url = pub.publicUrl;
  }
  const colorKeys = Object.keys(ICON_COLORS);
  const color = colorKeys[Math.floor(Math.random()*colorKeys.length)];
  const {error} = await sb.from("products").insert({id, name, category, spec, price, icon:"custom", color, image_url});
  if(error){ showToast("Failed to add service: "+error.message); return; }
  await loadProducts();
  showToast("Service added");
  render();
}

/* ---------------- footer ---------------- */
function renderFooter(){
  return `
  <div class="site-footer">
    <div class="ft-block">
      <div class="ft-title">Adsbug</div>
      Creative designs that make your brand stand out — fast, affordable & professional.
    </div>
    <div class="ft-block">
      <div class="ft-title">Need help?</div>
      Email ${SUPPORT_EMAIL} &middot; Call ${SUPPORT_PHONE}
    </div>
    <div class="ft-bottom">&copy; Adsbug &mdash; All rights reserved</div>
  </div>`;
}

/* ---------------- router ---------------- */
function render(){
  const app = document.getElementById("app");
  if(state.loading){ app.innerHTML = `<div style="padding:60px; text-align:center; color:var(--muted);">Loading...</div>`; return; }
  if(state.route==="admin" && !(state.profile && state.profile.is_admin)){ state.route = state.session ? "admin-denied" : "login"; }
  if((state.route==="dashboard" || state.route==="checkout" || state.route==="payment") && !state.session){ state.route="login"; }

  let body = "";
  switch(state.route){
    case "home": body = viewHome(); break;
    case "cart": body = viewCart(); break;
    case "login": body = (state.infoMsg ? `<div class="page"><div class="reset-note">${state.infoMsg}</div></div>` : "") + viewLogin(); break;
    case "signup": body = viewSignup(); break;
    case "checkout": body = viewCheckout(); break;
    case "payment": body = viewPayment(); break;
    case "forgot-password": body = viewForgotPassword(); break;
    case "reset-sent": body = viewResetSent(); break;
    case "reset-password": body = viewResetPassword(); break;
    case "dashboard": body = viewDashboard(); break;
    case "admin-denied": body = viewAdminDenied(); break;
    case "admin": body = viewAdmin(); break;
    default: body = viewHome();
  }
  const showFooter = state.route==="home";
  app.innerHTML = renderHeader() + body + (showFooter ? renderFooter() : "");
}

loadState();
