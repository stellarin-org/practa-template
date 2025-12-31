# Meditation Timer App - Design Guidelines

## Authentication
**Required**: Google Sign-In (SSO)
- **Rationale**: App requires tracking rice donations, streaks, and user progress across sessions
- **Implementation**:
  - Landing screen shows meditation illustration, app mission, and "Sign in with Google" button
  - Post-auth: Navigate to Timer (home) screen
  - Account screen includes: logout, delete account (nested under Settings > Account)

## Navigation Architecture
**Tab Navigation** (4 tabs + FAB for core action)
1. **Home/Timer** - Main meditation timer interface
2. **Progress** - Streaks, challenges, stats
3. **Start** (FAB) - Centered floating action button to start meditation
4. **Community** - Live meditator count, leaderboards (future)
5. **About** - Mission, how it works, donate

**Stack Modality**:
- Session screen (active meditation): Full-screen modal with dismiss gesture
- Settings: Native modal from Profile tab

## Screen Specifications

### 1. Timer Screen (Home)
- **Purpose**: Select meditation duration and view quick stats
- **Layout**:
  - Header: Transparent, right button (Settings icon)
  - Main: ScrollView with top inset = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl
  - Floating FAB: "Start" button (center bottom, above tab bar)
- **Components**:
  - Timer duration chips (6s, 1min, 5min, 10min, 15min, 25min, 45min, 60min) in 2-column grid
  - Quick stats cards: rice harvested today, current streak
  - "X people meditating now" live counter

### 2. Progress Screen
- **Purpose**: View streaks, challenges, and donation impact
- **Layout**:
  - Header: Default navigation header, title "Your Progress"
  - Main: ScrollView, top inset = Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Components**:
  - 7-day streak calendar (horizontal row, SAT-FRI)
  - Challenge card: "90 Days Challenge" with progress bar (0/90)
  - Total rice harvested (large number with grain icon)
  - Meditation history list (collapsible by week)

### 3. Active Session Screen (Modal)
- **Purpose**: Meditation timer in progress
- **Layout**:
  - Full screen modal, safe area insets all around
  - No tab bar, minimal UI
- **Components**:
  - Large circular progress ring (timer countdown)
  - Pause/Stop buttons at bottom
  - Rice counter animating (+10 every minute)
  - Ambient background (optional blur or gradient)

### 4. About Screen
- **Purpose**: Mission statement, how it works, donation info
- **Layout**:
  - Header: Default navigation, title "Our Mission"
  - Main: ScrollView, standard insets
- **Components**:
  - Mission cards: "Teaching Meditation" and "Empowering Change"
  - "Where does the rice come from?" FAQ section
  - Donate button (tertiary CTA)

## Design System

### Color Palette
- **Primary**: Vibrant orange (#FF801F) - energy, warmth, action
- **Secondary**: Light peach (#FFE4CC) - soft rice/wheat tone
- **Accent**: Deep orange (#FF6B00) - emphasis, progress
- **Background**: Pure white (#FFFFFF) - clean, minimal
- **Surface**: White (#FFFFFF)
- **Text**: Dark charcoal (#2D3436), Light gray (#636E72)

### Typography
- **Headings**: SF Pro/System Bold, 24-28pt
- **Body**: SF Pro/System Regular, 16-18pt
- **Timer**: SF Pro/System Light, 48-64pt (large countdown)
- **Stats**: SF Pro/System Semibold, 20-24pt

### Component Specifications
- **Timer Duration Chips**:
  - Rounded rectangles (borderRadius: 16)
  - Fill: Surface color, border: 1px Primary
  - Active state: Fill with Primary, white text
  - Press feedback: Scale down to 0.95
  
- **Floating Action Button (Start)**:
  - Circle, 64pt diameter
  - Background: Primary color, white icon
  - Drop shadow: offset (0, 2), opacity 0.10, radius 2
  - Press feedback: Opacity 0.85

- **Progress Cards**:
  - Surface background, borderRadius: 12
  - Subtle border (1px, rgba(0,0,0,0.08))
  - NO drop shadow for cards
  - Press feedback if interactive: Background darken 5%

- **Streak Calendar Indicators**:
  - Small circles (32pt diameter)
  - Filled: Accent color
  - Empty: Surface with light border
  - Today: Primary color with pulse animation

### Visual Design
- **Icons**: Feather icons for UI actions, custom rice grain icon for stats
- **Animations**:
  - Timer countdown: Smooth ring progress
  - Rice counter: Gentle fade-in per grain increment
  - Streak unlock: Celebratory micro-animation
- **Illustrations**: Meditation figure (hero illustration on landing/home)

### Critical Assets
1. **Meditation illustration** - Calm figure in sitting pose (main hero image)
2. **Rice grain icon** - Simple, recognizable grain silhouette for stats
3. **Streak badge icons** - 3, 7, 30, 90 day milestone badges

### Accessibility
- All timer chips minimum 44pt touch targets
- High contrast ratios (4.5:1 minimum for body text)
- VoiceOver labels for timer states, progress updates
- Haptic feedback on session start/complete
- Reduce motion: Disable pulse/fade animations
- Dynamic type support for all text components