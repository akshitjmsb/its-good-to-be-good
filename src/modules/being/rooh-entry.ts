import { initializeAutomaticDim } from '../../platform/automaticDim';
import { registerAppWorker } from '../../platform/pwa/service-worker';

initializeAutomaticDim();
void registerAppWorker();
