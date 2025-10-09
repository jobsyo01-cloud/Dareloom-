Const SHEET_ID = "1A2I6jODnR99Hwy9ZJXPkGDtAFKfpYwrm3taCWZWoZ7o";
const API_KEY = "AIzaSyBFnyqCW37BUL3qrpGva0hitYUhxE_x5nw";
const SHEET_NAME = "2";
const PAGE_SIZE = 6; // UPDATED: 6 items per page

function qs(sel){return document.querySelector(sel)}

// We don't need HEADER_CATEGORIES list now since we removed the dynamic sub-category rendering.

async function fetchAllRows(){
  // Fetching data from the Sheet Name "2"
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  const rows = json.values || [];
  if(rows.length < 2) return [];
  const headers = rows[0].map(h=>h.trim());
  const data = rows.slice(1).map(r=>{
    const obj={};
    headers.forEach((h,i)=>obj[h]=r[i]??"");
    return obj;
  });
  data.forEach((d,i)=>{
    // Using trim() on the ID to ensure clean URL segments for routing
    d._id=(d.id || d.Title || (i+1).toString()).trim(); 
    // Use Date to sort (important for "Latest Movie")
    d._ts=new Date(d.date||"1970-01-01").getTime(); 
  });
  return data;
}

function sortNewest(arr){return arr.sort((a,b)=>(b._ts||0)-(a._ts||0))}

function paginate(items,page=1,pageSize=PAGE_SIZE){
  const total=items.length,pages=Math.max(1,Math.ceil(total/pageSize)),start=(page-1)*pageSize;
  return {pageItems:items.slice(start,start+pageSize),total,pages};
}

// NEW FUNCTION: Helper to generate pagination HTML
function renderPagination(totalItems, currentPage, cat) {
    const pages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (pages <= 1) return '';
    let html = '';
    // I am changing the link here for Home to just be /page/ for clarity, it should work fine
    const catSegment = cat === 'all' ? '' : `/category/${cat}`; 
    for(let i = 1; i <= pages; i++) {
        const hash = `${catSegment}/page/${i}`;
        html += `<a href="javascript:void(0)" class="page-btn ${i === currentPage ? 'active' : ''}" onclick="navigateTo('#${hash}')">${i}</a>`;
    }
    return html;
}

function movieCardHtml(item){
  const genre = item.Genre?.split(',')[0] || item.Category;
  const rating = item.Rating || 'N/A';
  // FIX: Ensure correct navigation to the item detail page using navigateTo
  return `
  <div class="card" onclick="navigateTo('#/item/${encodeURIComponent(item._id)}')">
    <img src="${item.Poster||item.poster||''}" alt="${item.Title||item.title}">
    <div class="card-meta">${genre}</div>
    <div class="card-body">
      <h3>${item.Title||item.title}</h3>
      <p>⭐ ${rating}</p>
    </div>
  </div>`;
}

// UPDATED renderHome: Shows only Latest Uploads (6 per page) with pagination
async function renderHome(page=1){
  const app=qs('#app');
  let data=await fetchAllRows();
  data=sortNewest(data); // Home page always shows newest first
  
  const {pageItems, total}=paginate(data, page, PAGE_SIZE);
  
  // Home Page HTML Structure (Only Latest Uploads)
  let homeHtml = `<div class="container">
    <div class="header-title-style">
      <h2 class="category-heading">Latest Uploads</h2>
    </div>
    <div id="list" class="grid">${pageItems.map(movieCardHtml).join('')}</div>
    <div id="pagination" class="pagination">${renderPagination(total, page, 'all')}</div>
  </div>`;
  
  app.innerHTML = homeHtml;
}

async function renderCategory(cat,page=1){
  const app=qs('#app');
  // Use professional title structure
  app.innerHTML=`
  <div class="container">
    <div class="header-title-style">
      <h2 class="category-heading">${cat.toUpperCase()}</h2>
    </div>
    <div id="list" class="grid"></div>
    <div id="pagination" class="pagination"></div>
  </div>`;
  
  let data=await fetchAllRows();
  
  // FIX: Robust category filter - trims spaces from both sides
  let filtered=data.filter(d=>d.Category?.trim().toLowerCase()===cat.toLowerCase());
  
  filtered=sortNewest(filtered);
  const {pageItems,total}=paginate(filtered,page,PAGE_SIZE);
  qs('#list').innerHTML=pageItems.map(movieCardHtml).join('');
  
  // pagination
  qs('#pagination').innerHTML = renderPagination(total, page, cat);
}


