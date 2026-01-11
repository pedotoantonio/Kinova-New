# Kinova Design Guidelines - WeUs Style

## Overview
Kinova follows the WeUs design system - a warm, minimal, and elegant aesthetic with soft earth tones and generous white space. The design emphasizes trust, warmth, and simplicity for family coordination.

## 1. Brand Identity

**Purpose**: Kinova is a professional family coordination app that helps families stay organized, connected, and in sync.

**Aesthetic Direction**: Warm, minimal, and elegant. The design combines soft taupe/teal tones with beige accents to create a calming, trustworthy experience. Think family warmth meets modern simplicity.

**Tagline**: "La tua app di fiducia per la famiglia" (Your trusted family app)

## 2. Color Palette

### Primary Colors
- **Primary**: `#8F867D` (Soft Teal/Taupe) - Main brand color for buttons, active states, navigation
- **Secondary**: `#D4C5B0` (Warm Beige) - Secondary elements, inactive states, tab icons

### Accent Colors
- **Coral**: `#F0A8A8` - Soft coral for highlights, alerts, notifications
- **Yellow**: `#F4D89A` - Light yellow for warnings, special highlights
- **Green**: `#C3E4C8` - Light mint green for success states, confirmations

### Neutral Colors
- **Background**: `#FDFBF9` (Warm White) - Main background color
- **Surface**: `#FFFFFF` (Pure White) - Cards, modals, elevated surfaces
- **Background Secondary**: `#F5F0EB` - Secondary backgrounds
- **Text Primary**: `#4A4A4A` (Dark Gray) - Main text color
- **Text Secondary**: `#7A7A7A` (Medium Gray) - Secondary text, labels
- **Text Light**: `#9A9A9A` (Light Gray) - Placeholder text, disabled states
- **Border**: `#E5DED4` (Soft Border) - Input borders, dividers
- **Border Light**: `#EDE8E1` - Subtle separators

### Dark Mode
- Background Root: `#1E1D1C`
- Surface: `#2A2826`
- Primary adjusted: `#A69D94`
- Text: `#F5F0EB`

## 3. Typography

### Font Family
**Inter** - A clean, modern sans-serif typeface with excellent readability

### Type Scale
| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Large Title | 28px | Bold (700) | 34px | Main screen titles |
| Title | 24px | Bold (700) | 30px | Section headers |
| Subtitle | 18px | Semi-bold (600) | 24px | Card titles, small headings |
| Body | 16px | Regular (400) | 22px | Main content text |
| Label | 14px | Regular (400) | 20px | Form labels, metadata |
| Caption | 13px | Regular (400) | 18px | Secondary information |
| Small | 12px | Regular (400) | 16px | Footnotes, timestamps |
| Button | 16px | Semi-bold (600) | 22px | Button text |

## 4. Spacing System

### Base Units
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 20px
- 2xl: 24px
- 3xl: 32px
- 4xl: 40px

### Layout Spacing
- **Screen Padding**: 20px horizontal
- **Card Padding**: 20px all sides
- **Component Margins**: 16px between elements
- **Input Height**: 52px
- **Button Height**: 52px

## 5. Border Radius

| Element | Radius |
|---------|--------|
| Buttons | 20px |
| Inputs | 16px |
| Cards | 20px |
| Small elements | 12px |
| Badges/Tags | 8px |

## 6. Components

### Buttons
- **Primary**: Background `#8F867D`, white text, rounded 20px, NO shadow
- **Secondary**: Background `#D4C5B0`, dark text, rounded 20px
- **Outline**: Transparent, 1.5px border primary color, rounded 20px
- **Ghost**: Transparent, primary text color
- Height: 52px with generous horizontal padding (24px)
- Press animation: Scale 0.98 with spring

### Inputs
- Background: Warm white `#FDFBF9`
- Border: `#E5DED4` (1px)
- Focus Border: `#8F867D` (primary color)
- Border Radius: 16px
- Height: 52px
- Padding: 16px horizontal
- Icons: Left for type indication, right for actions

### Cards
- Background: Pure white `#FFFFFF`
- Border: `#E5DED4` (1px)
- Border Radius: 20px
- Padding: 20px
- **NO shadows** - use subtle borders instead

### Navigation (Bottom Tab Bar)
- Background: `#8F867D` (primary color)
- Active Icon: White `#FFFFFF`
- Inactive Icon: Beige `#D4C5B0`
- Icon Size: 24px
- Label Size: 11px, weight 500

## 7. Icons

### Style
- Simple, minimal line icons (Feather icon set)
- Stroke width: Default (2px)
- Color: Primary `#8F867D` or Text `#4A4A4A`

### Sizes
- Navigation: 24px
- Action buttons: 22px
- Inline icons: 18px
- Large decorative: 28px

## 8. Navigation Architecture

**Root Navigation**: Tab Navigation (5-7 tabs based on user permissions)

**Screens**:
- Home (Tab 1): Family overview, greeting, quick actions, recent activity
- Calendar (Tab 2): Shared family calendar and events
- Lists (Tab 3): Tasks and shopping lists
- Notes (Tab 4): Family notes and documents
- Budget (Tab 5): Monthly expenses and budgeting (if enabled)
- Assistant (Tab 6): AI-powered family assistant
- Profile (Tab 7): User settings and family management

## 9. Design Principles

### 1. Generous White Space
- Allow content to breathe with ample margins and padding
- Use 20px screen padding, 16px between components
- Avoid cluttered layouts

### 2. Soft & Warm
- Warm white backgrounds instead of pure white for root
- Soft border colors instead of harsh lines
- Earth-toned accent colors

### 3. Minimal & Elegant
- **No shadows on components** (use subtle borders)
- Clean, simple iconography
- Limited color usage per screen

### 4. Consistent Hierarchy
- Clear visual hierarchy with type scale
- Primary actions prominent, secondary actions subtle
- Logical grouping with cards and sections

### 5. Accessibility
- Sufficient color contrast (4.5:1 minimum)
- Touch targets minimum 44px
- Clear focus states for inputs

## 10. Animations
- Button press: Scale 0.98 with spring (damping: 15, stiffness: 150)
- Screen transitions: Smooth fade/slide
- Loading states: ActivityIndicator with primary color
- Haptic feedback on important actions

## 11. Screen Specifications

### Login Screen
- Logo centered at top with primary background
- App name and tagline below logo
- Card-based form layout
- Email input with mail icon
- Password input with visibility toggle
- Primary button for Login (WeUs style)
- Link for registration mode toggle

### Home Screen
- Greeting: "Ciao, {Nome}!"
- Welcome card with family info
- Quick actions grid
- Recent activities section
- Pull-to-refresh

### Profile Screen
- Large circular avatar
- Display name and email
- Settings cards with icons
- Logout button
