import { getModulesByCategory } from '../domains/modules/registry';
import type { JourneyModuleId, LearnModuleId } from '../domains/modules/types';

const learnIconSvgs: Record<LearnModuleId, string> = {
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
    `
};

const journeyIconSvgs: Record<JourneyModuleId, string> = {
    todo: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 12l2 2 4-4" />
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
        </svg>
    `,
    being: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 4c1.7 2.4 1.7 5.6 0 8-1.7-2.4-1.7-5.6 0-8z" />
            <path d="M12 12C9.8 9.4 6.7 8 3.5 8c0 3.3 2.3 6.2 5.5 7" />
            <path d="M12 12c2.2-2.6 5.3-4 8.5-4 0 3.3-2.3 6.2-5.5 7" />
            <path d="M4 12.5c1.6 2.7 4.7 4.5 8 4.5s6.4-1.8 8-4.5" />
        </svg>
    `,
    tennis: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M3.5 6.5c4 2.5 13 2.5 17 0" />
            <path d="M3.5 17.5c4-2.5 13-2.5 17 0" />
        </svg>
    `,
    'khyaali-bhoot': `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2C8 2 5 5.6 5 10v7c0 1 .5 2 1.5 2s1.5-1 2-2c.5 1 1.5 2 2.5 2s2-1 2.5-2c.5 1 1 2 2 2s1.5-1 1.5-2v-7c0-4.4-3-8-7-8z" />
            <circle cx="9.5" cy="10" r="0.5" />
            <circle cx="14.5" cy="10" r="0.5" />
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
