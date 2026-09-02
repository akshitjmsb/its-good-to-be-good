import { initializeAutomaticDim } from '../../platform/automaticDim';
import { registerAppWorker } from '../../platform/pwa/service-worker';
import { initMeditate } from './meditate';

initializeAutomaticDim();
void registerAppWorker();

document.addEventListener('DOMContentLoaded', () => {
  const meditation = initMeditate();
  const runtime = document.getElementById('mindfulness-runtime');
  const controls = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-mode]')
  );
  if (!meditation || !runtime) return;

  const sync = (active: 'breathe' | 'om' | 'focus' | null): void => {
    if (active) runtime.dataset.mode = active;
    else delete runtime.dataset.mode;
    controls.forEach(control => {
      const mode = control.dataset.mode;
      const playing =
        mode === 'breathe'
          ? meditation.isBreathePlaying()
          : mode === 'om'
            ? meditation.isOmPlaying()
            : meditation.isFocusPlaying();
      control.setAttribute('aria-pressed', String(playing || mode === active));
    });
  };

  controls.forEach(control => {
    control.addEventListener('click', () => {
      const mode = control.dataset.mode as 'breathe' | 'om' | 'focus';
      if (mode === 'breathe') {
        if (meditation.isOmPlaying()) meditation.toggleOm();
        if (meditation.isFocusPlaying()) meditation.toggleFocus();
        if (meditation.isBreathePlaying()) meditation.stopBreathe();
        else meditation.startBreathe();
      } else if (mode === 'om') {
        if (meditation.isBreathePlaying()) meditation.stopBreathe();
        if (meditation.isFocusPlaying()) meditation.toggleFocus();
        meditation.setMode('om');
        meditation.toggleOm();
      } else {
        if (meditation.isBreathePlaying()) meditation.stopBreathe();
        if (meditation.isOmPlaying()) meditation.toggleOm();
        meditation.setMode('focus');
        if (!meditation.isFocusPlaying()) meditation.toggleFocus();
      }
      const remainsActive =
        mode === 'breathe'
          ? meditation.isBreathePlaying()
          : mode === 'om'
            ? meditation.isOmPlaying()
            : true;
      sync(remainsActive ? mode : null);
    });
  });

  sync(null);
});
