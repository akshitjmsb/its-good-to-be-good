/**
 * Food page entry.
 *
 * The meal calendar is fully local and deterministic, so the page renders
 * immediately — no auth wait, no network. All the real logic lives in
 * `src/modules/food/` (data + view); this entry only mounts it.
 */

import { renderFoodView } from '../modules/food/view';

document.addEventListener('DOMContentLoaded', () => {
  const host = document.getElementById('food-view-host');
  if (host) renderFoodView(host, new Date());
});
