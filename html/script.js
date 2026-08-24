const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

window.dataLayer = window.dataLayer || [];
const track = (name, params = {}) => {
  const event = { event: name, ...params, page: window.location.pathname, timestamp: new Date().toISOString() };
  window.dataLayer.push(event);
  if (typeof window.gtag === 'function') window.gtag('event', name, params);
};

const header = qs('[data-header]');
const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 25);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const menuToggle = qs('[data-menu-toggle]');
const mobilePanel = qs('[data-mobile-panel]');
const closeMobileMenu = () => {
  mobilePanel?.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Open navigation');
};
menuToggle?.addEventListener('click', () => {
  const open = mobilePanel.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
qsa('.mobile-panel a, .mobile-bar a').forEach(link => link.addEventListener('click', closeMobileMenu));

const hoursButton = qs('[data-hours]');
const hoursPopover = qs('[data-hours-popover]');
const closeHours = () => {
  if (!hoursPopover) return;
  hoursPopover.setAttribute('hidden', '');
  hoursButton?.setAttribute('aria-expanded', 'false');
};
hoursButton?.addEventListener('click', () => {
  if (!hoursPopover) return;
  if (hoursPopover.hasAttribute('hidden')) {
    hoursPopover.removeAttribute('hidden');
    hoursButton.setAttribute('aria-expanded', 'true');
    track('opening_hours_open');
  } else closeHours();
});
qsa('[data-close-hours]').forEach(el => el.addEventListener('click', closeHours));
document.addEventListener('click', event => {
  if (hoursPopover && !hoursPopover.hasAttribute('hidden') && !hoursPopover.contains(event.target) && !hoursButton?.contains(event.target)) closeHours();
});

const modal = qs('[data-modal]');
const openBooking = () => {
  if (!modal) return;
  closeMobileMenu();
  if (typeof closeDish === 'function') closeDish();
  modal.removeAttribute('hidden');
  document.body.classList.add('modal-open');
  track('booking_open');
  window.setTimeout(() => qs('input', modal)?.focus(), 40);
};
const closeBooking = () => {
  if (!modal) return;
  modal.setAttribute('hidden', '');
  document.body.classList.remove('modal-open');
};
qsa('[data-open-booking]').forEach(button => button.addEventListener('click', openBooking));
qs('[data-close-booking]')?.addEventListener('click', closeBooking);
modal?.addEventListener('click', event => { if (event.target === modal) closeBooking(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeBooking(); closeHours(); closeMobileMenu(); } });

qs('[data-booking-form]')?.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = qs('button[type="submit"]', form);
  submit.innerHTML = 'Request received <span aria-hidden="true">x</span>';
  submit.disabled = true;
  track('booking_submit', { date: qs('input[type="date"]', form)?.value, time: qs('select', form)?.value });
  window.setTimeout(() => {
    closeBooking();
    form.reset();
    submit.innerHTML = 'Find a table <span aria-hidden="true">-></span>';
    submit.disabled = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 1400);
});

let activeCategory = 'pizza';
let activeDiet = 'all';
const menuCards = qsa('[data-category]');
const menuGrid = qs('[data-menu-grid]');
const applyMenuFilters = () => {
  let visibleCount = 0;
  menuCards.forEach(card => {
    const categoryMatch = card.dataset.category === activeCategory;
    const dietValues = (card.dataset.diet || '').split(' ').filter(Boolean);
    const dietMatch = activeDiet === 'all' || dietValues.includes(activeDiet);
    card.hidden = !(categoryMatch && dietMatch);
    if (!card.hidden) visibleCount += 1;
    if (!card.hidden && !card.querySelector('.dish-allergens')) {
      const note = document.createElement('small');
      note.className = 'dish-allergens';
      note.textContent = 'Allergens: ' + (card.dataset.allergens || 'Ask your server');
      const content = card.querySelector('.dish-copy > div, .dish > div:not(.dish-photo-caption)') || card.querySelector('.dish-photo-caption');
      content?.append(note);
    }
});
  let emptyState = qs('[data-menu-empty]');
  if (!emptyState) {
    emptyState = document.createElement('p');
    emptyState.dataset.menuEmpty = 'true';
    emptyState.className = 'menu-empty';
    menuGrid?.after(emptyState);
  }
  emptyState.textContent = visibleCount ? '' : 'No dishes match this filter. Try another option or ask the team.';
  emptyState.hidden = visibleCount > 0;
};
const dishModal = qs('[data-dish-modal]');
const dishModalImage = qs('[data-dish-modal-image]');
const dishModalTitle = qs('[data-dish-modal-title]');
const dishModalDescription = qs('[data-dish-modal-description]');
const dishModalPrice = qs('[data-dish-modal-price]');
const dishModalAllergens = qs('[data-dish-modal-allergens]');
const openDish = card => {
  const title = card.dataset.title || qs('h3', card)?.textContent?.trim() || 'Forno dish';
  const description = card.dataset.description || qs('p', card)?.textContent?.trim() || 'Ask our team about today ingredients.';
  const price = card.dataset.price || qs('strong', card)?.textContent?.trim() || '';
  const image = qs('img', card);
  const category = (card.dataset.category || 'menu').replace('-', ' / ');
  dishModalTitle.textContent = title;
  dishModalDescription.textContent = description;
  dishModalPrice.textContent = price;
  dishModalAllergens.textContent = 'Allergens: ' + (card.dataset.allergens || 'ask your server');
  qs('[data-dish-modal-category]').textContent = category + ' / Forno';
  if (image) { dishModalImage.src = image.currentSrc || image.src; dishModalImage.alt = image.alt; }
  dishModal.removeAttribute('hidden');
  document.body.classList.add('modal-open');
  track('dish_open', { dish: title });
};
const closeDish = () => {
  dishModal?.setAttribute('hidden', '');
  if (!modal || modal.hasAttribute('hidden')) document.body.classList.remove('modal-open');
};
menuCards.forEach(card => {
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.addEventListener('click', () => openDish(card));
  card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDish(card); } });
});
qs('[data-close-dish]')?.addEventListener('click', closeDish);
dishModal?.addEventListener('click', event => { if (event.target === dishModal) closeDish(); });
qsa('[data-filter]').forEach(tab => tab.addEventListener('click', () => {
  qsa('[data-filter]').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-selected', 'false'); });
  tab.classList.add('active');
  tab.setAttribute('aria-selected', 'true');
  activeCategory = tab.dataset.filter;
  applyMenuFilters();
}));
qsa('[data-diet]').forEach(tab => tab.addEventListener('click', () => {
  qsa('[data-diet]').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
  tab.classList.add('active');
  tab.setAttribute('aria-pressed', 'true');
  activeDiet = tab.dataset.diet;
  track('menu_diet_filter', { diet: activeDiet });
  applyMenuFilters();
}));
applyMenuFilters();