// Function to create HTML for watch links
function createWatchLinksHtml(item) {
    // Looks for a column named 'WatchLink' or 'Watch' in the Google Sheet.
    // It is expected to contain multiple links separated by a pipe (|), e.g.,
    // "Streamtape|https://stape.com/link|Telegram|https://t.me/link|Other|https://other.com/link"
    const watchData = item.WatchLink || item.Watch || '';
    if (!watchData) return '';

    const parts = watchData.split('|').map(s => s.trim()).filter(s => s);
    if (parts.length < 2) return ''; // Needs at least a label and a URL

    let html = '<div class="watch-links-section"><h3>Watch Links:</h3><div class="watch-links">';

    for (let i = 0; i < parts.length; i += 2) {
        const label = parts[i];
        const url = parts[i+1];
        if (label && url) {
            html += `<a class="btn btn-watch-dynamic" href="${url}" target="_blank">${label}</a>`;
        }
    }

    html += '</div></div>';
    return html;
}

// Function to create HTML for screenshots
function createScreenshotsHtml(item) {
    // Looks for a column named 'Screenshots' in the Google Sheet.
    // It is expected to contain multiple image URLs separated by a pipe (|), e.g.,
    // "http://img1.com/ss1.jpg|http://img2.com/ss2.jpg|http://img3.com/ss3.jpg"
    const ssData = item.Screenshots || '';
    if (!ssData) return '';

    const screenshots = ssData.split('|').map(s => s.trim()).filter(s => s);
    if (screenshots.length === 0) return '';

    let html = '<div class="screenshot-section"><h3>Screenshots:</h3><div class="screenshots-grid">';
    
    screenshots.forEach(url => {
        html += `<img src="${url}" alt="Screenshot" class="screenshot-img">`;
    });

    html += '</div></div>';
    return html;
}

// UPDATED renderItemDetail: Includes Screenshots and dynamic Watch Links
async function renderItemDetail(id){
  const app=qs('#app');
  let data=await fetchAllRows();
  // Decode the ID before searching
  const item=data.find(d=>(d._id === decodeURIComponent(id)));
  if(!item){app.innerHTML="<p class='not-found'>Item not found</p>";return;}

  const title = item.Title || item.title;
  const description = item.Description || item.description || 'No description available.';
  const category = item.Category || item.category || 'N/A';
  const rating = item.Rating || 'N/A';
  const runtime = item.Runtime || 'N/A';
  const date = item.Date || 'N/A';
  const poster = item.Poster || item.poster;
  
  // NEW: Generate Screenshots HTML
  const screenshotsHtml = createScreenshotsHtml(item);
  
  // NEW: Generate Dynamic Watch Links HTML
  const watchLinksHtml = createWatchLinksHtml(item);


  app.innerHTML=`
  <div class="container detail-container">
    <div class="detail-card">
      <img src="${poster}" alt="${title}" class="detail-poster">
      <div class="detail-meta">
        <h1 class="detail-title">${title}</h1>
        <div class="detail-info-row">
            <span class="info-tag category-tag">${category}</span>
            <span class="info-tag rating-tag">⭐ ${rating}</span>
            <span class="info-tag runtime-tag">🕒 ${runtime}</span>
            <span class="info-tag date-tag">📅 ${date}</span>
        </div>
        <p class="detail-description">${description}</p>
        
        ${watchLinksHtml}

        ${screenshotsHtml}

      </div>
    </div>
  </div>`;
}

function navigateTo(hash){window.location.hash=hash}
function getRoute(){return location.hash.replace(/^#\/?/,'').split('/')}

// UPDATED router function to handle home page pagination
async function router(){
  const parts=getRoute();
  const isDetailPage = parts[0]==='item';
  const isHomePage = parts[0]==='' || parts[0]===undefined || parts[0]==='page';
  
  // Always set the class on the body for reliable hiding/showing
  document.body.classList.toggle('detail-page', isDetailPage);

  if(isHomePage){
    let page=1;
    if(parts[0]==='page') page=Number(parts[1]||1);
    await renderHome(page);
    return;
  }
  if(parts[0]==='category'){
    const cat=decodeURIComponent(parts[1]||'all');
    let page=1;
    if(parts[2]==='page')page=Number(parts[3]||1);
    await renderCategory(cat,page);
    return;
  }
  if(isDetailPage){
    const id=parts[1]||'';
    await renderItemDetail(id);
    return;
  }
  await renderHome(1);
}

// Keeping the search logic simple for now, as full search implementation wasn't requested
qs('#searchInput')?.addEventListener('keyup',(e)=>{if(e.key==='Enter'){const q=e.target.value.trim();window.location.hash=`#/category/all/page/1/q/${encodeURIComponent(q)}`}})

window.addEventListener('hashchange',router)
window.addEventListener('load',router)
  
