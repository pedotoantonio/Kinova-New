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
- **Primary**: Category color background, white text, height 52px, rounded 26px
- **Rainbow Variants**: Each button in a section uses different rainbow colors
- **Secondary**: White background, colored border (1.5px), colored text
- **Ghost**: Transparent background, colored text
- **Press Animation**: Scale 0.97 with spring (damping: 15, stiffness: 200)

### Cards
- **Background**: White (light) / `#1E1E1E` (dark)
- **Border**: 1px `#E0E0E0` (light) / `#424242` (dark)
- **Radius**: 16px
- **Shadow**: subtle (offset: 0,1, opacity: 0.05, radius: 3)
- **Category Indicator**: 4px colored left border

### Inputs
- **Background**: White (light) / `#1E1E1E` (dark)
- **Border**: 1.5px neutral, 2px colored on focus
- **Radius**: 12px
- **Height**: 52px
- **Icon Color**: Category color

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
- Shadows replaced with subtle borders

---

*This design system ensures a cohesive, vibrant, and accessible experience across all Kinova family coordination features.*
