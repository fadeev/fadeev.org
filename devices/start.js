import {afterNavigation} from './after-navigation.js';

const mounted = new WeakSet();
async function showModels() {
  await afterNavigation();
  for (const host of document.querySelectorAll('.case:not([hidden]) [data-hardware]')) {
    if (mounted.has(host) || !host.closest('.case:not([hidden])')) continue;
    mounted.add(host);
    await import('/assets/laptop/hardware.js').then(module=>module.mount(host))
      .catch(error=>console.warn('Using the device render.',error));
  }
}
addEventListener('route',showModels);
showModels();
