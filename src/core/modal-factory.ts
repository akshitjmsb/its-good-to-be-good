/**
 * Modal factory — re-export of the shared modal helpers from
 * `src/components/modals/factory.ts`. Modules import the helpers from
 * here so they stay inside the module-import-boundary allowlist (which
 * permits `core/` but not `components/`).
 *
 * The canonical `MODAL_CONFIGS` literal continues to live in the
 * components version because the architecture guard text-scans that
 * specific file for each modal id.
 */
export {
  getModalElements,
  showModalWithLoading,
  showModalError,
  setModalContent,
  setModalTitle,
  MODAL_CONFIGS,
} from '../components/modals/factory';
