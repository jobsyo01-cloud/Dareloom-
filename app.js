const SHEET_ID = "1A2I6jODnR99Hwy9ZJXPkGDtAFKfpYwrm3taCWZWoZ7o";
const API_KEY = "AIzaSyBFnyqCW37BUL3qrpGva0hitYUhxE_x5nw";
const SHEET_NAME = "2";
const PAGE_SIZE = 6; // UPDATED: 6 items per page

function qs(sel){return document.querySelector(sel)}

// Define the categories that are explicitly in the header (used to filter out sub-categories)
const HEADER_CATEGORIES = [
    'Movie', 'TV Show', 'K-Drama', 'Anime', 'Erotic Movie'
];

async function fetchAllRows(){
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
    d._id=d.id||d.Title||(i+1).toString();
    d._ts=new Date(d.date||"1970-01-01").getTime(); 
  });
  return data;
}

function sortNewest(arr){return arr.sort((a,b)=>(b._ts||0)-(a._ts||0))}

function paginate(items,page=1,pageSize=PAGE_SIZE){
  const total=items.length,pages=Math.max(1,Math.ceil(total/pageSize)),start=(page-1)*pageSize;
  return {pageItems:items.slice(start,start+pageSize),total,pages};
}

function movieCardHtml(item){
  const genre = item.Genre?.split(',')[0] || item.Category;
  const rating = item.Rating || 'N/A';
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

// NEW FUNCTION: Helper to generate pagination HTML
function renderPagination(totalItems, currentPage, cat) {
    const pages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (pages <= 1) return '';
    let html = '';
    // Use the actual navigation function inside onclick
    for(let i = 1; i <= pages; i++) {
        const hash = cat === 'all' ? `#/page/${i}` : `#/category/${cat}/page/${i}`;
        html += `<a href="${hash}" class="page-btn ${i === currentPage ? 'active' : ''}" onclick="navigateTo('${hash}')">${i}</a>`;
    }
    return html;
}


// NEW FUNCTION: Renders a section for a sub-category on the home page
function subCategorySectionHtml(catName, items) {
    if (!items || items.length === 0) return '';
    const displayItems = items.slice(0, 6); // Display max 6 items
    return `
    <div class="category-section">
        <div class="header-title-style sub-category-header">
            <h2 class="category-heading">More: ${catName}</h2>
            <a href="#/category/${encodeURIComponent(catName)}" class="view-all-btn">View All (${items.length}) &rarr;</a>
        </div>
        <div class="grid sub-category-grid">
            ${displayItems.map(movieCardHtml).join('')}
        </div>
    </div>`;
}

// UPDATED renderHome to include pagination and sub-categories
async function renderHome(page=1){
    const app=qs('#app');
    let data=await fetchAllRows();
    data=sortNewest(data);
    
    // 1. Render the main Latest Uploads section with pagination
    const {pageItems, total}=paginate(data, page, PAGE_SIZE);
    
    let homeHtml = `<div class="container">`;
    
    // Main Latest Section
    homeHtml += `
    <div class="header-title-style">
        <h2 class="category-heading">Latest Uploads</h2>
    </div>
    <div id="list" class="grid">${pageItems.map(movieCardHtml).join('')}</div>
    <div id="pagination" class="pagination">${renderPagination(total, page, 'all')}</div>`;

    
    // 2. Separate and Render Dynamic Sub-Categories
    // Get all unique categories (trimming whitespace for safety)
    const allCategories = [...new Set(data.map(d => d.Category?.trim() || '').filter(c => c))];
    
    // Filter out the main header categories to get dynamic sub-categories
    const subCategories = allCategories.filter(cat => 
        !HEADER_CATEGORIES.some(hCat => hCat.toLowerCase() === cat.toLowerCase())
    ).sort();
    
    // Render sections for each sub-category
    subCategories.forEach(cat => {
        const catItems = data.filter(d => d.Category?.trim() === cat);
        homeHtml += subCategorySectionHtml(cat, catItems);
    });
    
    homeHtml += `</div>`;
    app.innerHTML = homeHtml;
}


async function renderCategory(cat,page=1){
  const app=qs('#app');
  app.innerHTML=`
  <div class="container">
    <div class="header-title-style">
      <h2 class="category-heading">${cat.toUpperCase()}</h2>
    </div>
    <div id="list" class="grid"></div>
    <div id="pagination" class="pagination"></div>
  </div>`;
  
  let data=await fetchAllRows();
  
  // CRITICAL FIX: Robust category filter
  let filtered=data.filter(d=>d.Category?.trim().toLowerCase()===cat.toLowerCase());
  
  filtered=sortNewest(filtered);
  const {pageItems,total}=paginate(filtered,page,PAGE_SIZE);
  qs('#list').innerHTML=pageItems.map(movieCardHtml).join('');
  
  // Pagination for category page
  qs('#pagination').innerHTML = renderPagination(total, page, cat);
}

// ... (renderItemDetail remains the same) ...

function navigateTo(hash){window.location.hash=hash}
function getRoute(){return location.hash.replace(/^#\/?/,'').split('/')}

// UPDATED router function to handle home page pagination
async function router(){
  const parts=getRoute();
  const isDetailPage = parts[0]==='item';
  const isHomePage = parts[0]==='' || parts[0]===undefined || parts[0]==='page';
  
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
    const id=decodeURIComponent(parts[1]||'');
    await renderItemDetail(id);
    return;
  }
  await renderHome(1);
}

qs('#searchInput')?.addEventListener('keyup',(e)=>{if(e.key==='Enter'){const q=e.target.value.trim();window.location.hash=`#/category/all/page/1/q/${encodeURIComponent(q)}`}})

window.addEventListener('hashchange',router)
window.addEventListener('load',router)
          
