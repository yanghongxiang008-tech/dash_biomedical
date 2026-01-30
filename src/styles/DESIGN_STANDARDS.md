# Design Standards & Component Guidelines

This document defines the design system standards for maintaining visual consistency across the application.

## 1. Spacing Scale

Use Tailwind's default spacing scale consistently:
- **xs**: `0.5rem` (2) - Minimal gaps, icon margins
- **sm**: `0.75rem` (3) - Tight spacing, inline elements
- **md**: `1rem` (4) - Default spacing, form gaps
- **lg**: `1.5rem` (6) - Section padding, card content
- **xl**: `2rem` (8) - Large section gaps
- **2xl**: `3rem` (12) - Page section separations

## 2. Component Sizing Standards

### Height Scale
| Size | Height | Use Case |
|------|--------|----------|
| sm | `h-8` (32px) | Compact buttons, small selects, table actions |
| default | `h-9` (36px) | Standard buttons, inputs, selects |
| lg | `h-10` (40px) | Prominent CTAs, form inputs |
| xl | `h-11` (44px) | Hero buttons, mobile touch targets |

### Icon Sizes
| Size | Class | Use Case |
|------|-------|----------|
| xs | `h-3 w-3` | Inline indicators, badges |
| sm | `h-4 w-4` | Button icons, list items |
| default | `h-5 w-5` | Standalone icons, navigation |
| lg | `h-6 w-6` | Feature icons, headers |

## 3. Border Radius

All components should use the CSS variable-based radius:
- **sm**: `rounded-sm` - Tags, badges, chips
- **md**: `rounded-md` - Buttons, inputs, selects
- **lg**: `rounded-lg` - Cards, modals, larger containers
- **xl**: `rounded-xl` - Feature cards, dialogs
- **full**: `rounded-full` - Avatars, pills, circular buttons

## 4. Shadow Scale

| Level | Class | Use Case |
|-------|-------|----------|
| none | - | Flat elements, disabled states |
| xs | `shadow-xs` | Subtle depth, inputs |
| sm | `shadow-sm` | Cards at rest, buttons |
| md | `shadow-md` | Elevated cards, dropdowns |
| lg | `shadow-lg` | Modals, popovers |
| xl | `shadow-xl` | Focused modals, important overlays |

## 5. Color Usage

### Never Use Direct Colors
```tsx
// ❌ Wrong
className="text-gray-500 bg-white border-gray-200"

// ✅ Correct
className="text-muted-foreground bg-background border-border"
```

### Semantic Color Tokens
- **foreground/background** - Primary content and surfaces
- **muted/muted-foreground** - Secondary content, disabled states
- **primary/primary-foreground** - CTAs, active states
- **destructive** - Errors, delete actions
- **success** - Confirmations, positive states
- **warning** - Cautions, alerts
- **accent** - Highlights, hover states

## 6. Typography Standards

### Font Families
- **Headings**: `font-heading` (Georgia, serif)
- **Body**: `font-sans` (Inter, system-ui)
- **Code**: `font-mono` (SF Mono, Menlo)

### Text Sizes
| Element | Class | Weight |
|---------|-------|--------|
| Page Title | `text-2xl` | `font-semibold` |
| Section Title | `text-lg` | `font-medium` |
| Card Title | `text-base` | `font-medium` |
| Body | `text-sm` | `font-normal` |
| Caption | `text-xs` | `font-normal` |

## 7. 交互状态 (Interactive States)

### 重要规则
- **禁止使用边框/ring效果表示选中或点击状态**
- 输入框聚焦时可以有细灰色边框变化
- 选中/点击状态应使用：背景色变化、阴影、透明度变化
- **避免交互时边框出现/消失导致布局抖动**：不要在 hover/active/focus 时新增边框或 ring；如必须使用边框，请在默认态保留同等宽度
- 类别/筛选按钮应加上 `border-0` 和 `focus-visible:ring-0`，避免点击时出现边框/外描边闪动

### 悬停状态 (Hover)
- 背景变化: `hover:bg-muted/50` 或 `hover:bg-accent`
- 透明度: `hover:opacity-80`
- 过渡: `transition-colors duration-200`

### 聚焦状态 (Focus)
- 无边框/ring效果: `focus:outline-none focus-visible:outline-none`
- 使用背景色变化: `focus-visible:bg-accent`
- 或使用阴影: `focus-visible:shadow-md`

### 选中状态 (Selected/Active)
- 背景: `bg-primary text-primary-foreground`
- 或: `bg-accent text-accent-foreground`
- 禁止使用: `ring`, 边框变化

### 禁用状态 (Disabled)
- 透明度: `disabled:opacity-50`
- 光标: `disabled:cursor-not-allowed`
- 指针事件: `disabled:pointer-events-none`

### 输入框特例
输入框聚焦时可以使用细边框:
```tsx
focus-visible:border-muted-foreground/50
```

## 8. Component Variants

### Button Variants
- **default** - Primary actions
- **secondary** - Secondary actions
- **outline** - Tertiary actions
- **ghost** - Subtle actions, toolbars
- **destructive** - Delete, cancel
- **glass** - Over images/gradients

### Card Variants
- **default** - Standard content cards
- **elevated** - Important information
- **interactive** - Clickable cards
- **glass** - Overlays, featured content
- **subtle** - Background sections

### Badge Variants
- **default** - Primary badges

## 9. Category Filter Pills (平铺类别按钮)

When you need a row of category buttons (e.g. All / News / Research), follow the Access page style:
- Container: `flex gap-2 sm:gap-2.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none`
- Button base: `px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all duration-200`
- Active state:
  - **All**: `bg-foreground text-background shadow-md`
  - **Category**: `bg-*/10 text-* shadow-sm` (use semantic tokens like `info`, `warning`, `success`, `primary`)
- Inactive state: `text-muted-foreground/70 hover:text-foreground hover:bg-muted/40`
- Count treatment: `ml-1.5 sm:ml-2` with `opacity-70` (active) / `opacity-40` (inactive)
- **secondary** - Neutral tags
- **outline** - Bordered tags
- **success/warning/destructive** - Status indicators
- **muted** - Low emphasis

## 9. Animation Standards

### Entry Animations
- Use `animate-fade-in` for content that appears
- Use `animate-scale-in` for modals/dialogs
- Stagger children with `.stagger-children` class

### Duration Guidelines
- Micro-interactions: `150-200ms`
- UI transitions: `200-300ms`
- Page transitions: `300-400ms`

### Easing
- Default: `ease-out` or `ease-spring`
- Never use `linear` for UI animations

## 10. Loading States

### Skeleton Loading
Use skeleton placeholders matching content dimensions:
```tsx
<div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
```

### Spinner
Use the elegant dual-ring spinner for action loading:
```tsx
<div className="h-5 w-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
```

## 11. Form Standards

### Field Spacing
- Between fields: `space-y-4`
- Label to input: `space-y-1.5`
- Form sections: `space-y-6`

### Labels
```tsx
<Label className="text-sm font-medium text-foreground">Label</Label>
```

### Error States
```tsx
<Input error className="..." />
<p className="text-xs text-destructive mt-1">Error message</p>
```

## 12. Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablets |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |
| 2xl | 1400px | Wide screens |

## 13. Dark Mode Considerations

- Always test both light and dark modes
- Use opacity modifiers for overlays: `bg-background/80`
- Ensure sufficient contrast ratios (WCAG AA minimum)
- Shadows should be more subtle in dark mode
