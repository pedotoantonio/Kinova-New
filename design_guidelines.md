# Kinova Design Guidelines

## 1. Brand Identity

**Purpose**: Kinova is a family coordination app that helps families stay organized, connected, and in sync with joy and energy.

**Aesthetic Direction**: Playful/Professional - Vibrant rainbow colors meet clean organization. Like a well-designed family planner that actually makes you smile. The color palette is directly derived from the Kinova logo's rainbow gradient.

**Memorable Element**: Rainbow-inspired color palette where each family area has its own signature color from the logo, creating instant visual recognition and a unified brand experience.

## 2. Color Palette (From Kinova Logo)

### Kinova Brand Colors (Rainbow Sequence)
- **K - Ruby Red**: `#E53935` - Home, Urgent items
- **i - Sunset Orange**: `#FF9800` - Lists & Tasks
- **n - Lime Green**: `#8BC34A` - Success states, Budget
- **o - Teal Cyan**: `#00BCD4` - AI Assistant, Info
- **v - Royal Blue**: `#2196F3` - Primary actions, Calendar, Profile
- **a - Violet Purple**: `#9C27B0` - Notes & Documents

### Neutrals
- **Background**: `#FFFFFF` (Pure White)
- **Surface**: `#FAFAFA` (Light Gray)
- **Text Primary**: `#212121` (Dark Gray)
- **Text Secondary**: `#616161` (Medium Gray)
- **Border**: `#E0E0E0` (Soft Gray)

### Semantic Colors
- **Success**: `#8BC34A` (Lime Green)
- **Warning**: `#FFC107` (Amber)
- **Error**: `#E53935` (Ruby Red)
- **Info**: `#00BCD4` (Teal Cyan)

### Dark Mode
- Background: `#121212`
- Surface: `#1E1E1E`
- Text Primary: `#FAFAFA`
- Brand colors become slightly lighter for visibility

## 3. Gradients

All gradient buttons use the brand color to a lighter tint:
- **Primary (Blue)**: `#2196F3` → `#42A5F5`
- **Red**: `#E53935` → `#EF5350`
- **Orange**: `#FF9800` → `#FFB74D`
- **Green**: `#8BC34A` → `#AED581`
- **Teal**: `#00BCD4` → `#4DD0E1`
- **Purple**: `#9C27B0` → `#BA68C8`
- **Rainbow**: Full gradient for special headers `#E53935 → #FF9800 → #8BC34A → #00BCD4 → #2196F3 → #9C27B0`

## 4. Typography

**Font**: Inter (clean, modern, professional)

| Style | Size | Weight | Line Height |
|-------|------|--------|-------------|
| Large Title | 28px | Bold (700) | 34px |
| Title | 22px | Bold (700) | 28px |
| Subtitle | 18px | Semibold (600) | 24px |
| Body | 16px | Regular (400) | 22px |
| Label | 14px | Medium (500) | 20px |
| Caption | 12px | Regular (400) | 16px |
| Button | 16px | Semibold (600) | 22px |

## 5. Spacing & Layout

- xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 20px, 2xl: 24px, 3xl: 32px
- **Screen Padding**: 20px horizontal
- **Card Padding**: 16px
- **Component Gap**: 12px
- **Input/Button Height**: 52px

## 6. Border Radius

- Buttons: 26px (pill-shaped)
- Cards: 16px
- Inputs: 12px
- Badges: 20px (pill)
- Avatars: 50% (circle)

## 7. Components

### Buttons
- **Primary**: Gradient background (Royal Blue), white text, height 52px, rounded 26px, subtle colored shadow
- **Red/Orange/Green/Teal/Purple**: Same style with respective brand color gradient
- **Secondary**: White background, colored text, 1.5px colored border
- **Ghost**: Transparent, colored text
- Press: Scale 0.97 with spring animation (damping: 15, stiffness: 200)

### Cards
- Background: White
- Border: 1px `#E0E0E0`
- Radius: 16px
- Shadow: subtle (shadowOffset: {0, 1}, shadowOpacity: 0.05, shadowRadius: 3)
- **Category Indicator**: 4px colored left border matching category

### Inputs
- Background: White
- Border: 1.5px `#E0E0E0`
- Focus Border: Primary color (2px)
- Radius: 12px
- Height: 52px
- Left icon in primary color

### Tab Bar
- Background: White
- Border Top: 1px `#E0E0E0`
- Active Icon: Category color from Kinova palette
- Inactive Icon: `#757575`
- Icon Size: 24px
- Active Indicator: 3px colored line above icon with animation

## 8. Category Color Mapping

| Section | Icon | Brand Color |
|---------|------|-------------|
| Home | home | Ruby Red `#E53935` |
| Calendar | calendar | Royal Blue `#2196F3` |
| Lists | list | Sunset Orange `#FF9800` |
| Notes | file-text | Violet Purple `#9C27B0` |
| Budget | dollar-sign | Lime Green `#8BC34A` |
| Assistant | message-circle | Teal Cyan `#00BCD4` |
| Profile | user | Royal Blue `#2196F3` |

## 9. Navigation Architecture

**Root**: Tab Navigation (7 tabs)

**Tabs** (with Kinova logo colors):
1. **Home** (Ruby Red) - Family overview, greeting, quick actions
2. **Calendar** (Royal Blue) - Shared events
3. **Lists** (Sunset Orange) - Tasks, shopping
4. **Notes** (Violet Purple) - Documents
5. **Budget** (Lime Green) - Expenses
6. **Assistant** (Teal Cyan) - AI helper
7. **Profile** (Royal Blue) - Settings, family

## 10. Animations

- **Spring Config**: damping: 15, stiffness: 200
- **Press Scale**: 0.97
- **Duration**: Fast (150ms), Normal (250ms), Slow (400ms)
- **Tab Indicator**: Animated width expansion on tab selection
- **Cards**: Subtle scale on press
- **Lists**: FadeIn animations for items

## 11. Screen Specifications

### Home Screen
- **Header**: Transparent, greeting "Ciao, {Name}!" (Large Title), avatar top-right
- **Layout**: ScrollView with:
  - Welcome card (gradient with primary color, white text)
  - Quick Actions grid (4 colorful icon buttons matching category colors)
  - Recent Activity list (cards with colored left borders)

### Calendar Screen
- **Header**: Default with "Calendario" title, plus button (Royal Blue) top-right
- **Color**: Royal Blue accent throughout

### Lists Screen
- **Header**: Default with "Liste" title
- **Color**: Sunset Orange accent for active items

### Notes Screen
- **Header**: Default with "Note" title
- **Color**: Violet Purple accent for note items

### Budget Screen
- **Header**: Default with "Budget" title
- **Color**: Lime Green accent for expense items

### Assistant Screen
- **Header**: Default with "Assistente" title
- **Color**: Teal Cyan accent for AI interactions
