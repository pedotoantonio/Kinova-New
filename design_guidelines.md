# Kinova Design Guidelines

## 1. Brand Identity

**Purpose**: Kinova is a premium family coordination app that helps families stay organized, connected, and in sync with joy and vibrancy.

**Aesthetic Direction**: Vibrant & Professional - A rainbow-inspired color system derived from the Kinova logo creates a distinctive, memorable, and emotionally engaging experience. Each section of the app has its own signature color, making navigation intuitive and visually delightful.

**Design Philosophy**: "Every color tells a story" - Each section's unique color creates immediate visual recognition while the rainbow button system adds playful energy and helps users identify different actions at a glance.

## 2. Color Architecture (From Kinova Logo)

### Primary Brand Colors (Rainbow Sequence)
| Letter | Color Name     | Hex Code  | Usage                        |
|--------|----------------|-----------|------------------------------|
| **K**  | Ruby Red       | `#E53935` | Home section, Urgent items   |
| **i**  | Sunset Orange  | `#FF9800` | Lists & Tasks section        |
| **n**  | Lime Green     | `#8BC34A` | Budget section, Success      |
| **o**  | Teal Cyan      | `#00BCD4` | AI Assistant, Info           |
| **v**  | Royal Blue     | `#2196F3` | Calendar, Profile, Primary   |
| **a**  | Violet Purple  | `#9C27B0` | Notes & Documents            |

### Section Background Colors (Light Mode)
| Section    | Background    | Color Family      |
|------------|---------------|-------------------|
| Home       | `#FFEBEE`     | Soft Rose         |
| Calendar   | `#E3F2FD`     | Soft Sky          |
| Lists      | `#FFF3E0`     | Soft Peach        |
| Notes      | `#F3E5F5`     | Soft Lavender     |
| Budget     | `#F1F8E9`     | Soft Mint         |
| Assistant  | `#E0F7FA`     | Soft Aqua         |
| Profile    | `#E3F2FD`     | Soft Sky          |

### Section Background Colors (Dark Mode)
| Section    | Background    | Color Family      |
|------------|---------------|-------------------|
| Home       | `#1F0D0D`     | Deep Rose         |
| Calendar   | `#0D1F2D`     | Deep Navy         |
| Lists      | `#1A1408`     | Deep Amber        |
| Notes      | `#1A0D1F`     | Deep Purple       |
| Budget     | `#0D1A0D`     | Deep Forest       |
| Assistant  | `#0D1A1F`     | Deep Teal         |
| Profile    | `#0D1F2D`     | Deep Navy         |

### Rainbow Button System
Each page uses multiple button colors from the rainbow palette to create visual variety:
- **Red Button**: `#E53935` - Destructive actions, important alerts
- **Orange Button**: `#FF9800` - Secondary actions, warnings
- **Green Button**: `#8BC34A` - Confirmations, success actions
- **Cyan Button**: `#00BCD4` - Info actions, AI features
- **Blue Button**: `#2196F3` - Primary actions, navigation
- **Purple Button**: `#9C27B0` - Special actions, notes

### Neutrals
- **Surface Light**: `#FFFFFF`
- **Surface Dark**: `#1E1E1E`
- **Text Primary Light**: `#212121`
- **Text Primary Dark**: `#FAFAFA`
- **Text Secondary Light**: `#616161`
- **Text Secondary Dark**: `#B0BEC5`
- **Border Light**: `#E0E0E0`
- **Border Dark**: `#424242`

## 3. Gradients

All gradient buttons transition from the brand color to a lighter tint:
- **Primary (Blue)**: `#2196F3` → `#42A5F5`
- **Ruby Red**: `#E53935` → `#EF5350`
- **Sunset Orange**: `#FF9800` → `#FFB74D`
- **Lime Green**: `#8BC34A` → `#AED581`
- **Teal Cyan**: `#00BCD4` → `#4DD0E1`
- **Violet Purple**: `#9C27B0` → `#BA68C8`
- **Rainbow Header**: Full gradient `#E53935 → #FF9800 → #8BC34A → #00BCD4 → #2196F3 → #9C27B0`

