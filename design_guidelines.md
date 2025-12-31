# Stellarin - Design Guidelines

## Design System

### Color Palette
- **Primary**: Vibrant orange (#FF801F) - energy, warmth, action
- **Secondary**: Light peach (#FFE4CC) - soft, approachable accent
- **Accent**: Deep orange (#FF6B00) - emphasis, progress indicators
- **Background**: Pure white (#FFFFFF) - clean, minimal
- **Surface**: White (#FFFFFF) - cards and elevated elements
- **Text Primary**: Dark charcoal (#2D3436)
- **Text Secondary**: Light gray (#636E72)

### Typography
- **Headings**: SF Pro/System Bold, 24-28pt
- **Body**: SF Pro/System Regular, 16-18pt
- **Large Display**: SF Pro/System Light, 48-64pt
- **Stats/Labels**: SF Pro/System Semibold, 20-24pt

### Component Specifications

**Selection Chips**:
- Rounded rectangles (borderRadius: 16)
- Default: Surface color with 1px Primary border
- Selected: Primary fill with white text
- Press feedback: Scale down to 0.95

**Primary Action Button**:
- Circle or rounded rectangle depending on context
- Background: Primary color, white icon/text
- Drop shadow: offset (0, 2), opacity 0.10, radius 2
- Press feedback: Opacity 0.85

**Cards**:
- Surface background, borderRadius: 12
- Subtle border (1px, rgba(0,0,0,0.08))
- NO drop shadow - use background colors for elevation
- Interactive cards: Background darken 5% on press

**Progress Indicators**:
- Small circles (32pt diameter) for dot-based progress
- Filled: Accent color for completed
- Empty: Surface with light border
- Current: Primary color, optional pulse animation

**Floating Overlay Controls** (e.g., close buttons in flows):
- 32pt circular background
- Semi-transparent white (rgba(255, 255, 255, 0.8))
- Icon at 80% opacity for subtle appearance
- Positioned with safe area insets

### Visual Design

**Icons**: Feather icons from @expo/vector-icons for consistency

**Animations**:
- Spring-based interactions (react-native-reanimated)
- Gentle fade transitions for state changes
- Celebratory micro-animations for achievements
- Pulse effects for live/active indicators

### Accessibility
- Minimum 44pt touch targets for all interactive elements
- High contrast ratios (4.5:1 minimum for body text)
- VoiceOver/TalkBack labels for all interactive components
- Haptic feedback for significant actions
- Reduce motion: Respect system preferences, disable decorative animations
- Dynamic type support for all text components

### Platform Adaptations
- **iOS**: Use blur effects (expo-blur) for overlays and tab bars
- **Android/Web**: Use solid semi-transparent backgrounds as blur fallback
- **iOS 26+**: Leverage liquid glass effects (expo-glass-effect) where appropriate
