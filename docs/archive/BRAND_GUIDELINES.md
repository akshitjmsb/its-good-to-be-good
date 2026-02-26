# Night Divides the Day - Brand Guidelines

## Brand Identity Overview

**Night Divides the Day** is a personal productivity and learning dashboard that embodies the philosophy of mindful, intentional living. The brand represents the intersection of technology and human wisdom, where digital tools serve to enhance rather than replace human reflection and growth.

---

## Visual Identity

### Primary Typography
- **Font Family**: `'Special Elite'` (Google Fonts)
- **Font Style**: Monospace, retro-terminal aesthetic
- **Usage**: All text elements throughout the application
- **Rationale**: Creates a distinctive, tech-savvy yet timeless feel that suggests both digital precision and human authenticity

### Color Palette

#### Primary Colors
- **Background**: `#f4f4f4` (Light Grey)
  - Used for body background, creates subtle contrast
- **Content Background**: `#ffffff` (Pure White)
  - Used for main content areas and cards
- **Text Primary**: `#111111` (Near Black)
  - Main text color for readability
- **Text Secondary**: `#6b7280` (Medium Grey)
  - Used for secondary text and footer links

#### Accent Colors
- **Black Primary**: `#111111` (Near Black)
  - Used for primary actions, type badges, active states, buttons
- **Black Secondary**: `#333333` (Dark Grey)
  - Used for hover states and interactive elements
- **Grey Medium**: `#6b7280` (Medium Grey)
  - Used for secondary text, explanations, and informational content
- **Grey Dark**: `#374151` (Dark Grey)
  - Used for data quality issues, warnings, and emphasis

#### Neutral Colors
- **Border Light**: `#e5e7eb` (Gray 200)
- **Border Medium**: `#d1d5db` (Gray 300)
- **Background Light**: `#f8f9fa` (Gray 50)
- **Background Medium**: `#e2e8f0` (Slate 200)

---

## Design Principles

### 1. Minimalist Aesthetic
- Clean, uncluttered interfaces
- Generous white space
- Focus on content over decoration
- Subtle shadows and borders for depth

### 2. Mobile-First Responsive Design
- Touch-friendly interface (minimum 44px touch targets)
- Responsive typography and spacing
- Flexible grid layouts
- Optimized for both mobile and desktop

### 3. Functional Beauty
- Every visual element serves a purpose
- Consistent interaction patterns
- Clear visual hierarchy
- Intuitive navigation

### 4. Human-Centered Technology
- Technology that enhances, not replaces, human experience
- Thoughtful micro-interactions
- Accessible design principles
- Warm, approachable interface

---

## Component Guidelines

### Cards & Containers
```css
/* Standard Card */
background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
border-radius: 12px; /* 16px on mobile */
border: 1px solid #e5e7eb;
box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
padding: 1.5rem; /* 1rem on mobile */
```

### Buttons
```css
/* Primary Button */
background: #111111;
color: white;
border-radius: 8px; /* 12px on mobile */
padding: 0.75rem 1.5rem;
font-weight: 600;
min-height: 44px; /* Touch-friendly */
```

### Button States
```css
/* Hover State */
background: #333333;

/* Active State */
transform: translateY(0);
box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.3);
```

### Typography Scale
```css
/* Mobile First */
h1: 1.5rem → 1.75rem (desktop)
h2: 1.25rem → 1.5rem (desktop)
h3: 1rem → 1.1rem (desktop)
body: 0.875rem → 0.9rem (desktop)
small: 0.75rem → 0.8rem (desktop)
```

### Spacing System
- **Base Unit**: 0.25rem (4px)
- **Small**: 0.5rem (8px)
- **Medium**: 1rem (16px)
- **Large**: 1.5rem (24px)
- **XLarge**: 2rem (32px)

---

## Interactive Elements

### Hover States
- Subtle `translateY(-1px)` for cards
- Color darkening for buttons
- Scale transforms for icons (1.1x)
- Smooth transitions (0.2s ease)

### Active States
- `translateY(0)` for pressed buttons
- Reduced shadow for depth feedback
- Color variations for different states

### Focus States
- Visible focus rings for accessibility
- Consistent focus indicators
- Keyboard navigation support

---

## Iconography & Visual Elements

### Logo
- Stylized curved lines representing time/rhythm
- SVG format for scalability
- Monochrome with stroke styling
- Minimal, abstract representation

### Emojis as Icons
- ☀️ Day mode indicator
- 🗄️ SQL/Database
- 📊 DAX/Analytics
- ❄️ Snowflake
- 🔧 dbt/Tools
- 📋 Data Management
- ✅ Data Quality

