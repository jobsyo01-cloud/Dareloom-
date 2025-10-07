const SHEET_ID = "1A2I6jODnR99Hwy9ZJXPkGDtAFKfpYwrm3taCWZWoZ7o";
const API_KEY = "AIzaSyBFnyqCW37BUL3qrpGva0hitYUhxE_x5nw";
const SHEET_NAME = "2"; // Confirmed Sheet Name
const PAGE_SIZE = 12;

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
    headers.forEach((h,i)=>obj[h]=r[i]??"");
    return obj;
  });
  data.forEach((d,i)=>{
    d._id=d.id||d.Title||(i+1).toString();
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

async function renderHome(){
  const app=qs('#app');
  app.innerHTML=`<div class="container"><div id="list" class="grid"></div><div id="pagination" class="pagination"></div></div>`;
  let data=await fetchAllRows();
  data=sortNewest(data); // Home page always shows newest first
  const {pageItems}=paginate(data,1,PAGE_SIZE);
  qs('#list').innerHTML=pageItems.map(movieCardHtml).join('');
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
  const {pageItems,pages}=paginate(filtered,page,PAGE_SIZE);
  qs('#list').innerHTML=pageItems.map(movieCardHtml).join('');
  
  // pagination
  const p=qs('#pagination');
  let html='';
  for(let i=1;i<=pages;i++) html+=`<a href="javascript:void(0)" class="page-btn ${i===page?'active':''}" onclick="navigateTo('#/category/${cat}/page/${i}')">${i}</a>`;
  p.innerHTML=html;
}

async function renderItemDetail(id){
  const app=qs('#app');
  let data=await fetchAllRows();
  const item=data.find(d=>(d._id==id));
  if(!item){app.innerHTML="<p class='not-found'>Item not found</p>";return;}

  const title = item.Title || item.title;
  const description = item.Description || item.description || 'No description available.';
  const category = item.Category || item.category || 'N/A';
  const rating = item.Rating || 'N/A';
  const runtime = item.Runtime || 'N/A';
  const date = item.Date || 'N/A';
  const poster = item.Poster || item.poster;

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
        <a class="btn btn-watch" href="${item.Watch||item.watch}" target="_blank">▶️ Watch Now</a>
      </div>
    </div>
  </div>`;
}

function navigateTo(hash){window.location.hash=hash}
function getRoute(){return location.hash.replace(/^#\/?/,'').split('/')}

async function router(){
  const parts=getRoute();
  const isDetailPage = parts[0]==='item';
  
  // Always set the class on the body for reliable hiding/showing
  document.body.classList.toggle('detail-page', isDetailPage);

  if(parts.length===1&&(parts[0]===''||parts[0]===undefined)){await renderHome();return;}
  if(parts[0]==='category'){const cat=decodeURIComponent(parts[1]||'all');let page=1;if(parts[2]==='page')page=Number(parts[3]||1);await renderCategory(cat,page);return;}
  if(isDetailPage){const id=decodeURIComponent(parts[1]||'');await renderItemDetail(id);return;}
  await renderHome();
}

qs('#searchInput')?.addEventListener('keyup',(e)=>{if(e.key==='Enter'){const q=e.target.value.trim();window.location.hash=`#/category/all/page/1/q/${encodeURIComponent(q)}`}})

window.addEventListener('hashchange',router)
window.addEventListener('load',router)
