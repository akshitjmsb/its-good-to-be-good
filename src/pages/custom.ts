/**
 * Runtime for the generic custom-module page.
 *
 * The page is one HTML shell shared by every user-created module. It
 * reads `?id=<custom-id>` from the URL, looks the module up in
 * localStorage (via the same store the home uses), and fills in the
 * title and emoji. The body content is a placeholder — the user will
 * fill it in later through whatever mechanism we add next.
 */
import { findCustomModule } from '../domains/modules/customModules';

function init(): void {
  const container = document.getElementById('app-container');
  if (container) container.dataset.runtime = 'custom';

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const titleEl = document.getElementById('custom-page-title');
  const iconEl = document.getElementById('custom-page-icon');
  const headTitle = document.querySelector('title');
  const subtitleEl = document.getElementById('custom-page-subtitle');

  if (!id) {
    if (titleEl) titleEl.textContent = 'Module not found';
    if (subtitleEl) subtitleEl.textContent = 'No module id was supplied.';
    return;
  }

  const module = findCustomModule(id);
  if (!module) {
    if (titleEl) titleEl.textContent = 'Module not found';
    if (subtitleEl) {
      subtitleEl.textContent =
        'This module may have been deleted. Return home to add a new one.';
    }
    return;
  }

  if (titleEl) titleEl.textContent = module.name;
  if (iconEl) iconEl.textContent = module.emoji;
  if (headTitle) headTitle.textContent = `${module.name} — It's Good To Be King`;
  if (subtitleEl) subtitleEl.remove();
}

document.addEventListener('DOMContentLoaded', init);
