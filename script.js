/* script.js — v2: přidáno třídění a filtrování podle surovin, lepší UX */
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('addRecipeBtn');
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modalClose');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('recipeForm');
  const recipesList = document.getElementById('recipesList');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortSelect = document.getElementById('sortSelect');
  const ingredientFilter = document.getElementById('ingredientFilter');
  const ingredientBtn = document.getElementById('ingredientBtn');
  const totalCount = document.getElementById('totalCount');
  const visibleCount = document.getElementById('visibleCount');
  const quickCats = document.getElementById('quickCats');
  const quickIngs = document.getElementById('quickIngs');
  const imagePreview = document.getElementById('imagePreview');

  let recipes = JSON.parse(localStorage.getItem('recipes_v2') || '[]');
  let editId = null;

  const saveLocal = () => localStorage.setItem('recipes_v2', JSON.stringify(recipes));

  const openModal = () => modal.classList.remove('hidden');
  const closeModal = () => {
    modal.classList.add('hidden');
    form.reset();
    imagePreview.innerHTML = '';
    imagePreview.classList.add('hidden');
    editId = null;
  };

  function normalize(text){ return (text||'').toString().toLowerCase(); }
  function extractIngredients(text){
    return text.split(/\r?\n|,/).map(s=>s.trim()).filter(Boolean);
  }

  function buildIndex(){
    // build category and ingredient quick lists
    const cats = [...new Set(recipes.map(r=>r.category).filter(Boolean))];
    quickCats.innerHTML = cats.map(c=>`<button class="chip" data-cat="${c}">${c}</button>`).join('');
    const ingCounts = {};
    recipes.forEach(r=> extractIngredients(r.ingredients).forEach(ing=>{
      const key = normalize(ing);
      ingCounts[key] = (ingCounts[key]||0) + 1;
    }));
    const topIngs = Object.entries(ingCounts).sort((a,b)=>b[1]-a[1]).slice(0,12);
    quickIngs.innerHTML = topIngs.map(([ing])=>`<button class="chip" data-ing="${ing}">${ing}</button>`).join('');
  }

  function render(){
    const q = normalize(searchInput.value);
    const cat = categoryFilter.value;
    const ingFilter = normalize(ingredientFilter.value);

    // filter
    let filtered = recipes.filter(r=>{
      const inTitle = normalize(r.title).includes(q);
      const inIngredients = normalize(r.ingredients).includes(q);
      const inCategory = normalize(r.category||'').includes(q);
      const byQuery = !q || inTitle || inIngredients || inCategory;
      const byCat = !cat || (r.category===cat);
      const byIng = !ingFilter || normalize(r.ingredients).includes(ingFilter);
      return byQuery && byCat && byIng;
    });

    // sort
    const sortVal = sortSelect.value;
    filtered.sort((a,b)=>{
      if(sortVal==='newest') return Number(b.id)-Number(a.id);
      if(sortVal==='title_asc') return a.title.localeCompare(b.title);
      if(sortVal==='title_desc') return b.title.localeCompare(a.title);
      if(sortVal==='category') return (a.category||'').localeCompare(b.category||'');
      if(sortVal==='ingredients_count_asc') return extractIngredients(a.ingredients).length - extractIngredients(b.ingredients).length;
      if(sortVal==='ingredients_count_desc') return extractIngredients(b.ingredients).length - extractIngredients(a.ingredients).length;
      return 0;
    });

    totalCount.textContent = recipes.length;
    visibleCount.textContent = filtered.length;

    recipesList.innerHTML = filtered.map(r=>{
      const ings = extractIngredients(r.ingredients).slice(0,8);
      return `
        <article class="recipe-card" data-id="${r.id}">
          <div class="recipe-media">${r.image ? `<img src="${r.image}" alt="${r.title}">` : `<div style="padding:1rem;color:var(--muted)">bez obrázku</div>`}</div>
          <div class="recipe-body">
            <h3 class="recipe-title">${r.title}</h3>
            <div class="recipe-meta">${r.category||'—'} • ${r.servings ? r.servings+' porcí' : ''} ${r.prepTime? '• '+r.prepTime : ''}</div>
            <div class="recipe-ingredients">${ings.map(i=>`<span class="ing" data-ing="${normalize(i)}">${i}</span>`).join('')}</div>
          </div>
          <div class="card-actions">
            <button class="btn btn-ghost" data-action="edit" data-id="${r.id}">Upravit</button>
            <button class="btn btn-ghost" data-action="delete" data-id="${r.id}">Smazat</button>
          </div>
        </article>
      `;
    }).join('');
  }

  // events delegated for edit/delete and ingredient clicks
  recipesList.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action]');
    if(btn){
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if(action==='delete'){ if(confirm('Opravdu smazat?')){ recipes = recipes.filter(r=>r.id!==id); saveLocal(); buildIndex(); render(); } }
      if(action==='edit'){ const r = recipes.find(x=>x.id===id); if(r){ editId = id; document.getElementById('modalTitle').textContent='Upravit recept'; document.getElementById('title').value=r.title; document.getElementById('category').value=r.category; document.getElementById('prepTime').value=r.prepTime||''; document.getElementById('servings').value=r.servings||''; document.getElementById('ingredients').value=r.ingredients; document.getElementById('steps').value=r.steps; if(r.image){ imagePreview.innerHTML = `<img src="${r.image}" alt="náhled">`; imagePreview.classList.remove('hidden'); } openModal(); } }
    }

    // ingredient chip click
    const ing = e.target.closest('.ing');
    if(ing){
      const val = ing.dataset.ing;
      ingredientFilter.value = val;
      render();
      window.scrollTo({top:0,behavior:'smooth'});
    }
  });

  // quick chips click handlers
  quickCats.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip[data-cat]');
    if(btn){ categoryFilter.value = btn.dataset.cat; render(); }
  });
  quickIngs.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip[data-ing]');
    if(btn){ ingredientFilter.value = btn.dataset.ing; render(); }
  });

  // form submit (add/edit)
  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const file = document.getElementById('image').files[0];
    const data = {
      id: editId || Date.now().toString(),
      title: document.getElementById('title').value.trim(),
      category: document.getElementById('category').value.trim(),
      prepTime: document.getElementById('prepTime').value.trim(),
      servings: document.getElementById('servings').value.trim(),
      ingredients: document.getElementById('ingredients').value.trim(),
      steps: document.getElementById('steps').value.trim(),
      image: null
    };
    const saveAndClose = ()=>{ if(editId){ recipes = recipes.map(r=> r.id===editId ? data : r); } else { recipes.unshift(data); } saveLocal(); buildIndex(); render(); closeModal(); };

    if(file){ const reader = new FileReader(); reader.onload = ()=>{ data.image = reader.result; saveAndClose(); }; reader.readAsDataURL(file); }
    else saveAndClose();
  });

  // image preview in modal
  document.getElementById('image').addEventListener('change',(e)=>{
    const f = e.target.files[0];
    if(!f) return imagePreview.classList.add('hidden');
    const r = new FileReader();
    r.onload = ()=>{ imagePreview.innerHTML = `<img src="${r.result}" alt="náhled">`; imagePreview.classList.remove('hidden'); };
    r.readAsDataURL(f);
  });

  // UI controls
  addBtn.addEventListener('click', ()=>{ document.getElementById('modalTitle').textContent='Přidat recept'; openModal(); });
  modalClose.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  searchInput.addEventListener('input', render);
  categoryFilter.addEventListener('change', render);
  sortSelect.addEventListener('change', render);
  ingredientBtn.addEventListener('click', ()=>{ render(); });

  // initial render and helpers
  function init(){
    buildIndex();
    render();
  }
  init();
});
