# Kinova Design Guidelines

## 1. Brand Identity

**Purpose**: Kinova is a family coordination and connection app that helps families stay organized and connected in real-time.

**Aesthetic Direction**: Organic/natural with a calm, trustworthy foundation. The design emphasizes breathing room, soft yet confident presence, and earthy sophistication. Think family harmony translated into visual language—grounded, nurturing, and reliable.

**Memorable Element**: The distinctive teal-green primary color (#2F7F6D) creates a calming, nature-inspired presence that stands apart from typical blue tech apps. Generous whitespace and rounded corners create a welcoming, stress-free environment.

## 2. Navigation Architecture

**Root Navigation**: Tab Navigation (4 tabs with floating action button for core action)

**Screens**:
- Home (Tab 1): Family overview, recent activity
- Calendar (Tab 2): Shared family calendar and events
- [Floating Action Button]: Quick add (task/event)
- Tasks (Tab 3): Shared to-dos and assignments
- Profile (Tab 4): User settings and family management

## 3. Screen-by-Screen Specifications

### Home Screen
- **Purpose**: Overview of family status and recent activity
- **Header**: Transparent, title "Kinova", right button (settings icon)
- **Layout**: Scrollable content
- **Safe Area**: Top inset = headerHeight + 24px, Bottom inset = tabBarHeight + 24px
- **Components**: Family member avatars (horizontal scroll), activity cards, quick action buttons
- **Empty State**: "Your family's story starts here" with empty-home.png illustration

### Calendar Screen
- **Purpose**: View and manage family events
- **Header**: Standard navigation, title "Calendar", right button (add event)
- **Layout**: Calendar view + scrollable event list below
- **Safe Area**: Top inset = 24px, Bottom inset = tabBarHeight + 24px
- **Components**: Month calendar picker, event list cards
- **Empty State**: "No upcoming events" with empty-calendar.png

### Tasks Screen
- **Purpose**: Manage family to-dos
- **Header**: Standard navigation, title "Tasks", right button (filter icon)
- **Layout**: Scrollable list
- **Safe Area**: Top inset = 24px, Bottom inset = tabBarHeight + 24px
- **Components**: Task cards with checkboxes, assignee avatars
- **Empty State**: "All tasks complete!" with empty-tasks.png

### Profile Screen
- **Purpose**: User settings and family management
- **Header**: Transparent, title "Profile"
- **Layout**: Scrollable form
- **Safe Area**: Top inset = headerHeight + 24px, Bottom inset = tabBarHeight + 24px
- **Components**: Avatar, display name, family members list, app preferences, logout button

## 4. Color Palette

**Primary Colors**:
- Primary: #2F7F6D (buttons, key actions, active states)
- Secondary: #6FB7A8 (accents, secondary actions)

**Neutral Colors**:
- Background: #F5F7F6 (screen backgrounds)
- Surface: #FFFFFF (cards, modals)
- TextPrimary: #1F2D2B (headlines, primary text)
- TextSecondary: #5E6E6B (body text, labels)

**Semantic Colors**:
- Success: #4CAF50
- Warning: #FF9800
- Error: #F44336
- Info: #6FB7A8

## 5. Typography

**Font**: System font (SF Pro for iOS, Roboto for Android)

**Type Scale**:
- Title: 28px, Bold
- Subtitle: 20px, Semibold
- Body: 16px, Regular
- Caption: 14px, Regular
- Small: 12px, Regular

**Line Height**: 1.4x font size for readability

## 6. Spacing & Layout

**Spacing Scale**: 4, 8, 12, 16, 24, 32, 48px

**Border Radius**: 
- Cards: 16px
- Buttons: 12px
- Input fields: 14px

**Component Spacing**: Use 16px between major components, 8px for related items

## 7. Components

**Buttons**:
- Primary: Background = Primary color, text = white, radius = 12px, height = 48px
- Secondary: Border = Primary color, text = Primary color, radius = 12px, height = 48px
- Visual feedback: 0.7 opacity on press

**Cards**:
- Background: Surface color
- Radius: 16px
- Padding: 16px
- Shadow: shadowOffset {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2

**Floating Action Button**:
- Size: 56px diameter
- Background: Primary color
- Icon: White, 24px
- Shadow: shadowOffset {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2

**Avatars**:
- Size: 40px (lists), 80px (profile)
- Radius: 50% (circular)
- Border: 2px solid Surface when active

## 8. Assets to Generate

**Required**:
- **icon.png**: Kinova app icon with teal-green theme, abstract family/connection symbol - WHERE USED: Device home screen
- **splash-icon.png**: Simplified version of app icon - WHERE USED: Launch screen
- **empty-home.png**: Warm illustration of family silhouettes in teal tones - WHERE USED: Home screen when no activity
- **empty-calendar.png**: Minimalist calendar with plant motif in secondary color - WHERE USED: Calendar screen when no events
- **empty-tasks.png**: Checkmark with leaf elements in primary color - WHERE USED: Tasks screen when all complete

**User Avatars** (generate 4 preset options):
- **avatar-1.png**: Abstract geometric pattern, teal palette
- **avatar-2.png**: Organic shapes, green palette
- **avatar-3.png**: Minimal nature motif, teal palette
- **avatar-4.png**: Soft geometric, secondary palette
- WHERE USED: Profile screen, family member lists, task assignments

All illustrations should be simple, calming, and use the defined color palette (avoid busy or generic clipart styles).