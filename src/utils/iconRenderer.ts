import { getModulesByCategory } from '../domains/modules/registry';
import type { JourneyModuleId, LearnModuleId } from '../domains/modules/types';

const learnIconSvgs: Record<LearnModuleId, string> = {
    'world-order': `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2v20" />
            <path d="M4.5 7c2.5 2.5 7.5 2.5 10 0" />
            <path d="M4.5 17c2.5-2.5 7.5-2.5 10 0" />
        </svg>
    `,
    tennis: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 6c2 2 4 2 6 0" />
            <path d="M8 18c2-2 4-2 6 0" />
            <path d="M6 8c2 2 2 4 0 6" />
            <path d="M18 8c-2 2-2 4 0 6" />
            <path d="M12 2v20" />
            <path d="M2 12h20" />
        </svg>
    `,
    coffee: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 8h12v8c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V8z" />
            <path d="M6 8V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v2" />
            <path d="M18 10v4c0 1.1-.9 2-2 2h-2" />
            <path d="M8 4h2" />
            <path d="M10 2h2" />
            <path d="M12 4h2" />
        </svg>
    `,
    guitar: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3h12l-1 18H7L6 3z" />
            <path d="M6 3l6 6" />
            <path d="M12 9v12" />
            <path d="M8 15h8" />
            <circle cx="12" cy="18" r="2" />
        </svg>
    `,
    poetry: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
    `,
    french: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6h16v12H4z" />
            <path d="M8 6v12" />
            <path d="M16 6v12" />
            <path d="M12 8h4" />
            <path d="M12 12h4" />
            <path d="M12 16h4" />
            <path d="M8 8h4" />
            <path d="M8 12h4" />
            <path d="M8 16h4" />
        </svg>
    `,
    food: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="8" />
            <path d="M8 4l1 1 1-1" />
            <path d="M8 6v8" />
            <path d="M7 6h2" />
            <path d="M7 8h2" />
            <path d="M16 4l-1 1-1-1" />
            <path d="M16 6v8" />
            <path d="M15 6h2" />
            <path d="M15 8h2" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    `,
    analytics: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="16" width="3" height="5" />
            <rect x="7" y="12" width="3" height="9" />
            <rect x="11" y="8" width="3" height="13" />
            <rect x="15" y="4" width="3" height="17" />
            <rect x="19" y="6" width="3" height="15" />
            <path d="M2 21h20" />
        </svg>
    `,
    curious: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
        </svg>
    `,
    exercise: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="12" r="3" />
            <path d="M9 12h6" />
            <path d="M6 9v6" />
            <path d="M18 9v6" />
        </svg>
    `
};

const journeyIconSvgs: Record<JourneyModuleId, string> = {
    todo: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 12l2 2 4-4" />
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
        </svg>
    `,
    quantum: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6" />
            <path d="M17 7l-5 5 5 5" />
            <path d="M7 7l5 5-5 5" />
            <path d="M1 12h6m6 0h6" />
        </svg>
    `,
    meditate: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    `,
    money: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1v22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    `,
    health: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    `,
    travel: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    `
};

export function renderModuleIcons() {
    const learnModules = getModulesByCategory('learn');
    learnModules.forEach(module => {
        if (!module.iconElementId) return;

        const svgString = learnIconSvgs[module.id];
        const iconContainer = document.getElementById(module.iconElementId);
        if (!svgString || !iconContainer) return;

        // Use responsive sizing - start with mobile size (24px)
        const responsiveSvg = svgString
            .replace(/width="20"/g, 'width="24"')
            .replace(/height="20"/g, 'height="24"');
        iconContainer.innerHTML = responsiveSvg;
    });
}

export function renderNavigationIcons() {
    const journeyModules = getModulesByCategory('journey');
    journeyModules.forEach(module => {
        if (!module.iconElementId) return;

        const svgString = journeyIconSvgs[module.id];
        const iconContainer = document.getElementById(module.iconElementId);
        if (!svgString || !iconContainer) return;

        // Icons are already sized at 24px for navigation buttons
        iconContainer.innerHTML = svgString;
    });
}