## 4. Typography

**Font Family**: Inter (clean, modern, professional)

| Style       | Size  | Weight        | Line Height |
|-------------|-------|---------------|-------------|
| Large Title | 28px  | Bold (700)    | 34px        |
| Title       | 22px  | Bold (700)    | 28px        |
| Subtitle    | 18px  | Semibold (600)| 24px        |
| Body        | 16px  | Regular (400) | 22px        |
| Label       | 14px  | Medium (500)  | 20px        |
| Caption     | 12px  | Regular (400) | 16px        |
| Button      | 16px  | Semibold (600)| 22px        |

## 5. Spacing & Layout

| Token | Value | Usage                    |
|-------|-------|--------------------------|
| xs    | 4px   | Tight spacing            |
| sm    | 8px   | Compact elements         |
| md    | 12px  | Standard component gap   |
| lg    | 16px  | Card padding             |
| xl    | 20px  | Screen padding           |
| 2xl   | 24px  | Section spacing          |
| 3xl   | 32px  | Large section breaks     |

- **Screen Horizontal Padding**: 20px
- **Card Internal Padding**: 16px
- **Input/Button Height**: 52px

## 6. Border Radius

| Element   | Radius | Description           |
|-----------|--------|-----------------------|
| Buttons   | 26px   | Pill-shaped, friendly |
| Cards     | 16px   | Rounded, modern       |
| Inputs    | 12px   | Soft corners          |
| Badges    | 20px   | Pill-shaped           |
| Avatars   | 50%    | Circular              |
| FABs      | 30px   | Circular floating     |

## 7. Component Specifications

### Buttons
- **Primary**: Category color gradient, white text, height 52px, rounded 26px
- **Rainbow Variants**: Each button in a section uses different rainbow colors
- **Colored Shadows**: Buttons cast colored shadows matching their variant
  - Red: `shadowColor: #E53935, opacity: 0.4, radius: 10`
  - Orange: `shadowColor: #FF9800, opacity: 0.4, radius: 10`
  - Green: `shadowColor: #8BC34A, opacity: 0.4, radius: 10`
  - Cyan: `shadowColor: #00BCD4, opacity: 0.4, radius: 10`
  - Blue: `shadowColor: #2196F3, opacity: 0.4, radius: 10`
  - Purple: `shadowColor: #9C27B0, opacity: 0.4, radius: 10`
- **Secondary**: White background, colored border (1.5px), colored text
- **Ghost**: Transparent background, colored text
- **Press Animation**: Scale 0.97 with spring (damping: 15, stiffness: 200)
- **Depth Effect**: 4px Y-offset shadow creates floating appearance

### Cards
- **Background**: White (light) / `#1E1E1E` (dark)
- **Border**: 1px bottom/sides, 1.5px top highlight `rgba(255,255,255,0.12)` (dark)
- **Radius**: 20px (elevated corners)
- **Shadow**: Layered depth (offset: 0,6, opacity: 0.12, radius: 12)
- **Category Indicator**: 4px colored left border
- **Depth Effect**: Subtle top border highlight creates 3D lift

### Inputs
- **Background**: White (light) / `#1E1E1E` (dark)
- **Border**: 1.5px sides/bottom, 2px top for depth
- **Radius**: 12px
- **Height**: 52px
- **Icon Color**: Category color
- **Focus State**: Enhanced shadow (offset: 0,2, opacity: 0.1)
- **Default State**: Subtle shadow (offset: 0,1, opacity: 0.05)

### Floating Action Buttons (FAB)
- **Background**: Category color
- **Size**: 56px diameter
- **Icon**: White, 24px
- **Position**: Bottom-right, above tab bar
- **Shadow**: Colored shadow matching button color

