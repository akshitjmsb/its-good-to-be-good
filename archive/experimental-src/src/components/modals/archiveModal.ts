import { escapeHtml } from "../../utils/escapeHtml";
import { getCachedContent } from "../../core/supabase-content-cache";
import { DEFAULT_USER_ID } from "../../core/default-user";

async function getArchivedContent(dateKey: string): Promise<any> {
    try {
        const archivedData = await getCachedContent(DEFAULT_USER_ID, 'archive', dateKey);
        return archivedData;
    } catch (error) {
        console.error('Error loading archived content:', error);
        return null;
    }
}

function showArchivedFrenchModal(archivedContent: any) {
    const modal = document.getElementById('frenchy-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const titleEl = modal.querySelector('#modal-frenchy-title') as HTMLElement;
    const tableBodyEl = modal.querySelector('#modal-frenchy-table-body') as HTMLElement;

    titleEl.textContent = `French (Archived - ${archivedContent.date})`;

    if (archivedContent.frenchContent && archivedContent.frenchContent.sound && archivedContent.frenchContent.words) {
        const { sound, words } = archivedContent.frenchContent;
        tableBodyEl.innerHTML = `
            <tr>
                <td class="p-3 border-b">${escapeHtml(sound)}</td>
                <td class="p-3 border-b">${escapeHtml(words.join(', '))}</td>
                <td class="p-3 border-b">Archived</td>
            </tr>
        `;
    } else {
        tableBodyEl.innerHTML = `<tr><td colspan="3" class="text-center p-4">No archived French content available.</td></tr>`;
    }
}

function showArchivedFoodModal(archivedContent: any) {
    const modal = document.getElementById('food-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const titleEl = modal.querySelector('#food-modal-title') as HTMLElement;
    const contentEl = modal.querySelector('#modal-food-content') as HTMLElement;

    titleEl.textContent = `Food Plan (Archived - ${archivedContent.date})`;
    contentEl.innerHTML = `<div class="p-4">${escapeHtml(archivedContent.foodPlan || 'No archived food plan available.')}</div>`;
}

function showArchivedAnalyticsModal(archivedContent: any) {
    const modal = document.getElementById('analytics-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const titleEl = modal.querySelector('#modal-analytics-title') as HTMLElement;
    const contentEl = modal.querySelector('#modal-analytics-content') as HTMLElement;

    titleEl.textContent = `Analytics (Archived - ${archivedContent.date})`;

    if (archivedContent.analyticsContent && archivedContent.analyticsContent.insights) {
        contentEl.innerHTML = `<div class="p-4">${escapeHtml(archivedContent.analyticsContent.insights)}</div>`;
    } else {
        contentEl.innerHTML = `<div class="p-4">No archived analytics content available.</div>`;
    }
}

function showArchivedHoodModal(archivedContent: any) {
    const modal = document.getElementById('hood-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const titleEl = modal.querySelector('#modal-hood-title') as HTMLElement;
    const contentEl = modal.querySelector('#modal-hood-content') as HTMLElement;

    titleEl.textContent = `Transportation Physics (Archived - ${archivedContent.date})`;

    if (archivedContent.transportationContent && archivedContent.transportationContent.physics) {
        contentEl.innerHTML = `<div class="p-4">${escapeHtml(archivedContent.transportationContent.physics)}</div>`;
    } else {
        contentEl.innerHTML = `<div class="p-4">No archived transportation physics content available.</div>`;
    }
}

export async function renderArchive(archiveKey: string) {
    const archiveList = document.getElementById('archive-list');
    if (!archiveList) return;
    const archiveModal = document.getElementById('archive-modal');

    const archivedContent = await getArchivedContent(archiveKey);

    if (!archivedContent) {
        archiveList.innerHTML = '<p class="text-gray-500 p-4">No archived content available for this date.</p>';
        return;
    }

    const archiveItems = [
        {
            label: `Archived French (${archivedContent.date})`,
            action: () => showArchivedFrenchModal(archivedContent)
        },
        {
            label: `Archived Food (${archivedContent.date})`,
            action: () => showArchivedFoodModal(archivedContent)
        },
        {
            label: `Archived Analytics (${archivedContent.date})`,
            action: () => showArchivedAnalyticsModal(archivedContent)
        },
        {
            label: `Archived Hood (${archivedContent.date})`,
            action: () => showArchivedHoodModal(archivedContent)
        }
    ];

    archiveList.innerHTML = '';
    archiveItems.forEach(item => {
        const button = document.createElement('button');
        button.className = 'p-3 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors text-left';
        button.textContent = item.label;
        button.onclick = () => {
            archiveModal?.classList.add('hidden');
            archiveModal?.classList.remove('flex');
            item.action();
        };
        archiveList.appendChild(button);
    });
}
