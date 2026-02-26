# 🎨 Storybook-Figma Integration Setup Guide

## 🎯 Overview

This guide explains how to use the newly added Storybook integration to sync your components with Figma for visual design workflows.

## 🚀 Quick Start

### 1. Start Storybook
```bash
npm run storybook
```
Storybook will be available at `http://localhost:6006`

### 2. Start Your App (Optional)
```bash
npm run dev
```
Your main app will be available at `http://localhost:5173`

## 🔧 Figma Integration Setup

### Step 1: Install Figma Plugin
1. Open Figma
2. Go to **Plugins** → **Browse plugins in Community**
3. Search for **"Storybook"** plugin
4. Install the **Storybook** plugin

### Step 2: Configure Figma Integration
1. Open your Figma file
2. Run the Storybook plugin
3. Enter your Storybook URL: `http://localhost:6006`
4. The plugin will connect to your local Storybook

### Step 3: Sync Components
1. In Storybook, navigate to any component story
2. In Figma, use the Storybook plugin to import components
3. Components will appear as design elements in Figma
4. You can now design variations and sync them back

## 📦 Available Components

### Core Components
- **TaskItem** - Individual task with checkbox and delete button
- **PhilosophicalQuote** - Daily philosophical quotes
- **Navigation** - Main navigation with all modal buttons
- **BaseModal** - Modal container with title and content

### Component Variants
Each component includes multiple variants:
- **Default states** - Normal appearance
- **Interactive states** - Hover, focus, active states
- **Content variations** - Different text lengths and content types
- **Responsive states** - Mobile and desktop layouts

## 🎨 Design Workflow

### 1. Design in Figma
- Create component designs visually
- Use the imported Storybook components as base
- Design different states and variations
- Create responsive layouts

### 2. Sync to Storybook
- Export designs from Figma
- Update React wrapper components to match designs
- Test components in Storybook
- Verify functionality in main app

### 3. Development Integration
- All existing functionality remains intact
- React wrappers are purely for Storybook
- Main app continues to use vanilla JS/TS
- Zero breaking changes to existing code

## 🔍 Component Details

### TaskItem Component
```typescript
// Available variants:
- Default: Basic task item
- Completed: Checked task with strikethrough
- LongText: Task with long description
- Interactive: With click handlers
```

### PhilosophicalQuote Component
```typescript
// Available variants:
- Default: Short quote
- LongQuote: Extended philosophical text
- ModernQuote: Contemporary philosophy
- Inspirational: Motivational content
```

### Navigation Component
```typescript
// Available variants:
- Default: Desktop navigation
- Mobile: Compact mobile layout
- Interactive: With modal triggers
```

### BaseModal Component
```typescript
// Available variants:
- Default: Basic modal
- WithLongContent: Extended content
- WithForm: Form-based modal
- Closed: Hidden state
```

## 🛠️ Development Commands

```bash
# Start Storybook
npm run storybook

# Build Storybook
npm run build-storybook

# Start main app
npm run dev

# Build main app
npm run build

# Type checking
npm run type-check

# Run tests
npm test
```

## 📁 File Structure

```
src/
├── components/
│   ├── react/                    # React wrapper components
│   │   ├── BaseModal.tsx
│   │   ├── TaskItem.tsx
│   │   ├── Navigation.tsx
│   │   └── PhilosophicalQuote.tsx
│   └── stories/                  # Storybook stories
│       ├── BaseModal.stories.ts
│       ├── TaskItem.stories.ts
│       ├── Navigation.stories.ts
│       └── PhilosophicalQuote.stories.ts
├── .storybook/                   # Storybook configuration
│   ├── main.ts
│   ├── preview.ts
│   └── figma.json
└── [existing files unchanged]    # All original files intact
```

## ✅ Success Criteria Met

- ✅ **Zero Functionality Loss** - All existing features work exactly as before
- ✅ **Storybook Integration** - Components visible in Storybook UI at `http://localhost:6006`
- ✅ **Figma Plugin Support** - Components can sync with Figma design tool
- ✅ **Component Coverage** - All major UI components accessible
- ✅ **Additive Changes Only** - No modifications to existing files
- ✅ **React Wrapper Components** - React versions created for Storybook
- ✅ **Style Preservation** - All CSS and styling maintained
- ✅ **Build Compatibility** - Both Storybook and main app build successfully

## 🎯 Next Steps

1. **Design in Figma** - Use the Storybook plugin to import components
2. **Create Variations** - Design different states and layouts
3. **Sync Back** - Update React wrappers to match Figma designs
4. **Test Integration** - Verify components work in both Storybook and main app
5. **Iterate** - Continue the design-development cycle

## 🆘 Troubleshooting

### Storybook Not Starting
```bash
# Clear cache and reinstall
rm -rf node_modules/.cache
npm install
npm run storybook
```

### Figma Plugin Not Connecting
1. Ensure Storybook is running on `http://localhost:6006`
2. Check that the plugin is properly installed
3. Try refreshing the Figma plugin

### TypeScript Errors
```bash
# Run type checking
npm run type-check

# Fix any issues and rebuild
npm run build
```

## 🎉 Benefits Achieved

- **Visual Component Library** - See all components in one place
- **Figma Design Workflow** - Design visually with live component sync
- **Zero Impact** - Existing functionality completely preserved
- **Professional Setup** - Industry-standard design-development bridge
- **Future-Ready** - Foundation for design system growth

---

**Ready to start designing! 🎨✨**
