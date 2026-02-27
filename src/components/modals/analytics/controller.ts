import { getAnalyticsContent } from '../../../domains/content/service';
import { DEFAULT_USER_ID } from '../../../core/default-user';
import {
  MODAL_CONFIGS,
  getModalElements,
  setModalContent,
  showModalWithLoading,
} from '../factory';
import { escapeHtml } from '../../../utils/escapeHtml';
import { getSolutionExplanation } from '../solutionExplanation';
import { AnalyticsContent, AnalyticsTopic } from './types';
import { createAnalyticsCardHTML } from './view';

// Global state for card navigation
let currentCardIndex = 0;
let totalCards = 0;
let analyticsData: AnalyticsContent | null = null;

// Event listener cleanup
let keyboardListener: ((e: KeyboardEvent) => void) | null = null;
let solutionButtonListener: ((e: Event) => void) | null = null;

function cleanupKeyboardListener() {
  if (!keyboardListener) return;
  document.removeEventListener('keydown', keyboardListener);
  keyboardListener = null;
}

function cleanupSolutionListener() {
  if (!solutionButtonListener) return;
  document.removeEventListener('click', solutionButtonListener);
  solutionButtonListener = null;
}

export function cleanupAnalyticsEventListeners() {
  cleanupKeyboardListener();
  cleanupSolutionListener();
}

export async function showAnalyticsModal(date: Date) {
  const elements = getModalElements(MODAL_CONFIGS.analytics);
  if (!elements) return;

  // Analytics modal has additional required elements
  const indicatorsContainer = document.getElementById('card-indicators');
  const prevBtn = document.getElementById('prev-card-btn');
  const nextBtn = document.getElementById('next-card-btn');

  if (!indicatorsContainer || !prevBtn || !nextBtn) {
    console.error('Analytics modal: Missing navigation elements');
    return;
  }

  cleanupAnalyticsEventListeners();
  showModalWithLoading(elements, MODAL_CONFIGS.analytics.loadingMessage);

  try {
    analyticsData = await getAnalyticsContent(DEFAULT_USER_ID, date);
    if (!analyticsData) {
      setModalContent(
        elements,
        '<div class="analytics-card flex items-center justify-center"><p>Content is not available. Please try again later.</p></div>'
      );
      return;
    }

    // Create cards from the data
    const topics: AnalyticsTopic[] = [
      ...(analyticsData.sql
        ? [
            {
              type: 'SQL',
              data: analyticsData.sql,
              isQuestion: true,
              icon: '',
            } as const,
          ]
        : []),
      ...(analyticsData.dax
        ? [
            {
              type: 'DAX',
              data: analyticsData.dax,
              isQuestion: true,
              icon: '',
            } as const,
          ]
        : []),
      ...(analyticsData.snowflake
        ? [
            {
              type: 'Snowflake',
              data: analyticsData.snowflake,
              isQuestion: true,
              icon: '',
            } as const,
          ]
        : []),
      ...(analyticsData.dbt
        ? [
            {
              type: 'dbt',
              data: analyticsData.dbt,
              isQuestion: true,
              icon: '',
            } as const,
          ]
        : []),
      ...(analyticsData.dataManagement
        ? [
            {
              type: 'Data Management',
              data: analyticsData.dataManagement,
              icon: '',
            } as const,
          ]
        : []),
      ...(analyticsData.dataQuality
        ? [
            {
              type: 'Data Quality',
              data: analyticsData.dataQuality,
              icon: '',
            } as const,
          ]
        : []),
    ];

    // Filter out topics without data
    const validTopics = topics;
    totalCards = validTopics.length;
    currentCardIndex = 0;

    // Generate cards HTML
    setModalContent(
      elements,
      validTopics
        .map((topic, index) => createAnalyticsCardHTML(topic, index))
        .join('')
    );

    // Generate indicators
    indicatorsContainer.innerHTML = validTopics
      .map(
        (_, index) =>
          `<div class="card-indicator ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`
      )
      .join('');

    // Setup event listeners
    setupCardNavigation();
    setupCardInteractions();

    // Update navigation state
    updateNavigationState();
  } catch (error) {
    console.error('Error showing analytics modal:', error);
    setModalContent(
      elements,
      '<div class="analytics-card flex items-center justify-center"><p>An error occurred while fetching analytics content.</p></div>'
    );
  }
}