### Navigation Elements
- Arrow icons for card navigation
- Dot indicators for pagination
- Simple, geometric shapes

---

## Content Guidelines

### Tone of Voice
- **Philosophical yet Practical**: Deep insights delivered simply
- **Encouraging**: Motivational without being preachy
- **Authentic**: Genuine, human-centered messaging
- **Concise**: Clear, direct communication

### Content Structure
- **Reflect**: Daily wisdom and prompts
- **Focus**: Task management and priorities
- **Learn**: Educational content across domains
- **Archive**: Historical content preservation

---

## Technical Implementation

### CSS Framework
- **Tailwind CSS**: Utility-first approach
- **Custom Properties**: For brand colors
- **Mobile-First**: Responsive design patterns
- **Performance**: Optimized animations and transitions

### Animation Principles
- **Duration**: 0.2s-0.3s for micro-interactions
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` for natural feel
- **Purpose**: Every animation serves a functional purpose
- **Accessibility**: Respects `prefers-reduced-motion`
- **Transform Distance**: Keep transforms subtle (10px max for slide animations)

### Accessibility Standards
- **WCAG 2.1 AA** compliance
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper semantic markup
- **Color Contrast**: Minimum 4.5:1 ratio
- **Touch Targets**: Minimum 44px for mobile

---

## Usage Examples

### Analytics Module Cards
```css
.analytics-card {
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    border-radius: 16px; /* Mobile: 16px, Desktop: 12px */
    border: 1px solid #e5e7eb;
    box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1);
    padding: 1rem; /* Mobile: 1rem, Desktop: 1.5rem */
}
```

### Type Badges
```css
.analytics-card-type {
    background: #111111;
    color: white;
    padding: 0.25rem 0.5rem; /* Mobile: 0.5rem, Desktop: 0.75rem */
    border-radius: 9999px;
    font-size: 0.65rem; /* Mobile: 0.65rem, Desktop: 0.75rem */
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
```

---

## Advanced Component Patterns

### Analytics Card Implementation
The Analytics Card serves as the gold standard for complex component implementation, demonstrating advanced patterns that exceed basic brand guidelines:

#### Enhanced Visual Hierarchy
```css
/* Card Structure with Clear Sections */
.analytics-card {
    display: flex;
    flex-direction: column;
    min-height: 0; /* Prevents flex overflow */
}

.analytics-card-header {
    flex-shrink: 0; /* Prevents header compression */
    border-bottom: 2px solid #e5e7eb;
}

.analytics-card-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}
```

#### Content Type Indicators
```css
/* Color-coded left borders for different content types */
.analytics-card-question {
    border-left: 4px solid #111111; /* Black for questions */
}

.analytics-card-explanation {
    border-left: 4px solid #6b7280; /* Grey for explanations */
}

.analytics-card-issues {
    border-left: 4px solid #374151; /* Dark grey for issues */
}
```

#### Advanced Interactions
- **Swipe Gestures**: Mobile-optimized touch interactions with visual feedback
- **Keyboard Navigation**: Arrow keys and Escape key support
- **Real-time Feedback**: Cards move with finger during drag/swipe
- **Smart Thresholds**: 15% screen width for swipe, 10% for mouse drag

#### Accessibility Enhancements
- **Semantic Structure**: Proper heading hierarchy and ARIA labels
- **Focus Management**: Visible focus indicators and logical tab order
- **Screen Reader Support**: Descriptive text and proper markup
- **Touch Targets**: All interactive elements meet 44px minimum

---

## Brand Applications

### Web Application
- Personal dashboard interface
- Modal overlays and cards
- Navigation elements
- Form inputs and buttons

### Future Extensions
- Mobile app design
- Documentation styling
- Marketing materials
- Social media graphics

---

## Maintenance Guidelines

### Color Updates
- Always test color combinations for accessibility
- Maintain contrast ratios
- Update both light and dark mode variants
- Document any color additions

### Typography Changes
- Preserve the monospace aesthetic
- Test readability across devices
- Maintain consistent line heights
- Update font loading for performance

### Component Updates
- Follow established patterns
- Maintain responsive behavior
- Test across all breakpoints
- Document new components

---

## Contact & Resources

**Brand Owner**: Akshit Gupta  
**Application**: Night Divides the Day  
**Last Updated**: January 2025  

### Development Resources
- **Font**: [Special Elite on Google Fonts](https://fonts.google.com/specimen/Special+Elite)
- **Color Palette**: Tailwind CSS color system
- **Icons**: SVG + Emoji combination
- **Framework**: Vite + TypeScript + Tailwind CSS

---

*This brand guide ensures consistency across all development work while maintaining the unique identity and philosophy of Night Divides the Day.*
