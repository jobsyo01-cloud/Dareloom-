const SHEET_ID = "1A2I6jODnR99Hwy9ZJXPkGDtAFKfpYwrm3taCWZWoZ7o";
const API_KEY = "AIzaSyBFnyqCW37BUL3qrpGva0hitYUhxE_x5nw";
const SHEET_NAME = "2";
const PAGE_SIZE = 12;

function qs(sel){return document.querySelector(sel)}

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
  return `
  <div class="card" onclick="navigateTo('#/item/${encodeURIComponent(item._id)}')">
    <img src="${item.Poster||item.poster||''}" alt="${item.Title||item.title}">
    <div class="card-body">
      <h3>${item.Title||item.title}</h3>
      <p>${item.Category||item.category||''}</p>
    </div>
  </div>`;
}

async function renderHome(){
  const app=qs('#app');
  app.innerHTML=`<div class="container"><div id="list" class="grid"></div><div id="pagination" class="pagination"></div></div>`;
  let data=await fetchAllRows();
  data=sortNewest(data);
  const {pageItems}=paginate(data,1,PAGE_SIZE);
  qs('#list').innerHTML=pageItems.map(movieCardHtml).join('');
}

async function renderCategory(cat,page=1){
  const app=qs('#app');
  app.innerHTML=`<div class="container"><div class="header-title"><h2>${cat}</h2></div><div id="list" class="grid"></div><div id="pagination" class="pagination"></div></div>`;
  let data=await fetchAllRows();
  // Note: This filter looks for an EXACT match (case-insensitive)
  // Ensure your Google Sheet's Category column matches the nav links (e.g., 'Movie')
  let filtered=data.filter(d=>d.Category?.toLowerCase()===cat.toLowerCase());
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
  if(!item){app.innerHTML="<p>Item not found</p>";return;}
  app.innerHTML=`
  <div class="container">
    <div class="detail">
      <img src="${item.Poster||item.poster}" alt="${item.Title||item.title}">
      <div class="meta">
        <h1>${item.Title||item.title}</h1>
        <p><strong>Category:</strong> ${item.Category||item.category}</p>
        <p>${item.Description||item.description||''}</p>
        <a class="btn" href="${item.Watch||item.watch}" target="_blank">Watch Now</a>
      </div>
    </div>
  </div>`;
}

function navigateTo(hash){window.location.hash=hash}
function getRoute(){return location.hash.replace(/^#\/?/,'').split('/')}

// UPDATED router function to manage the 'detail-page' class on the body
async function router(){
  const parts=getRoute();
  const isDetailPage = parts[0]==='item';
  
  // Toggle the class on the body element to show/hide header and buttons
  document.body.classList.toggle('detail-page', isDetailPage);

  if(parts.length===1&&(parts[0]===''||parts[0]===undefined)){await renderHome();return;}
  if(parts[0]==='category'){const cat=decodeURIComponent(parts[1]||'all');let page=1;if(parts[2]==='page')page=Number(parts[3]||1);await renderCategory(cat,page);return;}
  if(isDetailPage){const id=decodeURIComponent(parts[1]||'');await renderItemDetail(id);return;}
  await renderHome();
}

qs('#searchInput')?.addEventListener('keyup',(e)=>{if(e.key==='Enter'){const q=e.target.value.trim();window.location.hash=`#/category/all/page/1/q/${encodeURIComponent(q)}`}})

window.addEventListener('hashchange',router)
window.addEventListener('load',router)