function setupCardNavigation() {
  const prevBtn = document.getElementById('prev-card-btn');
  const nextBtn = document.getElementById('next-card-btn');
  const cardsWrapper = document.getElementById('analytics-cards-wrapper');
  const indicatorsContainer = document.getElementById('card-indicators');

  if (!prevBtn || !nextBtn || !cardsWrapper || !indicatorsContainer) return;

  prevBtn.onclick = () => {
    if (currentCardIndex > 0) {
      currentCardIndex--;
      updateCardPosition();
      updateNavigationState();
    }
  };

  nextBtn.onclick = () => {
    if (currentCardIndex < totalCards - 1) {
      currentCardIndex++;
      updateCardPosition();
      updateNavigationState();
    }
  };

  indicatorsContainer.onclick = event => {
    const target = (event.target as HTMLElement).closest(
      '.card-indicator'
    ) as HTMLElement | null;
    if (!target) return;
    const index = Number.parseInt(target.dataset.index ?? '', 10);
    if (!Number.isNaN(index)) {
      currentCardIndex = index;
      updateCardPosition();
      updateNavigationState();
    }
  };

  if (cardsWrapper.dataset.navigationBound !== 'true') {
    // Enhanced touch/swipe support for mobile
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let currentX = 0;
    let isSwipeGesture = false;

    cardsWrapper.addEventListener(
      'touchstart',
      e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = startX;
        isDragging = true;
        isSwipeGesture = false;
        cardsWrapper.style.transition = 'none';
      },
      { passive: true }
    );

    cardsWrapper.addEventListener(
      'touchmove',
      e => {
        if (!isDragging) return;

        currentX = e.touches[0].clientX;
        const diffX = startX - currentX;
        const diffY = startY - e.touches[0].clientY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
          isSwipeGesture = true;
          e.preventDefault();

          const translateX =
            -currentCardIndex * 100 + (diffX / window.innerWidth) * 100;
          cardsWrapper.style.transform = `translateX(${translateX}%)`;
        }
      },
      { passive: false }
    );

    cardsWrapper.addEventListener(
      'touchend',
      e => {
        if (!isDragging) return;
        isDragging = false;
        cardsWrapper.style.transition =
          'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

        if (!isSwipeGesture) return;

        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        const swipeThreshold = window.innerWidth * 0.15;

        if (Math.abs(diffX) > swipeThreshold) {
          if (diffX > 0 && currentCardIndex < totalCards - 1) {
            currentCardIndex++;
            updateCardPosition();
            updateNavigationState();
          } else if (diffX < 0 && currentCardIndex > 0) {
            currentCardIndex--;
            updateCardPosition();
            updateNavigationState();
          } else {
            updateCardPosition();
          }
        } else {
          updateCardPosition();
        }
      },
      { passive: true }
    );

    // Enhanced mouse drag support for desktop
    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseCurrentX = 0;
    let isMouseDrag = false;

    cardsWrapper.addEventListener('mousedown', e => {
      isMouseDown = true;
      mouseStartX = e.clientX;
      mouseCurrentX = mouseStartX;
      isMouseDrag = false;
      cardsWrapper.style.cursor = 'grabbing';
      cardsWrapper.style.transition = 'none';
      cardsWrapper.style.userSelect = 'none';
    });

    cardsWrapper.addEventListener('mousemove', e => {
      if (!isMouseDown) return;

      mouseCurrentX = e.clientX;
      const diffX = mouseStartX - mouseCurrentX;

      if (Math.abs(diffX) > 10) {
        isMouseDrag = true;
        e.preventDefault();

        const translateX =
          -currentCardIndex * 100 + (diffX / window.innerWidth) * 100;
        cardsWrapper.style.transform = `translateX(${translateX}%)`;
      }
    });

    cardsWrapper.addEventListener('mouseup', e => {
      if (!isMouseDown) return;
      isMouseDown = false;
      cardsWrapper.style.cursor = 'grab';
      cardsWrapper.style.transition =
        'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      cardsWrapper.style.userSelect = 'auto';

      if (!isMouseDrag) return;

      const mouseEndX = e.clientX;
      const diffX = mouseStartX - mouseEndX;
      const dragThreshold = window.innerWidth * 0.1;

      if (Math.abs(diffX) > dragThreshold) {
        if (diffX > 0 && currentCardIndex < totalCards - 1) {
          currentCardIndex++;
          updateCardPosition();
          updateNavigationState();
        } else if (diffX < 0 && currentCardIndex > 0) {
          currentCardIndex--;
          updateCardPosition();
          updateNavigationState();
        } else {
          updateCardPosition();
        }
      } else {
        updateCardPosition();
      }
    });

    cardsWrapper.addEventListener('mouseleave', () => {
      if (isMouseDown) {
        isMouseDown = false;
        cardsWrapper.style.cursor = 'grab';
        cardsWrapper.style.transition =
          'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        cardsWrapper.style.userSelect = 'auto';
        updateCardPosition();
      }
    });

    cardsWrapper.dataset.navigationBound = 'true';
  }

  cleanupKeyboardListener();
  keyboardListener = (e: KeyboardEvent) => {
    const modal = document.getElementById('analytics-engineer-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    if (e.key === 'ArrowLeft' && currentCardIndex > 0) {
      currentCardIndex--;
      updateCardPosition();
      updateNavigationState();
    } else if (e.key === 'ArrowRight' && currentCardIndex < totalCards - 1) {
      currentCardIndex++;
      updateCardPosition();
      updateNavigationState();
    } else if (e.key === 'Escape') {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      cleanupAnalyticsEventListeners();
    }
  };
  document.addEventListener('keydown', keyboardListener);
}

