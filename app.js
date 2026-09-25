
const D = window.SITE_DATA;

const icon = (name) => ({
  instagram:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>',
  telegram:'<svg viewBox="0 0 24 24"><path d="M21 4 3.6 10.7c-1.2.5-1.2 1.2-.2 1.5l4.5 1.4 1.7 5.2c.2.7.1.9.8.9.6 0 .9-.3 1.2-.6l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8L22.7 6c.3-1.2-.5-1.8-1.7-1.4Z"/></svg>',
  mail:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
  phone:'<svg viewBox="0 0 24 24"><path d="M6.6 3.5 9.4 7c.4.5.3 1.2-.1 1.6L7.8 10c1.2 2.7 3.4 4.9 6.2 6.2l1.4-1.5c.4-.4 1.1-.5 1.6-.1l3.5 2.8c.5.4.6 1.1.3 1.6-.8 1.2-2.1 2-3.6 2C9.8 21 3 14.2 3 6.8c0-1.5.8-2.8 2-3.6.5-.3 1.2-.2 1.6.3Z"/></svg>'
})[name];

function socialMarkup(){
  return `
    <a class="social instagram" href="${D.contacts.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${icon('instagram')}</a>
    <a class="social telegram" href="${D.contacts.telegram}" target="_blank" rel="noopener" aria-label="Telegram">${icon('telegram')}</a>
    <a class="social mail" href="mailto:${D.contacts.email}" aria-label="Почта">${icon('mail')}</a>
    <a class="social phone" href="${D.contacts.phoneHref}" aria-label="${D.contacts.phoneText}">${icon('phone')}</a>`;
}
document.querySelectorAll('[data-socials]').forEach(el => el.innerHTML = socialMarkup());
document.querySelector('[data-hero-text]').textContent = D.site.heroText;
document.querySelector('[data-about]').textContent = D.site.about;
document.querySelectorAll('[data-home]').forEach(b => b.addEventListener('click', () => scrollTo({top:0,behavior:'smooth'})));

document.querySelectorAll('[data-tgk]').forEach(el => {
  el.href = D.contacts.tgk;
});

const heroGenreLinks = document.getElementById('heroGenreLinks');
if(heroGenreLinks){
  D.genres.forEach((genre) => {
    const btn = document.createElement('button');
    btn.className = 'hero-genre-link';
    btn.type = 'button';
    btn.textContent = genre.name;
    btn.addEventListener('click', () => openGallery({
      type:'Жанр',
      title:genre.name,
      groups:buildGenreGroups(genre)
    }));
    heroGenreLinks.appendChild(btn);
  });
}


const peopleStrip = document.getElementById('peopleStrip');
function createPersonButton(person, index, cycle){
  const b = document.createElement('button');
  b.className = 'person-circle' + (person.isNew ? ' newest' : '');
  b.type = 'button';
  b.dataset.personIndex = String(index);
  b.dataset.cycle = String(cycle);
  b.setAttribute('aria-label', `Открыть персональную серию ${index + 1}`);
  b.innerHTML = `<img src="${person.cover}" alt="" draggable="false">`;
  b.addEventListener('click', () => openGallery({
    type:'Персональная серия',
    title:'',
    photos:person.photos
  }));
  return b;
}

// Three identical cycles make the strip visually endless.
// Whenever the user reaches the neighboring copy, we silently jump
// by exactly one cycle width to the equivalent position.
[-1, 0, 1].forEach((cycle) => {
  D.persons.forEach((person, index) => {
    peopleStrip.appendChild(createPersonButton(person, index, cycle));
  });
});

let personButtons = Array.from(peopleStrip.querySelectorAll('.person-circle'));
let peopleFocusRaf = 0;
let peopleWheelRaf = 0;
let peopleTargetScroll = 0;
let peopleCycleWidth = 0;
let peopleMiddleStart = 0;
let peopleLoopAdjusting = false;

function middleFirstButton(){
  return peopleStrip.querySelector('.person-circle[data-cycle="0"][data-person-index="0"]');
}
function rightFirstButton(){
  return peopleStrip.querySelector('.person-circle[data-cycle="1"][data-person-index="0"]');
}