### Tab Bar
- **Background**: Category background tint
- **Active Icon**: Category color
- **Inactive Icon**: `#757575` (light) / `#78909C` (dark)
- **Icon Size**: 24px
- **Active Indicator**: 3px colored line with animation

## 8. Section Color Mapping

| Section     | Primary Color | Background (Light) | Icon      |
|-------------|---------------|-------------------|-----------|
| Home        | Ruby Red      | Soft Rose         | home      |
| Calendar    | Royal Blue    | Soft Sky          | calendar  |
| Lists       | Sunset Orange | Soft Peach        | list      |
| Notes       | Violet Purple | Soft Lavender     | file-text |
| Budget      | Lime Green    | Soft Mint         | dollar-sign|
| Assistant   | Teal Cyan     | Soft Aqua         | message-circle|
| Profile     | Royal Blue    | Soft Sky          | user      |

## 9. Rainbow Button Distribution

Each section should use multiple rainbow button colors to create variety:

**Example - Calendar Screen:**
- Add Event: Blue (primary action)
- Filter: Purple (secondary action)
- Month View: Green (toggle)
- Week View: Orange (toggle)

**Example - Lists Screen:**
- Add Item: Orange (primary action)
- Shopping Tab: Green (active tab)
- Tasks Tab: Cyan (inactive tab)
- Delete: Red (destructive)

**Example - Budget Screen:**
- Add Expense: Green (primary action)
- Filter: Blue (secondary action)
- Category Pills: Rainbow variety

## 10. Animations

| Animation     | Config                          |
|---------------|---------------------------------|
| Spring Press  | damping: 15, stiffness: 200     |
| Scale Press   | 0.97                            |
| Duration Fast | 150ms                           |
| Duration Normal | 250ms                         |
| Duration Slow | 400ms                           |
| Tab Indicator | Width expansion, color morph    |
| Card Hover    | Subtle scale + shadow increase  |
| List Items    | FadeInDown staggered            |

## 11. Accessibility

- **Contrast Ratio**: Minimum 4.5:1 for text
- **Touch Targets**: Minimum 44x44 points
- **Focus States**: 2px colored outline
- **Screen Reader**: All interactive elements labeled
- **Motion**: Reduced motion support via system settings

## 12. Dark Mode Adaptations

- Category colors shift 1 step lighter for visibility
- Backgrounds use deep, muted tints of category colors
- Cards use elevated surface (`#1E1E1E`)
- Borders become subtle (`#424242`)
- Top highlight borders `rgba(255,255,255,0.12)` create depth

## 13. Depth Effects System

### Shadow Hierarchy
| Level     | Y-Offset | Opacity | Blur Radius | Use Case             |
|-----------|----------|---------|-------------|----------------------|
| sm        | 1px      | 0.05    | 3px         | Subtle elements      |
| md        | 2px      | 0.10    | 4px         | Default cards        |
| card      | 6px      | 0.12    | 12px        | Elevated cards       |
| xl        | 8px      | 0.20    | 16px        | Modal dialogs        |
| floating  | 12px     | 0.25    | 20px        | FABs, popovers       |

### Colored Button Shadows
Each button variant casts a shadow in its own color:
- Creates "glow" effect beneath buttons
- Opacity: 0.4 (vibrant but not overwhelming)
- Blur radius: 10px
- Y-offset: 4px

### Card Depth Techniques
1. **Top Border Highlight**: 1.5px lighter border on top edge
2. **Layered Shadows**: Multiple shadow layers for soft depth
3. **Border Gradient**: Light mode uses subtle gradient border

### Glass Effect (Optional)
- Use `ElevatedView` component with `glassEffect={true}`
- Gradient overlay: white→transparent (top→bottom)
- Light mode: 90%→70% white opacity
- Dark mode: 8%→2% white opacity

---

*This design system ensures a cohesive, vibrant, and accessible experience across all Kinova family coordination features with professional depth and dimensionality.*