qsa('a[href^="tel:"]').forEach(link => link.addEventListener('click', () => track('phone_click', { href: link.getAttribute('href') })));
qsa('a[href*="google.com/maps"]').forEach(link => link.addEventListener('click', () => track('directions_click', { href: link.getAttribute('href') })));
qsa('a[download]').forEach(link => link.addEventListener('click', () => track('menu_download', { file: link.getAttribute('href') })));
qsa('[data-track]').forEach(element => element.addEventListener('click', () => track(element.dataset.track)));

const revealItems = qsa('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); revealObserver.unobserve(entry.target); } });
  }, { threshold: 0.12 });
  revealItems.forEach(item => revealObserver.observe(item));
} else revealItems.forEach(item => item.classList.add('in-view'));

const collage = qs('.hero-collage');
if (collage && window.matchMedia('(pointer:fine)').matches) {
  collage.addEventListener('pointermove', event => {
    const box = collage.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - .5;
    const y = (event.clientY - box.top) / box.height - .5;
    collage.style.setProperty('--parallax-x', (x * 8) + 'px');
    collage.style.setProperty('--parallax-y', (y * 8) + 'px');
  });
  collage.addEventListener('pointerleave', () => { collage.style.setProperty('--parallax-x', '0px'); collage.style.setProperty('--parallax-y', '0px'); });
}