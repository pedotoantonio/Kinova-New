# Kinova Bloom Design Guidelines

## 1. Brand Identity

**Purpose**: Kinova is a family coordination app that helps families stay organized, connected, and in sync with joy and energy.

**Aesthetic Direction**: Playful/Professional - Vibrant colors meet clean organization. Like a well-designed family planner that actually makes you smile. Think Notion's clarity with Duolingo's warmth.

**Memorable Element**: Color-coded categories with gradient accents throughout the app. Each family area (calendar, lists, notes, budget) has its own signature color that creates instant visual recognition.

## 2. Color Palette

### Primary Colors
- **Ocean Blue**: `#4A90D9` - Primary actions, Calendar
- **Sunrise Coral**: `#FF7B54` - Lists & Tasks
- **Meadow Green**: `#4CAF7D` - Success states, Budget
- **Lavender Bloom**: `#9B7ED9` - Notes & Documents
- **Sunshine Yellow**: `#FFD93D` - Highlights, Assistant

### Neutrals
- **Background**: `#FFFFFF` (Pure White)
- **Surface**: `#F8F9FA` (Light Gray)
- **Text Primary**: `#2D3436` (Charcoal)
- **Text Secondary**: `#636E72` (Medium Gray)
- **Border**: `#DFE6E9` (Soft Gray)

### Semantic Colors
- **Success**: `#4CAF7D` (Meadow Green)
- **Warning**: `#FFD93D` (Sunshine Yellow)
- **Error**: `#FF6B6B` (Soft Red)
- **Info**: `#4A90D9` (Ocean Blue)

### Dark Mode
- Background: `#1A1D1F`
- Surface: `#252A2E`
- Text Primary: `#F8F9FA`
- Primary colors remain vibrant

## 3. Typography

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

## 4. Spacing & Layout

- xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 20px, 2xl: 24px, 3xl: 32px
- **Screen Padding**: 20px horizontal
- **Card Padding**: 16px
- **Component Gap**: 12px
- **Input/Button Height**: 52px

## 5. Border Radius

- Buttons: 26px (pill-shaped)
- Cards: 16px
- Inputs: 12px
- Badges: 20px (pill)
- Avatars: 50% (circle)

## 6. Components

### Buttons
- **Primary**: Gradient background (e.g., Ocean Blue to lighter tint), white text, height 52px, rounded 26px, subtle shadow (shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.15, shadowRadius: 4)
- **Secondary**: White background, colored text, 1.5px colored border
- **Ghost**: Transparent, colored text
- Press: Scale 0.97 with spring animation

### Cards
- Background: White
- Border: 1px `#DFE6E9`
- Radius: 16px
- Shadow: shadowOffset {width: 0, height: 1}, shadowOpacity 0.05, shadowRadius 3
- **Category Indicator**: 4px colored left border or top gradient strip matching category

### Inputs
- Background: White
- Border: 1.5px `#DFE6E9`
- Focus Border: Category color (2px)
- Radius: 12px
- Height: 52px
- Left icon in category color

### Tab Bar
- Background: White
- Border Top: 1px `#DFE6E9`
- Active Icon: Category color
- Inactive Icon: `#636E72`
- Icon Size: 24px
- Active Indicator: 3px colored line above icon

## 7. Navigation Architecture

**Root**: Tab Navigation (7 tabs)

**Tabs**:
1. **Home** (Ocean Blue) - Family overview, greeting, quick actions
2. **Calendar** (Ocean Blue) - Shared events
3. **Lists** (Sunrise Coral) - Tasks, shopping
4. **Notes** (Lavender Bloom) - Documents
5. **Budget** (Meadow Green) - Expenses
6. **Assistant** (Sunshine Yellow) - AI helper
7. **Profile** (Ocean Blue) - Settings, family

## 8. Screen Specifications

### Home Screen
- **Header**: Transparent, greeting "Ciao, {Name}!" (Large Title), avatar top-right
- **Layout**: ScrollView with:
  - Welcome card (gradient Ocean Blue → lighter tint, white text, family member count)
  - Quick Actions grid (4 colorful icon buttons with labels)
  - Recent Activity list (cards with colored left borders)