function updateCardPosition() {
  const cardsWrapper = document.getElementById('analytics-cards-wrapper');
  if (!cardsWrapper) return;

  const translateX = -currentCardIndex * 100;
  cardsWrapper.style.transform = `translateX(${translateX}%)`;

  // Ensure smooth transition is enabled
  if (
    !cardsWrapper.style.transition ||
    cardsWrapper.style.transition === 'none'
  ) {
    cardsWrapper.style.transition =
      'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  }
}

function updateNavigationState() {
  const prevBtn = document.getElementById('prev-card-btn');
  const nextBtn = document.getElementById('next-card-btn');
  const indicators = document.querySelectorAll('.card-indicator');

  // Update button states
  if (prevBtn) {
    prevBtn.style.opacity = currentCardIndex === 0 ? '0.5' : '1';
    prevBtn.style.cursor = currentCardIndex === 0 ? 'not-allowed' : 'pointer';
  }

  if (nextBtn) {
    nextBtn.style.opacity = currentCardIndex === totalCards - 1 ? '0.5' : '1';
    nextBtn.style.cursor =
      currentCardIndex === totalCards - 1 ? 'not-allowed' : 'pointer';
  }

  // Update indicators
  indicators.forEach((indicator, index) => {
    if (index === currentCardIndex) {
      indicator.classList.add('active');
    } else {
      indicator.classList.remove('active');
    }
  });
}

function setupCardInteractions() {
  // Handle solution button clicks
  cleanupSolutionListener();
  solutionButtonListener = async (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('analytics-card-solution-btn')) {
      const prompt = atob(target.getAttribute('data-prompt') || '');
      const solution = atob(target.getAttribute('data-solution') || '');
      const cardId = target.getAttribute('data-card-id') || '';
      const solutionEl = document.getElementById(`solution-${cardId}`);

      if (solutionEl && !solutionEl.classList.contains('show')) {
        solutionEl.innerHTML = '<p>Generating detailed explanation...</p>';
        solutionEl.classList.add('show');

        try {
          const explanation = await getSolutionExplanation(prompt, solution);
          solutionEl.innerHTML = explanation;
          target.textContent = 'Hide Solution';
        } catch (error) {
          console.error('Error generating solution explanation:', error);
          solutionEl.innerHTML = `
                        <h5 class="font-bold text-sm mb-1">Solution Code</h5>
                        <div class="bg-gray-100 p-3 rounded-md text-sm"><pre class="text-gray-800">${escapeHtml(solution)}</pre></div>
                        <p class="text-xs text-red-500 mt-2">Could not generate detailed explanation. Displaying original solution.</p>
                    `;
        }
      } else if (solutionEl && solutionEl.classList.contains('show')) {
        solutionEl.classList.remove('show');
        target.textContent = 'Show Solution';
      }
    }
  };
  document.addEventListener('click', solutionButtonListener);
}
