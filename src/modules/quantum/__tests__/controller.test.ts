import { describe, expect, it } from 'vitest';
import {
  QUANTUM_ROUTE,
  QuantumModule,
  destroy,
  init,
  navigateQuantumPage,
} from '../controller';

describe('Quantum module controller', () => {
  it('exposes init/destroy and the legacy navigateQuantumPage', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof navigateQuantumPage).toBe('function');
    expect(QuantumModule.init).toBe(init);
    expect(QuantumModule.destroy).toBe(destroy);
  });

  it('routes to quantum.html', () => {
    expect(QUANTUM_ROUTE).toBe('quantum.html');
  });
});