- **Safe Area**: Top = headerHeight + xl, Bottom = tabBarHeight + xl

### Calendar Screen
- **Header**: Default with "Calendario" title, plus button (Ocean Blue) top-right
- **Layout**: Calendar view + events list below
- **Components**: Month selector, day grid, event cards (Ocean Blue accents)
- **Empty State**: Illustration (calendar-empty.png)

### Lists Screen
- **Header**: Transparent, "Liste" title, plus button (Sunrise Coral)
- **Layout**: Segmented control (Tasks/Shopping), card list
- **Components**: Checkbox items, progress bars (Sunrise Coral)
- **Empty State**: Illustration (lists-empty.png)

### Notes Screen
- **Header**: Default, "Note" title, plus button (Lavender Bloom)
- **Layout**: Grid of note cards (2 columns)
- **Components**: Note preview cards (Lavender Bloom top strip)
- **Empty State**: Illustration (notes-empty.png)

### Budget Screen
- **Header**: Default, "Budget" title, filter button
- **Layout**: Monthly summary card + expense list
- **Components**: Pie chart (Meadow Green gradients), category tags
- **Empty State**: Illustration (budget-empty.png)

### Assistant Screen
- **Header**: Transparent, "Assistente" title
- **Layout**: Chat interface
- **Components**: Message bubbles (user: white with border, AI: Sunshine Yellow tint)
- **Safe Area**: Top = headerHeight + xl, Bottom = tabBarHeight + input height + xl

### Profile Screen
- **Header**: Default, "Profilo" title
- **Layout**: ScrollView with avatar, name, settings cards
- **Components**: Large circular avatar (120px), setting rows with icons, logout button (Error color)

### Login Screen
- **Header**: None
- **Layout**: Centered content with logo, form card
- **Components**: Logo (app icon), email/password inputs, primary button (Ocean Blue gradient)
- **Safe Area**: Top = insets.top + xl, Bottom = insets.bottom + xl

## 9. Visual Design

### Gradients
Use for primary buttons, welcome cards, and category headers:
- Ocean Blue: `#4A90D9` → `#6BA8E3`
- Sunrise Coral: `#FF7B54` → `#FF9575`
- Meadow Green: `#4CAF7D` → `#6FC596`
- Lavender Bloom: `#9B7ED9` → `#B299E3`
- Sunshine Yellow: `#FFD93D` → `#FFE26B`

### Icons
- Use Feather icons from @expo/vector-icons
- Stroke width: 2px
- Colors: Match category or text gray
- Sizes: 24px (navigation/actions), 20px (inline), 32px (decorative)

### Animations
- Screen transitions: Slide with fade
- Button press: Scale 0.97, spring (damping: 15, stiffness: 200)
- List item appear: Fade + translateY
- Loading: ActivityIndicator with category color
- Haptic feedback on primary actions

## 10. Assets to Generate

| Filename | Description | Where Used |
|----------|-------------|------------|
| icon.png | App icon with colorful gradient logo | Device home screen |
| splash-icon.png | Simplified logo for launch screen | App launch |
| calendar-empty.png | Colorful calendar illustration (Ocean Blue tones) | Calendar empty state |
| lists-empty.png | Checklist illustration (Coral tones) | Lists empty state |
| notes-empty.png | Document/note illustration (Lavender tones) | Notes empty state |
| budget-empty.png | Piggy bank/coins illustration (Green tones) | Budget empty state |
| welcome-family.png | Happy family illustration | Home screen welcome card |
| avatar-1.png | Preset avatar option 1 | Profile, onboarding |
| avatar-2.png | Preset avatar option 2 | Profile, onboarding |
| avatar-3.png | Preset avatar option 3 | Profile, onboarding |

**Image Quality**: Simple, friendly illustrations with rounded shapes matching the Kinova Bloom aesthetic. Avoid overly detailed or clipart-style images.