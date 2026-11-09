import {afterNavigation} from '../devices/after-navigation.js';

const laptop = document.querySelector('.laptop');
const nearby = new IntersectionObserver(async entries => {
  if (!entries.some(entry => entry.isIntersecting)) return;
  nearby.disconnect();
  await afterNavigation();
  import('/assets/laptop/portfolio.js').then(module => module.mount(laptop))
    .catch(error => console.warn('Using the MacBook still image.', error));
}, {rootMargin: '150px'});
nearby.observe(laptop);