function measurePeopleLoop(preserveRelative = true){
  const middle = middleFirstButton();
  const right = rightFirstButton();
  if(!middle || !right) return;

  const oldMiddle = peopleMiddleStart;
  const oldScroll = peopleStrip.scrollLeft;

  peopleCycleWidth = right.offsetLeft - middle.offsetLeft;
  peopleMiddleStart = middle.offsetLeft - (peopleStrip.clientWidth - middle.offsetWidth) / 2;

  if(!peopleCycleWidth) return;

  if(preserveRelative && oldMiddle){
    const relative = oldScroll - oldMiddle;
    peopleStrip.scrollLeft = peopleMiddleStart + relative;
  } else {
    peopleStrip.scrollLeft = peopleMiddleStart;
  }
  peopleTargetScroll = peopleStrip.scrollLeft;
}

function normalizePeopleLoop(){
  if(!peopleCycleWidth || peopleLoopAdjusting) return;

  const leftLimit = peopleMiddleStart - peopleCycleWidth * .50;
  const rightLimit = peopleMiddleStart + peopleCycleWidth * .50;
  let shift = 0;

  if(peopleStrip.scrollLeft < leftLimit) shift = peopleCycleWidth;
  else if(peopleStrip.scrollLeft > rightLimit) shift = -peopleCycleWidth;

  if(shift){
    peopleLoopAdjusting = true;
    peopleStrip.scrollLeft += shift;
    peopleTargetScroll += shift;
    requestAnimationFrame(() => { peopleLoopAdjusting = false; });
  }
}

function updatePeopleCarouselFocus(){
  peopleFocusRaf = 0;
  if(!personButtons.length) return;

  normalizePeopleLoop();

  const stripRect = peopleStrip.getBoundingClientRect();
  const centerX = stripRect.left + stripRect.width / 2;
  const influence = Math.max(150, stripRect.width * .34);

  let nearest = null;
  let nearestDistance = Infinity;

  personButtons.forEach((button) => {
    const r = button.getBoundingClientRect();
    const buttonCenter = r.left + r.width / 2;
    const distance = Math.abs(buttonCenter - centerX);
    const proximity = Math.max(0, 1 - distance / influence);
    const eased = proximity * proximity * (3 - 2 * proximity);

    const scale = .76 + eased * .40;
    const ringScale = .88 + eased * .28;
    const ringAlpha = .26 + eased * .58;

    button.style.setProperty('--focus-scale', scale.toFixed(3));
    button.style.setProperty('--ring-scale', ringScale.toFixed(3));
    button.style.setProperty('--ring-alpha', ringAlpha.toFixed(3));

    if(distance < nearestDistance){
      nearestDistance = distance;
      nearest = button;
    }
  });

  personButtons.forEach((button) => {
    button.classList.toggle('carousel-focus', button === nearest);
  });
}

function schedulePeopleCarouselFocus(){
  if(!peopleFocusRaf){
    peopleFocusRaf = requestAnimationFrame(updatePeopleCarouselFocus);
  }
}

function stopPeopleWheelAnimation(){
  if(peopleWheelRaf){
    cancelAnimationFrame(peopleWheelRaf);
    peopleWheelRaf = 0;
  }
  peopleTargetScroll = peopleStrip.scrollLeft;
}

function animatePeopleWheel(){
  normalizePeopleLoop();
  const diff = peopleTargetScroll - peopleStrip.scrollLeft;

  if(Math.abs(diff) < .18){
    peopleStrip.scrollLeft = peopleTargetScroll;
    peopleWheelRaf = 0;
    schedulePeopleCarouselFocus();
    return;
  }

  peopleStrip.scrollLeft += diff * .14;
  schedulePeopleCarouselFocus();
  peopleWheelRaf = requestAnimationFrame(animatePeopleWheel);
}

