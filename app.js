<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dareloom.fun Movies</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #0f0f0f;
      color: #fff;
      margin: 0;
      padding: 0;
    }
    .container {
      width: 95%;
      max-width: 1100px;
      margin: 20px auto;
    }
    .category-heading {
      text-align: center;
      font-size: 26px;
      margin-bottom: 20px;
      color: #ffcc00;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px;
    }
    .card {
      background: #1c1c1c;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 0 10px rgba(255,255,255,0.1);
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .card:hover { transform: scale(1.03); }
    .card img {
      width: 100%;
      height: 250px;
      object-fit: cover;
    }
    .card-body {
      padding: 10px;
      text-align: center;
    }
    .card-body h3 {
      font-size: 18px;
      margin: 5px 0;
      color: #fff;
    }
    .pagination {
      margin-top: 20px;
      text-align: center;
    }
    .page-btn {
      display: inline-block;
      margin: 0 4px;
      padding: 6px 12px;
      border: 1px solid #ffcc00;
      color: #ffcc00;
      border-radius: 4px;
      text-decoration: none;
    }
    .page-btn.active,
    .page-btn:hover {
      background: #ffcc00;
      color: #000;
    }
    .detail-container {
      display: flex;
      justify-content: center;
      margin-top: 20px;
    }
    .detail-card {
      background: #1a1a1a;
      border-radius: 10px;
      max-width: 900px;
      padding: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      box-shadow: 0 0 10px rgba(255,255,255,0.1);
    }
    .detail-poster {
      width: 300px;
      border-radius: 10px;
      object-fit: cover;
    }
    .detail-meta {
      flex: 1;
    }
    .detail-title {
      color: #ffcc00;
      margin-top: 0;
    }
    .detail-description {
      color: #ccc;
      line-height: 1.5;
    }
    .watch-links a {
      display: inline-block;
      background: #ffcc00;
      color: #000;
      padding: 8px 14px;
      border-radius: 6px;
      margin: 4px;
      text-decoration: none;
      font-weight: bold;
    }
    .watch-links a:hover { background: #fff; }
    .screenshot-section {
      margin-top: 20px;
    }
    .screenshots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
    }
    .screenshot-img {
      width: 100%;
      border-radius: 6px;
      object-fit: cover;
    }
  </style>
</head>
<body>

<div id="app" class="container">
  <h2>Loading...</h2>
</div>

<script>
const SHEET_ID = "1A2I6jODnR99Hwy9ZJXPkGDtAFKfpYwrm3taCWZWoZ7o";
const API_KEY = "AIzaSyBFnyqCW37BUL3qrpGva0hitYUhxE_x5nw";
const SHEET_NAME = "2";
const PAGE_SIZE = 6;

function qs(sel){ return document.querySelector(sel); }

async function fetchAllRows(){
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const rows = json.values || [];
    if(rows.length < 2) return [];
    const headers = rows[0].map(h=>h.trim());
    const data = rows.slice(1).map(r=>{
      const obj={};
      headers.forEach((h,i)=>obj[h]=r[i]??"");
      obj._id = (obj.Title || `item-${Math.random().toString(36).slice(2)}`).trim();
      return obj;
    });
    return data;
  } catch(err){
    console.error("Fetch Error:", err);
    return [];
  }
}

function paginate(items,page=1,pageSize=PAGE_SIZE){
  const total=items.length,pages=Math.max(1,Math.ceil(total/pageSize)),start=(page-1)*pageSize;
  return {pageItems:items.slice(start,start+pageSize),total,pages};
}

function renderPagination(totalItems,currentPage){
  const pages=Math.max(1,Math.ceil(totalItems/PAGE_SIZE));
  if(pages<=1)return'';
  let html='';
  for(let i=1;i<=pages;i++){
    html+=`<a href="javascript:void(0)" class="page-btn ${i===currentPage?'active':''}" onclick="navigateTo('#/page/${i}')">${i}</a>`;
  }
  return html;
}

function movieCardHtml(item){
  return `
  <div class="card" onclick="navigateTo('#/item/${encodeURIComponent(item._id)}')">
    <img src="${item.Poster||''}" alt="${item.Title}">
    <div class="card-body">
      <h3>${item.Title||'Untitled'}</h3>
    </div>
  </div>`;
}

async function renderHome(page=1){
  const app=qs('#app');
  const data=await fetchAllRows();
  const {pageItems,total}=paginate(data,page,PAGE_SIZE);
  app.innerHTML=`
  <div class="container">
    <h2 class="category-heading">All Titles</h2>
    <div id="list" class="grid">${pageItems.map(movieCardHtml).join('')}</div>
    <div id="pagination" class="pagination">${renderPagination(total,page)}</div>
  </div>`;
}

function createWatchLinksHtml(item){
  const watchData=item["Watch Link"]||'';
  if(!watchData)return'';
  const parts=watchData.split('|').map(s=>s.trim()).filter(s=>s);
  let html='<div class="watch-links-section"><h3>Watch Links:</h3><div class="watch-links">';
  for(let i=0;i<parts.length;i+=2){
    const label=parts[i],url=parts[i+1];
    if(label&&url)html+=`<a href="${url}" target="_blank">${label}</a>`;
  }
  html+='</div></div>';
  return html;
}

function createScreenshotsHtml(item){
  const ssData=item.Screenshot||'';
  if(!ssData)return'';
  const shots=ssData.split('|').map(s=>s.trim()).filter(s=>s);
  if(shots.length===0)return'';
  let html='<div class="screenshot-section"><h3>Screenshots:</h3><div class="screenshots-grid">';
  shots.forEach(url=>{html+=`<img src="${url}" alt="Screenshot" class="screenshot-img">`;});
  html+='</div></div>';
  return html;
}

async function renderItemDetail(id){
  const app=qs('#app');
  const data=await fetchAllRows();
  const item=data.find(d=>d._id===decodeURIComponent(id));
  if(!item){app.innerHTML="<p class='not-found'>Item not found</p>";return;}
  const title=item.Title||'Untitled';
  const desc=item.Description||'No description available.';
  const poster=item.Poster||'';
  const watchLinksHtml=createWatchLinksHtml(item);
  const screenshotsHtml=createScreenshotsHtml(item);
  app.innerHTML=`
  <div class="container detail-container">
    <div class="detail-card">
      <img src="${poster}" alt="${title}" class="detail-poster">
      <div class="detail-meta">
        <h1 class="detail-title">${title}</h1>
        <p class="detail-description">${desc}</p>
        ${watchLinksHtml}
        ${screenshotsHtml}
      </div>
    </div>
  </div>`;
}

function navigateTo(hash){window.location.hash=hash;}
function getRoute(){return location.hash.replace(/^#\/?/,'').split('/');}

async function router(){
  const parts=getRoute();
  const isDetailPage=parts[0]==='item';
  document.body.classList.toggle('detail-page',isDetailPage);
  if(parts[0]===''||parts[0]==='page'){
    const page=Number(parts[1]||1);
    await renderHome(page);
    return;
  }
  if(isDetailPage){
    const id=parts[1]||'';
    await renderItemDetail(id);
    return;
  }
  await renderHome(1);
}

window.addEventListener('hashchange',router);
window.addEventListener('load',router);
</script>
</body>
</html>
