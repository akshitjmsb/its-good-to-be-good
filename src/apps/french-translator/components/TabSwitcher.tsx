export type FrenchTab = 'word' | 'translator';

interface TabSwitcherProps {
  tab: FrenchTab;
  onChange: (tab: FrenchTab) => void;
}

const TABS: { id: FrenchTab; label: string }[] = [
  { id: 'word', label: 'Word of the Day' },
  { id: 'translator', label: 'Translator' },
];

/**
 * A subtle segmented toggle in King's vintage ramp — an inset pill track
 * with the active segment lifted onto a white surface.
 */
export function TabSwitcher({ tab, onChange }: TabSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="French view"
      className="mx-auto mb-8 flex w-full max-w-xs items-center gap-1 rounded-full border border-[#e5e7eb] bg-[#f8f9fa] p-1"
    >
      {TABS.map(({ id, label }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={[
              'flex-1 rounded-full px-3 py-1.5 text-xs tracking-[0.04em] transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/40',
              active
                ? 'bg-white text-[#374151] shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
                : 'text-[#9ca3af] hover:text-[#6b7280]',
            ].join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