peopleStrip.addEventListener('wheel', (event) => {
  if(!peopleCycleWidth) return;

  const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ? event.deltaX
    : event.deltaY;
  if(!raw) return;

  event.preventDefault();

  const unit = event.deltaMode === 1
    ? 22
    : event.deltaMode === 2
      ? peopleStrip.clientWidth
      : 1;

  peopleTargetScroll += raw * unit;

  if(!peopleWheelRaf){
    peopleWheelRaf = requestAnimationFrame(animatePeopleWheel);
  }
}, {passive:false});

peopleStrip.addEventListener('pointerdown', stopPeopleWheelAnimation, {passive:true});
peopleStrip.addEventListener('scroll', () => {
  if(!peopleWheelRaf) peopleTargetScroll = peopleStrip.scrollLeft;
  schedulePeopleCarouselFocus();
}, {passive:true});

window.addEventListener('resize', () => {
  measurePeopleLoop(true);
  schedulePeopleCarouselFocus();
}, {passive:true});

requestAnimationFrame(() => {
  measurePeopleLoop(false);
  updatePeopleCarouselFocus();
});

const genreGrid = document.getElementById('genreGrid');

function buildGenreGroups(genre){
  const remaining = new Set(genre.photos);
  const groups = [];

  // Люди идут отдельными последовательными блоками.
  // Порядок персон берём из верхних кругов: свежая съёмка остаётся первой.
  D.persons.forEach(person => {
    const photos = person.photos.filter(src => remaining.has(src));
    if(!photos.length) return;
    photos.forEach(src => remaining.delete(src));
    groups.push({id:person.id, photos});
  });

  // Кадры, не относящиеся к персональным кругам (Love Story / репортаж и т.п.),
  // сохраняются отдельным блоком и не перемешиваются с людьми.
  const other = genre.photos.filter(src => remaining.has(src));
  if(other.length) groups.push({id:'other', photos:other});

  return groups;
}

D.genres.forEach(genre => {
  const b = document.createElement('button');
  b.className = 'genre-card';
  b.type = 'button';
  b.innerHTML = `
    <div class="genre-cover"><img src="${genre.cover}" alt=""></div>
    <div class="genre-meta">
      <div><h3>${genre.name}</h3><p>${genre.photos.length} фото</p></div><b>↗</b>
    </div>`;

  const cover = b.querySelector('.genre-cover');
  cover.style.setProperty('--cover-image', `url("${genre.cover}")`);

  b.addEventListener('click', () => openGallery({
    type:'Жанр',
    title:genre.name,
    groups:buildGenreGroups(genre)
  }));
  genreGrid.appendChild(b);
});

const pricesGrid = document.getElementById('pricesGrid');
D.prices.forEach(p => {
  const el = document.createElement('div');
  el.className = 'price';
  el.innerHTML = `<b>${p.name}</b><strong>${p.price}</strong><span>${p.note}</span>`;
  pricesGrid.appendChild(el);
});

// Background v8: each cell has two full-frame layers.
// Scroll position blends continuously between the current and next photo set,
// while the cells keep a slow independent floating motion.
const bgStage = document.getElementById('bgStage');

const bgCells = Array.from({length:6}, (_, i) => {
  const cell = document.createElement('div');
  cell.className = 'bg-cell';
  cell.dataset.slot = i;

  const a = document.createElement('img');
  const b = document.createElement('img');
  a.className = 'bg-photo bg-photo-a';
  b.className = 'bg-photo bg-photo-b';
  a.alt = '';
  b.alt = '';
  a.decoding = 'async';
  b.decoding = 'async';

  cell.append(a, b);
  bgStage.appendChild(cell);
  return {cell, a, b};
});

const bgPhotoFor = (step, slot) => {
  const total = D.background.length;
  if(!total) return '';
  const normalized = ((step % total) + total) % total;
  return D.background[(normalized * 7 + slot * 13) % total];
};

let targetBgScroll = 0;
let smoothBgScroll = 0;
let renderedBgStep = Number.NaN;
let bgRaf = 0;

function bgSegmentHeight(){
  return Math.max(1180, window.innerHeight * 1.22);
}

