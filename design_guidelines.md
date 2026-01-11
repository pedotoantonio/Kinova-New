# Kinova Design Guidelines

## 1. Brand Identity

**Purpose**: Kinova is a professional family coordination app that helps families stay organized, connected, and in sync.

**Aesthetic Direction**: Modern, warm, and professional. The design combines trust-inspiring green tones with calming blue accents to create a welcoming yet sophisticated experience. Think family harmony meets modern technology.

**Tagline**: "La tua app di fiducia per la famiglia" (Your trusted family app)

**Memorable Element**: The distinctive sage green primary color (#2D8659) creates a trustworthy, nature-inspired presence. Generous whitespace and rounded corners create a welcoming, stress-free environment.

## 2. Navigation Architecture

**Root Navigation**: Tab Navigation (5-7 tabs based on user permissions)

**Screens**:
- Home (Tab 1): Family overview, greeting, quick actions, recent activity
- Calendar (Tab 2): Shared family calendar and events
- Lists (Tab 3): Tasks and shopping lists
- Notes (Tab 4): Family notes and documents
- Budget (Tab 5): Monthly expenses and budgeting (if enabled)
- Assistant (Tab 6): AI-powered family assistant
- Profile (Tab 7): User settings and family management

## 3. Color Palette

**Primary Colors**:
- Primary: #2D8659 (sage green - trust, nature)
- Secondary: #4A90E2 (sky blue - serenity, calm)
- Accent: #FF6B6B (coral - energy, action)

**Neutral Colors**:
- Background: #FAFAFA (almost pure white)
- Surface: #FFFFFF (pure white for cards)
- TextPrimary: #1A1A1A (dark text)
- TextSecondary: #666666 (light text)
- Border: #E0E0E0

**Semantic Colors**:
- Success: #2D8659
- Warning: #FF9800
- Error: #E85D4E
- Info: #4A90E2

**Dark Mode**:
- Primary: #3D9669
- Secondary: #5AA0F2
- Background: #1A1A1A
- Surface: #242424
- Text: #ECEDEE
- TextSecondary: #9BA1A6

## 4. Typography

**Font**: System font (SF Pro for iOS, Roboto for Android)

**Type Scale**:
- Title: 28px, Bold (700)
- Subtitle: 20px, Semibold (600)
- Body: 16px, Regular (400)
- Caption: 14px, Regular (400)
- Small: 12px, Regular (400)

**Line Height**: 1.4x font size for readability

## 5. Spacing & Layout

**Spacing Scale**: 4, 8, 12, 16, 24, 32, 48px

**Border Radius**: 
- Cards: 16px
- Buttons: 12px
- Input fields: 12px
- Small elements: 8px
- Full round: 9999px

**Component Spacing**: Use 16px between major components, 8px for related items

**Input/Button Height**: 52px for comfortable touch targets

## 6. Shadows

**Elevation System**:
- Small: shadowOffset {0, 1}, opacity 0.08, radius 2
- Medium: shadowOffset {0, 2}, opacity 0.10, radius 4
- Large: shadowOffset {0, 4}, opacity 0.12, radius 8

## 7. Components

**Buttons**:
- Primary: Background = Primary color, text = white, radius = 12px, height = 52px
- Secondary: Background = transparent, border = Primary color, text = Primary color
- Outline: Background = transparent, border = border color, text = text color
- Disabled: opacity = 0.5
- Loading: Show ActivityIndicator, disable interaction
- Press feedback: Scale to 0.98 with spring animation

**Cards**:
- Background: Surface color (#FFFFFF light, #242424 dark)
- Radius: 16-24px
- Padding: 16-24px
- Elevation via background color, not shadows

**Inputs**:
- Height: 52px
- Border radius: 12px
- Border: 1px solid border color
- Focus state: Border = primary color
- Error state: Border = error color, show error message below
- Icons: Inside input (left for type icons, right for actions)
- Password toggle: Eye icon on right

**Avatars**:
- Size: 48px (lists), 80px (profile header)
- Radius: 50% (circular)
- Background: Primary color with white initial letter

## 8. Screen Specifications

### Login Screen
- Logo centered at top
- Title: "Accedi al tuo account"
- Email input with envelope icon
- Password input with visibility toggle
- "Password dimenticata?" link
- Primary button for Login
- Secondary link for registration

### Signup Screen
- Logo at top
- Title: "Crea il tuo account"
- Email input
- Password input with strength meter
- Display name input (optional)
- Terms checkbox
- Primary button for Create Account
- Link for existing users

### Home Screen
- Greeting: "Ciao, {Nome}!"
- Welcome card with family icon
- Quick actions grid (4 cards)
- Recent activities section
- Pull-to-refresh

### Profile Screen
- Large circular avatar
- Display name and email
- Account info card
- Security section (password, 2FA)
- Preferences section
- Logout button

### Settings Screen
- Section dividers
- Toggle switches for preferences
- Notification settings
- Privacy settings
- Language selector
- Theme toggle (Light/Dark)
- App version info
- Logout button

## 9. Animations

- Button press: Scale 0.98 with spring (damping: 15, stiffness: 150)
- Screen transitions: Smooth fade/slide
- Loading states: ActivityIndicator with primary color
- Haptic feedback on important actions

## 10. Accessibility

- Minimum touch target: 48x48dp
- Font size minimum: 14px
- Color contrast: WCAG AA compliant
- All interactive elements have testID
- Proper accessibilityLabel and accessibilityRole
