Const SHEET_ID = "1A2I6jODnR99Hwy9ZJXPkGDtAFKfpYwrm3taCWZWoZ7o";
const API_KEY = "AIzaSyBFnyqCW37BUL3qrpGva0hitYUhxE_x5nw";
const SHEET_NAME = "2";
const PAGE_SIZE = 6; // 6 items per page

function qs(sel){return document.querySelector(sel)}

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
    // If a row is shorter than headers, fill missing values with empty string
    headers.forEach((h,i)=>obj[h]=r[i]??"");
    return obj;
  });
  data.forEach((d,i)=>{
    // Using trim() on the ID to ensure clean URL segments for routing
    d._id=(d.id || d.Title || (i+1).toString()).trim(); 
    // REMOVING: d._ts logic since Date column is removed.
  });
  return data;
}

// REMOVING: function sortNewest(arr){...} since Date is removed.

function paginate(items,page=1,pageSize=PAGE_SIZE){
  const total=items.length,pages=Math.max(1,Math.ceil(total/pageSize)),start=(page-1)*pageSize;
  return {pageItems:items.slice(start,start+pageSize),total,pages};
}

// Helper to generate pagination HTML
function renderPagination(totalItems, currentPage, cat, searchQuery = '') {
    const pages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (pages <= 1) return '';
    let html = '';
    
    // Base hash segment changes based on context (category or search)
    let baseHash = '';
    if (searchQuery) {
        // Pagination for search results
        baseHash = `#/search/${encodeURIComponent(searchQuery)}/page/`;
    } else if (cat !== 'all') {
        // Pagination for a specific category
        baseHash = `#/category/${cat}/page/`;
    } else {
        // Pagination for the Home page
        baseHash = `#/page/`;
    }

    for(let i = 1; i <= pages; i++) {
        const hash = `${baseHash}${i}`;
        html += `<a href="javascript:void(0)" class="page-btn ${i === currentPage ? 'active' : ''}" onclick="navigateTo('${hash}')">${i}</a>`;
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

// NEW: Function to get unique categories for the home page listing
async function getUniqueCategories(data) {
    const categories = new Set();
    data.forEach(item => {
        // Use Category column first, then Genre (or any other defined column)
        const catValue = item.Category?.trim() || item.Genre?.trim();
        if (catValue) {
            // Split by comma if multiple categories are listed
            catValue.split(',').forEach(c => {
                const cleanCat = c.trim();
                if (cleanCat) categories.add(cleanCat);
            });
        }
    });
    // Convert set back to array and return
    return Array.from(categories);
}

// NEW: Function to render the category list on the home page
function renderCategoryList(categories) {
    let html = '<div class="category-list-wrap">';
    categories.forEach(cat => {
        const hash = `#/category/${encodeURIComponent(cat)}`;
        html += `<a href="javascript:void(0)" class="category-list-btn" onclick="navigateTo('${hash}')">${cat}</a>`;
    });
    html += '</div>';
    return html;
}


// UPDATED renderHome: Shows all items (unsorted) and category list
async function renderHome(page=1){
  const app=qs('#app');
  let data=await fetchAllRows();
  
  // 1. Get Categories for listing
  const categories = await getUniqueCategories(data);
  const categoryListHtml = renderCategoryList(categories);

  const {pageItems, total}=paginate(data, page, PAGE_SIZE);
  
  // Home Page HTML Structure
  let homeHtml = `<div class="container">
    <div class="header-title-style">
      <h2 class="category-heading">All Titles</h2>
    </div>
    
    ${categoryListHtml} 

    <div id="list" class="grid">${pageItems.map(movieCardHtml).join('')}</div>
    <div id="pagination" class="pagination">${renderPagination(total, page, 'all')}</div>
  </div>`;
  
  app.innerHTML = homeHtml;
}

// NEW: renderSearch function
async function renderSearch(query, page = 1) {
    const app = qs('#app');
    
    app.innerHTML=`
    <div class="container">
      <div class="header-title-style">
        <h2 class="category-heading">Search Results for: "${query}"</h2>
      </div>
      <div id="list" class="grid"></div>
      <div id="pagination" class="pagination"></div>
    </div>`;

    let data = await fetchAllRows();
    const lowerQuery = query.toLowerCase();

    // Filter by Title
    let filtered = data.filter(d => 
        d.Title?.toLowerCase().includes(lowerQuery)
    );
    
    // Sort by newest item (if Date existed, it would go here)
    
    const {pageItems, total} = paginate(filtered, page, PAGE_SIZE);
    
    qs('#list').innerHTML = pageItems.length > 0 
        ? pageItems.map(movieCardHtml).join('') 
        : `<p class="not-found" style="text-align:center; padding: 40px;">No results found for "${query}".</p>`;

    // pagination for search results
    qs('#pagination').innerHTML = renderPagination(total, page, null, query);
}


async function renderCategory(cat,page=1){
  const app=qs('#app');
  // Use professional title structure
  app.innerHTML=`
  <div class="container">
    <div class="header-title-style">
      <h2 class="category-heading">${decodeURIComponent(cat).toUpperCase()}</h2>
    </div>
    <div id="list" class="grid"></div>
    <div id="pagination" class="pagination"></div>
  </div>`;
  
  let data=await fetchAllRows();
  const lowerCat = cat.toLowerCase();
  
  // Filter by Category and Genre (to catch items listed in both columns)
  let filtered=data.filter(d => 
      d.Category?.trim().toLowerCase().includes(lowerCat) || 
      d.Genre?.trim().toLowerCase().includes(lowerCat) 
  );
  
  // No sorting applied since Date column is removed
  const {pageItems,total}=paginate(filtered,page,PAGE_SIZE);
  qs('#list').innerHTML=pageItems.map(movieCardHtml).join('');
  
  // pagination
  qs('#pagination').innerHTML = renderPagination(total, page, cat);
}


// Function to create HTML for watch links (UNCHANGED)
function createWatchLinksHtml(item) {
    // ... (function body remains the same)
    const watchData = item.WatchLink || item.Watch || '';
    if (!watchData) return '';

    const parts = watchData.split('|').map(s => s.trim()).filter(s => s);
    if (parts.length < 2) return ''; 

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

// Function to create HTML for screenshots (UNCHANGED)
function createScreenshotsHtml(item) {
    // ... (function body remains the same)
    const ssData = item.Screenshots || item.Screenshot || '';
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

// UPDATED renderItemDetail (UNCHANGED)
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
  const date = item.Date || 'N/A'; // Date will show N/A if column is removed
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

// UPDATED router function to handle search and category routing
async function router(){
  const parts=getRoute();
  const isDetailPage = parts[0]==='item';
  
  // Always set the class on the body for reliable hiding/showing
  document.body.classList.toggle('detail-page', isDetailPage);

  if(parts[0]==='' || parts[0]==='page'){
    let page=1;
    if(parts[0]==='page') page=Number(parts[1]||1);
    await renderHome(page);
    return;
  }
  
  if(parts[0]==='category'){
    const cat=parts[1]||'all';
    let page=1;
    if(parts[2]==='page')page=Number(parts[3]||1);
    await renderCategory(cat,page);
    return;
  }
  
  // NEW: Handle search routing
  if(parts[0]==='search'){
    const query=parts[1]||'';
    let page=1;
    if(parts[2]==='page')page=Number(parts[3]||1);
    await renderSearch(decodeURIComponent(query), page);
    return;
  }
  
  if(isDetailPage){
    const id=parts[1]||'';
    await renderItemDetail(id);
    return;
  }
  await renderHome(1);
}

// NEW: Search input event listener now routes to the search function
qs('#searchInput')?.addEventListener('keyup',(e)=>{
    if(e.key==='Enter'){
        const q=e.target.value.trim();
        if(q) {
            // New route for search
            window.location.hash=`#/search/${encodeURIComponent(q)}/page/1`;
        }
    }
})

window.addEventListener('hashchange',router)
window.addEventListener('load',router)
                  
