# Stellarin - Design Guidelines

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