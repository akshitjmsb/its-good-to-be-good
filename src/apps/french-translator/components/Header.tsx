/**
 * Page header — a quiet sibling of every other King subpage: a "← Home"
 * text link, then the page name beside its flag emoji. No chrome buttons.
 */
export function Header() {
  return (
    <>
      <nav className="page-back-nav">
        <a href="index.html" className="home-link">
          ← Home
        </a>
      </nav>

      <header className="text-center mb-6">
        <div className="flex justify-center items-center">
          <h1>French</h1>
          <span className="theme-icon" aria-hidden="true">
            🇫🇷
          </span>
        </div>
      </header>
    </>
  );
}