function loadBgStep(step){
  if(step === renderedBgStep || !D.background.length) return;
  renderedBgStep = step;

  bgCells.forEach(({a,b}, slot) => {
    const currentSrc = bgPhotoFor(step, slot);
    const nextSrc = bgPhotoFor(step + 1, slot);

    if(a.getAttribute('src') !== currentSrc) a.src = currentSrc;
    if(b.getAttribute('src') !== nextSrc) b.src = nextSrc;
  });
}

function renderBackground(){
  const diff = targetBgScroll - smoothBgScroll;
  smoothBgScroll += diff * .016;
  if(Math.abs(diff) < .08) smoothBgScroll = targetBgScroll;

  const raw = Math.max(0, smoothBgScroll / bgSegmentHeight());
  const step = Math.floor(raw);
  const t = raw - step;
  const eased = t * t * t * (t * (t * 6 - 15) + 10); // smootherstep for softer background transition

  loadBgStep(step);

  bgCells.forEach(({a,b}) => {
    a.style.opacity = String(.52 * (1 - eased));
    b.style.opacity = String(.52 * eased);
  });

  bgRaf = requestAnimationFrame(renderBackground);
}

addEventListener('scroll', () => {
  // Background photos stay fixed while the page scrolls.
}, {passive:true});

addEventListener('resize', () => {
  targetBgScroll = 0;
  smoothBgScroll = 0;
}, {passive:true});

loadBgStep(0);
bgRaf = requestAnimationFrame(renderBackground);

const galleryView = document.getElementById('galleryView');
const galleryGrid = document.getElementById('galleryGrid');
const galleryScroll = document.getElementById('galleryScroll');
const galleryTitle = document.getElementById('galleryTitle');
const galleryType = document.getElementById('galleryType');
const galleryCount = document.getElementById('galleryCount');
let returnScroll = 0;

function makeGalleryPhoto(src){
  const b = document.createElement('button');
  b.className = 'gallery-photo';
  b.type = 'button';
  b.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
  b.addEventListener('click', () => openLightbox(src));
  return b;
}

function openGallery({type,title,photos=[],groups=null}){
  returnScroll = window.scrollY;
  galleryType.textContent = type;
  galleryTitle.textContent = title || '';

  const grouped = Array.isArray(groups) && groups.length;
  const allPhotos = grouped ? groups.flatMap(group => group.photos) : photos;
  galleryCount.textContent = `${allPhotos.length} фото`;
  galleryGrid.innerHTML = '';
  galleryGrid.classList.toggle('grouped', !!grouped);

  if(grouped){
    groups.forEach((group, index) => {
      const section = document.createElement('section');
      section.className = 'gallery-person-group';

      if(index > 0){
        const divider = document.createElement('div');
        divider.className = 'person-group-divider';
        divider.setAttribute('aria-hidden','true');
        section.appendChild(divider);
      }

      const grid = document.createElement('div');
      grid.className = 'person-group-grid';
      group.photos.forEach(src => grid.appendChild(makeGalleryPhoto(src)));
      section.appendChild(grid);
      galleryGrid.appendChild(section);
    });
  } else {
    photos.forEach(src => galleryGrid.appendChild(makeGalleryPhoto(src)));
  }

  galleryView.classList.add('open');
  galleryView.setAttribute('aria-hidden','false');
  document.body.classList.add('gallery-open');
  galleryScroll.scrollTop = 0;
}
function closeGallery(){
  galleryView.classList.remove('open');
  galleryView.setAttribute('aria-hidden','true');
  document.body.classList.remove('gallery-open');
  window.scrollTo(0, returnScroll);
}
document.getElementById('galleryBack').addEventListener('click', closeGallery);
document.getElementById('galleryClose').addEventListener('click', closeGallery);

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
function openLightbox(src){
  lightboxImage.src = src;
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden','false');
}
function closeLightbox(){
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden','true');
}
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if(e.target === lightbox) closeLightbox(); });
addEventListener('keydown', e => {
  if(e.key === 'Escape'){
    if(lightbox.classList.contains('open')) closeLightbox();
    else if(galleryView.classList.contains('open')) closeGallery();
  }
});
