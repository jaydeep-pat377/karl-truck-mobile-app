# PROJECT_CONTEXT.md
# TruckAst Dolese ReadyMix - React Native Mobile Application

> **Document Version**: 1.0.0
> **Last Updated**: January 2026
> **Status**: Production Ready

---

## Table of Contents

1. [Project Overview & Vision](#1-project-overview--vision)
2. [Business Goals & Success Criteria](#2-business-goals--success-criteria)
3. [User Personas & Usage Scenarios](#3-user-personas--usage-scenarios)
4. [Functional Scope](#4-functional-scope)
5. [Non-Goals & Constraints](#5-non-goals--constraints)
6. [UI/UX Principles](#6-uiux-principles)
7. [Technology Stack](#7-technology-stack)
8. [App Architecture](#8-app-architecture)
9. [API Integration](#9-api-integration)
10. [Security Architecture](#10-security-architecture)
11. [Testing Strategy](#11-testing-strategy)
12. [Appendix](#12-appendix)

---

## 1. Project Overview & Vision

### 1.1 Application Identity

| Attribute | Value |
|-----------|-------|
| **App Name** | TruckAst Dolese ReadyMix |
| **Short Name** | TK-Dol-RM Mobile |
| **Bundle ID (iOS)** | `com.truckast.dolese.readymix` |
| **Package Name (Android)** | `com.truckast.dolese.readymix` |
| **Platform** | iOS & Android (React Native) |

### 1.2 Business Domain

**Industry**: Ready-Mix Concrete Supply & Dispatching Operations

**Company**: Dolese Brothers - A leading ready-mix concrete supplier serving contractors, construction companies, and commercial projects.

**Core Operations**:
- Ready-mix concrete production and delivery
- Order management and confirmation
- Real-time dispatch and truck tracking
- Customer communication and coordination
- Weather-dependent delivery scheduling

### 1.3 Project Vision

> *"Empower field staff, dispatchers, and customers with a fast, modern, and intuitive mobile experience that brings real-time order tracking, delivery visibility, and seamless communication to their fingertips."*

### 1.4 Key Differentiators

| Feature | Mobile Advantage |
|---------|------------------|
| **Real-Time Tracking** | GPS-based truck tracking with live map updates |
| **Push Notifications** | Instant alerts for order updates, dispatch changes |
| **Weather Integration** | At-a-glance weather conditions for delivery planning |
| **Quick Actions** | One-tap access to critical order information |
| **Offline-Ready Design** | UI optimized for intermittent connectivity (future) |

### 1.5 Relationship to Existing Website

| Aspect | Website | Mobile App |
|--------|---------|------------|
| **Primary Use** | Full administrative operations | Field operations & monitoring |
| **Target Environment** | Office/Desktop | On-the-go/Field |
| **Feature Scope** | Complete feature set | Focused mobile-optimized features |
| **Admin Functions** | Full admin capabilities | No admin features |
| **Design Reference** | Existing web design | Figma designs (mobile-first) |

**Note**: The existing website serves as the **business context reference** for understanding the domain. The mobile app follows **Figma designs** as the primary UI/UX reference.

---

## 2. Business Goals & Success Criteria

### 2.1 Primary Business Objectives

#### Operational Efficiency
- Speed up order confirmation and status updates
- Reduce time from dispatch to delivery tracking visibility
- Enable real-time communication between dispatch and field

#### Customer Experience
- Provide customers easy access to order status
- Enable real-time delivery tracking on maps
- Deliver instant push notifications for order updates

#### Field Productivity
- Empower field staff with real-time order information
- Provide weather-aware delivery planning tools
- Streamline communication with dispatch and customers

#### Cost Reduction
- Reduce phone calls through self-service order tracking
- Minimize manual data entry errors
- Decrease miscommunication-related delays

### 2.2 Success Criteria & KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **App Adoption Rate** | 80% of field staff within 3 months | Active users / Total eligible users |
| **Order Check Frequency** | 3+ times per day per user | Analytics tracking |
| **Push Notification Engagement** | 60%+ open rate | Notification analytics |
| **Customer Satisfaction** | 4.5+ App Store rating | Store reviews |
| **Support Call Reduction** | 30% reduction in "order status" calls | Call center data |
| **App Crash Rate** | < 0.5% | Crashlytics/Sentry |
| **Load Time** | < 2 seconds for main screens | Performance monitoring |

### 2.3 Release Strategy

| Phase | Scope | Timeline |
|-------|-------|----------|
| **MVP** | Core features, all authenticated users | Initial Release |
| **Phase 2** | Role-based access control | Post-MVP |
| **Phase 3** | Offline capabilities | Future |
| **Phase 4** | Advanced analytics | Future |

---

## 3. User Personas & Usage Scenarios

### 3.1 Primary User Personas

#### Persona 1: Field Dispatcher (Mike)

| Attribute | Description |
|-----------|-------------|
| **Role** | Field Dispatch Coordinator |
| **Age** | 35-50 |
| **Tech Comfort** | Moderate |
| **Primary Device** | Android tablet or smartphone |
| **Work Environment** | Dispatch office, occasionally on-site |

**Goals**:
- Monitor all active orders and their status
- Track truck locations in real-time
- Communicate quickly with drivers and customers
- React to schedule changes and weather conditions

**Pain Points**:
- Switching between multiple systems
- Delayed information from the field
- Difficulty coordinating last-minute changes

**Key Scenarios**:
1. Morning review of all scheduled orders
2. Real-time monitoring of truck deliveries
3. Responding to customer inquiries about delivery ETA
4. Adjusting schedules due to weather changes

---

#### Persona 2: Customer/Contractor (Sarah)

| Attribute | Description |
|-----------|-------------|
| **Role** | Construction Project Manager |
| **Age** | 30-45 |
| **Tech Comfort** | High |
| **Primary Device** | iPhone |
| **Work Environment** | Construction sites, mobile |

**Goals**:
- Know exactly when concrete deliveries will arrive
- Track delivery trucks on their way to the site
- Receive immediate notifications of any changes
- Communicate issues or changes easily

**Pain Points**:
- Uncertainty about delivery timing
- Having to call for status updates
- Crew standing idle waiting for deliveries

**Key Scenarios**:
1. Checking delivery ETA while on job site
2. Receiving notification that truck is 15 minutes away
3. Viewing all upcoming orders for the week
4. Contacting dispatch about a schedule change

---

### 3.2 User Journey Maps

#### Journey: Order Status Check

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Open App  │───►│    Login    │───►│ View Orders │───►│Order Details│
│  (Biometric)│    │ (if needed) │    │    List     │    │  & Tracking │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
                                                         ┌─────────────┐
                                                         │  View Map   │
                                                         │   Tracking  │
                                                         └─────────────┘
```

#### Journey: Responding to Delivery Notification

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Push     │───►│  Tap to     │───►│   Order     │───►│  Track on   │
│Notification │    │  Open App   │    │   Details   │    │     Map     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 4. Functional Scope

### 4.1 Design Reference

> **Primary Reference**: Figma Designs
> **Link**: https://www.figma.com/design/AiyzqEWrLPhMeQyP0w6Q41/Untitled?node-id=0-1&p=f
> **Note**: Figma designs are DEMO/draft quality. UI should be enhanced for production-ready, modern mobile UX.

### 4.2 Screen Inventory (Based on Figma)

| # | Screen Name | Priority | Description |
|---|-------------|----------|-------------|
| 1 | **Splash Screen** | P0 | App launch with branding |
| 2 | **Login** | P0 | Authentication with biometric/PIN options |
| 3 | **Weather Dashboard** | P0 | Weather conditions, temperature, humidity, wind |
| 4 | **Home / Order List** | P0 | List of orders with status indicators |
| 5 | **Order Details** | P0 | Complete order information |
| 6 | **Map & Tracking** | P0 | Real-time truck tracking on map |
| 7 | **Appointments** | P1 | Schedule management and order scheduling |
| 8 | **Notifications** | P1 | Notification center and alert management |
| 9 | **Settings** | P1 | App preferences and profile management |
| 10 | **Profile** | P2 | User profile information |

### 4.3 Feature Specifications

#### 4.3.1 Weather Dashboard

**Purpose**: Provide at-a-glance weather information for delivery planning

**Features**:
- Current temperature display (large, prominent)
- Weather condition icon and description
- Humidity percentage
- Wind speed and direction
- Weather alerts/warnings
- Location-based weather data

**UI Reference**: Blue gradient design with weather iconography

**Data Requirements**:
- Weather API integration
- Location services (user permission required)
- Refresh interval: Every 30 minutes or on-demand

---

#### 4.3.2 Home / Order List

**Purpose**: Central hub for viewing and managing orders

**Features**:
- List view of all orders
- Status indicators (color-coded)
  - Pre-Pour (yellow)
  - In Process (blue)
  - Completed (green)
  - Cancelled (red)
- Quick filters (Today, Tomorrow, This Week, All)
- Search functionality
- Pull-to-refresh
- Order count summary

**Data Fields per Order Card**:
- Order code/number
- Customer name
- Delivery address (truncated)
- Scheduled date/time
- Status badge
- Product type (e.g., concrete mix)

**Interactions**:
- Tap card → Navigate to Order Details
- Long press → Quick actions menu
- Swipe actions (optional enhancement)

---

#### 4.3.3 Order Details

**Purpose**: Complete information about a single order

**Sections**:
1. **Header**
   - Order code
   - Status badge
   - Quick action buttons (Call, Track)

2. **Customer Information**
   - Customer name
   - Contact phone
   - Delivery address (with map preview)

3. **Order Information**
   - Product details (mix type, quantity)
   - Scheduled delivery time
   - Special instructions/notes

4. **Delivery Status**
   - Current status
   - Assigned truck (if applicable)
   - ETA (if in transit)

5. **Actions**
   - View on Map (navigate to Map & Tracking)
   - Call Customer
   - View Order History

---

#### 4.3.4 Map & Tracking

**Purpose**: Real-time visualization of truck locations and delivery routes

**Features**:
- Full-screen map view
- Truck location markers (real-time)
- Delivery destination marker
- Route visualization (current path)
- ETA display
- Truck information overlay (driver name, truck ID)
- Zoom controls
- Center on truck button
- Center on destination button

**Map Interactions**:
- Pinch to zoom
- Pan to explore
- Tap marker for info popup
- Tap destination for address details

**Technical Requirements**:
- Mapbox GL integration
- Real-time location updates (WebSocket or polling)
- Geofencing for arrival detection
- Offline map caching (future enhancement)

---

#### 4.3.5 Appointments / Schedule

**Purpose**: View and manage delivery schedules

**Features**:
- Calendar view (day/week)
- Time-slot based scheduling
- Order scheduling details
- Schedule conflicts indication
- "Make Appointment" functionality (if applicable)

---

#### 4.3.6 Notification Center

**Purpose**: Centralized notification management

**Notification Types**:
| Type | Description | Priority |
|------|-------------|----------|
| Order Status | Status changes (confirmed, in-transit, delivered) | High |
| Dispatch Alert | Truck assignments, route changes | High |
| ETA Updates | Delivery time changes | Medium |
| Weather Alerts | Weather-related delivery impacts | Medium |
| Communication | Messages from dispatch | Medium |
| System | App updates, maintenance notices | Low |

**Features**:
- Notification list (chronological)
- Unread indicator
- Mark as read (individual/all)
- Notification preferences link
- Deep linking to relevant screens

---

#### 4.3.7 Settings

**Purpose**: App configuration and preferences

**Settings Categories**:

1. **Account**
   - Profile information
   - Change password
   - Logout

2. **Notifications**
   - Push notification toggle (by type)
   - Email notification preferences
   - Quiet hours

3. **Appearance**
   - Language selection (EN, ES, FR-CA)
   - Theme (Light/Dark/System)

4. **Security**
   - Biometric login toggle
   - PIN management
   - Session timeout

5. **About**
   - App version
   - Terms of service
   - Privacy policy
   - Contact support

---

### 4.4 Push Notification Strategy

| Event | Title | Body | Action |
|-------|-------|------|--------|
| Order Confirmed | "Order Confirmed" | "Order #12345 confirmed for Jan 15, 9:00 AM" | Open Order Details |
| Truck Dispatched | "Truck En Route" | "Truck #T-101 is on the way to your site" | Open Map Tracking |
| Delivery ETA | "Delivery Update" | "Estimated arrival in 15 minutes" | Open Map Tracking |
| Order Delivered | "Delivery Complete" | "Order #12345 has been delivered" | Open Order Details |
| Weather Alert | "Weather Advisory" | "Rain expected - delivery may be affected" | Open Weather Dashboard |

---

## 5. Non-Goals & Constraints

### 5.1 Explicit Non-Goals (Mobile App)

The following features are **intentionally excluded** from the mobile app:

| Feature | Reason | Alternative |
|---------|--------|-------------|
| **Admin Dashboard** | Complex admin operations require desktop | Use website |
| **User Management** | Create/edit/delete users | Use website |
| **Role & Permission Management** | Administrative function | Use website |
| **Plant Configuration** | Complex setup operations | Use website |
| **Payment Processing** | Financial transactions handled separately | External system |
| **Invoice Management** | Complex document handling | Use website |
| **Heavy Reporting** | Complex analytics and exports | Use website |
| **Data Import/Export** | Bulk operations | Use website |
| **Tenant Management** | Multi-tenant admin | Use website |

### 5.2 Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **Online Only (MVP)** | No offline data access | Clear offline messaging, graceful degradation |
| **API Dependency** | All data from backend | Robust error handling, retry logic |
| **Map Data Usage** | High data consumption | Map caching, data usage warnings |
| **Battery Usage** | GPS tracking drains battery | Efficient polling, battery optimization |

### 5.3 Business Constraints

| Constraint | Description |
|------------|-------------|
| **Role-Based Access (Later)** | MVP has all users see all data; roles added post-MVP |
| **Figma as Reference** | Designs are drafts; improvements encouraged |
| **Multi-Language Required** | Must support EN, ES, FR-CA from launch |
| **Cross-Platform** | Must work on both iOS and Android |

---

## 6. UI/UX Principles

### 6.1 Design Philosophy

> **"Modern, Fast, User-Friendly"**

| Principle | Description |
|-----------|-------------|
| **Mobile-First** | Design for touch, small screens, and one-handed use |
| **Speed Over Features** | Prioritize fast load times and responsive interactions |
| **Clear Visual Hierarchy** | Important information should be immediately visible |
| **Consistent Patterns** | Similar actions should work the same way everywhere |
| **Accessibility** | WCAG 2.1 AA compliance minimum |

### 6.2 Visual Design Guidelines

#### Color Palette

Based on Figma analysis and brand requirements:

| Color | Usage | Hex (Light) | Hex (Dark) |
|-------|-------|-------------|------------|
| **Primary** | CTAs, headers, active states | `#0066CC` | `#4DA6FF` |
| **Secondary** | Supporting elements | `#6B7280` | `#9CA3AF` |
| **Success** | Completed, positive | `#22C55E` | `#4ADE80` |
| **Warning** | Attention needed | `#F59E0B` | `#FBBF24` |
| **Error** | Errors, cancelled | `#EF4444` | `#F87171` |
| **Background** | Screen backgrounds | `#FFFFFF` | `#111827` |
| **Surface** | Cards, modals | `#F9FAFB` | `#1F2937` |
| **Text Primary** | Main text | `#111827` | `#F9FAFB` |
| **Text Secondary** | Supporting text | `#6B7280` | `#9CA3AF` |

#### Weather Dashboard Gradient

```css
/* Blue gradient for weather screens */
background: linear-gradient(180deg, #0066CC 0%, #00A3E0 100%);
```

#### Typography

| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| **H1** | 28sp | Bold | Screen titles |
| **H2** | 24sp | SemiBold | Section headers |
| **H3** | 20sp | SemiBold | Card titles |
| **Body** | 16sp | Regular | Main content |
| **Body Small** | 14sp | Regular | Secondary content |
| **Caption** | 12sp | Regular | Labels, timestamps |

#### Spacing System

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4dp | Tight spacing |
| `sm` | 8dp | Related elements |
| `md` | 16dp | Standard spacing |
| `lg` | 24dp | Section separation |
| `xl` | 32dp | Major sections |

### 6.3 Component Patterns

#### Cards

```
┌─────────────────────────────────────┐
│ [Status Badge]          [Timestamp] │
│                                     │
│ Order #12345                        │
│ ABC Construction Company            │
│                                     │
│ 📍 123 Main St, City, State        │
│ 📅 Jan 15, 2026 • 9:00 AM          │
│                                     │
│ [Product: Concrete Mix 3000]        │
└─────────────────────────────────────┘
```

#### Status Badges

| Status | Color | Label |
|--------|-------|-------|
| Pre-Pour | Yellow/Amber | PRE-POUR |
| In Process | Blue | IN PROCESS |
| Completed | Green | COMPLETED |
| Cancelled | Red | CANCELLED |
| On Hold | Gray | ON HOLD |

#### Bottom Navigation

```
┌───────────────────────────────────────────────────────┐
│   🏠        📋        🗺️        🔔        ⚙️        │
│  Home     Orders      Map    Notifications Settings   │
└───────────────────────────────────────────────────────┘
```

### 6.4 Interaction Patterns

| Interaction | Behavior |
|-------------|----------|
| **Pull to Refresh** | Standard refresh on all list screens |
| **Infinite Scroll** | Paginated loading for long lists |
| **Swipe Back** | iOS-style navigation back gesture |
| **Haptic Feedback** | Light feedback on button presses |
| **Loading States** | Skeleton screens, not spinners |
| **Error States** | Friendly messages with retry options |
| **Empty States** | Helpful illustrations with guidance |

### 6.5 Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Touch Targets** | Minimum 44x44dp |
| **Color Contrast** | 4.5:1 minimum for text |
| **Screen Reader** | Full VoiceOver/TalkBack support |
| **Dynamic Type** | Support system font scaling |
| **Reduce Motion** | Respect system preference |

### 6.6 Internationalization (i18n)

**Supported Languages**:
| Code | Language | Direction |
|------|----------|-----------|
| `en` | English | LTR |
| `es` | Spanish | LTR |
| `fr-CA` | French (Canadian) | LTR |

**Implementation Notes**:
- All UI strings externalized
- Date/time format localized
- Number format localized
- Currency format localized
- Pluralization rules per language

---

## 7. Technology Stack

### 7.1 Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.73+ | Cross-platform mobile framework |
| **TypeScript** | 5.0+ | Type-safe JavaScript |
| **Expo** | SDK 50+ | Development tooling (optional) |

### 7.2 State Management & Data

| Technology | Purpose |
|------------|---------|
| **TanStack Query (React Query)** | Server state management, caching |
| **Zustand** | Client state management (minimal) |
| **AsyncStorage / MMKV** | Local persistence |

### 7.3 Navigation

| Technology | Purpose |
|------------|---------|
| **React Navigation v6+** | Screen navigation |
| **@react-navigation/native-stack** | Native stack navigator |
| **@react-navigation/bottom-tabs** | Bottom tab navigation |

### 7.4 UI Components

| Technology | Purpose |
|------------|---------|
| **React Native Paper** | Material Design components |
| **React Native Reanimated** | Smooth animations |
| **React Native Gesture Handler** | Touch interactions |
| **React Native SVG** | Vector graphics |
| **React Native Fast Image** | Optimized image loading |

### 7.5 Forms & Validation

| Technology | Purpose |
|------------|---------|
| **React Hook Form** | Form state management |
| **Zod** | Schema validation |

### 7.6 Maps & Location

| Technology | Purpose |
|------------|---------|
| **React Native Maps** | Map rendering |
| **@rnmapbox/maps** | Mapbox integration |
| **react-native-geolocation-service** | GPS location |

### 7.7 Notifications

| Technology | Purpose |
|------------|---------|
| **@react-native-firebase/messaging** | FCM for push notifications |
| **notifee** | Local notifications |

### 7.8 Authentication & Security

| Technology | Purpose |
|------------|---------|
| **react-native-keychain** | Secure credential storage |
| **react-native-biometrics** | Biometric authentication |
| **react-native-ssl-pinning** | Certificate pinning |

### 7.9 Internationalization

| Technology | Purpose |
|------------|---------|
| **react-i18next** | i18n framework |
| **i18next** | Core translation library |

### 7.10 Development & Testing

| Technology | Purpose |
|------------|---------|
| **Jest** | Unit testing |
| **React Native Testing Library** | Component testing |
| **Detox** | E2E testing |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |

### 7.11 Recommended Package.json Dependencies

```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.x",
    "typescript": "^5.0.0",

    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",

    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "@react-navigation/bottom-tabs": "^6.5.0",

    "react-native-paper": "^5.12.0",
    "react-native-reanimated": "^3.6.0",
    "react-native-gesture-handler": "^2.14.0",
    "react-native-svg": "^14.1.0",
    "react-native-fast-image": "^8.6.0",

    "react-hook-form": "^7.49.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",

    "react-native-maps": "^1.8.0",
    "@rnmapbox/maps": "^10.1.0",
    "react-native-geolocation-service": "^5.3.0",

    "@react-native-firebase/app": "^18.7.0",
    "@react-native-firebase/messaging": "^18.7.0",
    "@notifee/react-native": "^7.8.0",

    "react-native-keychain": "^8.1.0",
    "react-native-biometrics": "^3.0.0",

    "react-i18next": "^14.0.0",
    "i18next": "^23.7.0",

    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-mmkv": "^2.11.0",

    "axios": "^1.6.0",
    "date-fns": "^3.0.0"
  }
}
```

---

## 8. App Architecture

### 8.1 Project Structure

```
/src
├── /api                    # API layer
│   ├── /endpoints          # API endpoint definitions
│   │   ├── orders.ts
│   │   ├── auth.ts
│   │   ├── weather.ts
│   │   └── notifications.ts
│   ├── client.ts           # Axios/fetch client setup
│   └── types.ts            # API response types
│
├── /components             # Reusable components
│   ├── /common             # Generic components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── LoadingScreen.tsx
│   ├── /orders             # Order-specific components
│   │   ├── OrderCard.tsx
│   │   ├── OrderStatusBadge.tsx
│   │   └── OrderList.tsx
│   ├── /maps               # Map components
│   │   ├── DeliveryMap.tsx
│   │   ├── TruckMarker.tsx
│   │   └── RouteOverlay.tsx
│   └── /weather            # Weather components
│       ├── WeatherWidget.tsx
│       └── WeatherDashboard.tsx
│
├── /screens                # Screen components
│   ├── /auth
│   │   ├── LoginScreen.tsx
│   │   └── PinSetupScreen.tsx
│   ├── /home
│   │   └── HomeScreen.tsx
│   ├── /orders
│   │   ├── OrderListScreen.tsx
│   │   └── OrderDetailScreen.tsx
│   ├── /tracking
│   │   └── MapTrackingScreen.tsx
│   ├── /notifications
│   │   └── NotificationScreen.tsx
│   └── /settings
│       ├── SettingsScreen.tsx
│       └── ProfileScreen.tsx
│
├── /navigation             # Navigation configuration
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   ├── MainNavigator.tsx
│   └── types.ts            # Navigation types
│
├── /hooks                  # Custom hooks
│   ├── useAuth.ts
│   ├── useOrders.ts
│   ├── useLocation.ts
│   ├── useNotifications.ts
│   └── useBiometrics.ts
│
├── /contexts               # React contexts
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── LanguageContext.tsx
│
├── /services               # Business logic services
│   ├── authService.ts
│   ├── notificationService.ts
│   ├── locationService.ts
│   └── storageService.ts
│
├── /store                  # State management
│   ├── useAuthStore.ts
│   └── useAppStore.ts
│
├── /utils                  # Utility functions
│   ├── formatters.ts       # Date, currency, etc.
│   ├── validators.ts       # Input validation
│   ├── constants.ts        # App constants
│   └── helpers.ts          # General helpers
│
├── /locales                # Translation files
│   ├── en.json
│   ├── es.json
│   └── fr-CA.json
│
├── /types                  # TypeScript definitions
│   ├── order.ts
│   ├── user.ts
│   ├── notification.ts
│   └── index.ts
│
├── /assets                 # Static assets
│   ├── /images
│   ├── /icons
│   └── /fonts
│
├── /theme                  # Theme configuration
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── index.ts
│
└── App.tsx                 # App entry point
```

### 8.2 Architecture Pattern

**Clean Architecture with Feature-Based Organization**

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (Screens, Components, Navigation)                       │
├─────────────────────────────────────────────────────────┤
│                    Application Layer                     │
│  (Hooks, Contexts, State Management)                     │
├─────────────────────────────────────────────────────────┤
│                      Domain Layer                        │
│  (Services, Business Logic, Types)                       │
├─────────────────────────────────────────────────────────┤
│                      Data Layer                          │
│  (API Client, Endpoints, Storage)                        │
└─────────────────────────────────────────────────────────┘
```

### 8.3 Data Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Screen  │───►│   Hook   │───►│  Query   │───►│   API    │
│          │◄───│          │◄───│  Client  │◄───│  Server  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │
                     ▼
              ┌──────────┐
              │  Store   │
              │ (Zustand)│
              └──────────┘
```

### 8.4 Component Patterns

#### Functional Component Template

```typescript
import React, { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Props {
  // Props definition
}

export const ComponentName: FC<Props> = ({ ...props }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Component content */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Styles
  },
});
```

#### Custom Hook Template

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { ordersApi } from '@/api/endpoints/orders';

export const useOrders = () => {
  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.getOrders,
  });

  return {
    orders: ordersQuery.data,
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
    refetch: ordersQuery.refetch,
  };
};
```

---

## 9. API Integration

### 9.1 API Documentation

> **Note**: Complete Swagger API documentation will be provided separately by the backend team.

**API Base URL**: `[To be provided]`

**Documentation Format**: OpenAPI/Swagger 3.0

### 9.2 Expected API Patterns

#### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | User logout |
| GET | `/auth/me` | Get current user |

#### Order Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | List orders (paginated) |
| GET | `/orders/:id` | Get order details |
| GET | `/orders/:id/tracking` | Get tracking info |

#### Weather Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/weather?lat=X&lon=Y` | Get weather by coordinates |

#### Notification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications |
| PUT | `/notifications/:id/read` | Mark as read |
| POST | `/notifications/register-device` | Register for push |

### 9.3 Request/Response Patterns

#### Standard Response Format

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### Error Response Format

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
```

### 9.4 API Client Configuration

```typescript
// src/api/client.ts
import axios from 'axios';
import { getToken, refreshToken } from '@/services/authService';

const apiClient = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      const newToken = await refreshToken();
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 9.5 Error Handling Strategy

| HTTP Code | Handling |
|-----------|----------|
| 200-299 | Success, return data |
| 400 | Validation error, show field errors |
| 401 | Unauthorized, trigger re-auth |
| 403 | Forbidden, show access denied |
| 404 | Not found, show friendly message |
| 500+ | Server error, show retry option |

---

## 10. Security Architecture

### 10.1 Authentication Flow

```
┌─────────────┐                                    ┌─────────────┐
│   Mobile    │                                    │   Backend   │
│    App      │                                    │    API      │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │ 1. Login (email/password)                        │
       │────────────────────────────────────────────────►│
       │                                                  │
       │ 2. Return access_token + refresh_token           │
       │◄────────────────────────────────────────────────│
       │                                                  │
       │ 3. Store tokens securely (Keychain)              │
       │                                                  │
       │ 4. API requests with Bearer token                │
       │────────────────────────────────────────────────►│
       │                                                  │
       │ 5. Token expired (401)                           │
       │◄────────────────────────────────────────────────│
       │                                                  │
       │ 6. Refresh token request                         │
       │────────────────────────────────────────────────►│
       │                                                  │
       │ 7. New access_token                              │
       │◄────────────────────────────────────────────────│
```

### 10.2 Biometric Authentication

**Supported Methods**:
- Face ID (iOS)
- Touch ID (iOS)
- Fingerprint (Android)
- Face Recognition (Android)

**Implementation Flow**:

```
App Launch
    │
    ▼
Check Biometric Availability
    │
    ├── Available ──► Prompt Biometric ──► Success ──► App Access
    │                        │
    │                        └── Fail (3x) ──► Require PIN
    │
    └── Not Available ──► Require PIN
```

### 10.3 PIN Code Security

| Requirement | Specification |
|-------------|---------------|
| **Length** | 4-6 digits |
| **Attempts** | 5 max before lockout |
| **Lockout** | 30 minutes after max attempts |
| **Storage** | Hashed, stored in Keychain |
| **Reset** | Requires full re-authentication |

### 10.4 Secure Storage

| Data Type | Storage Method |
|-----------|----------------|
| Access Token | react-native-keychain (encrypted) |
| Refresh Token | react-native-keychain (encrypted) |
| User Preferences | AsyncStorage (non-sensitive) |
| PIN Hash | react-native-keychain (encrypted) |
| Biometric Key | Secure Enclave (iOS) / Keystore (Android) |

### 10.5 Network Security

| Measure | Implementation |
|---------|----------------|
| **HTTPS Only** | All API calls over TLS 1.3 |
| **Certificate Pinning** | Pin backend SSL certificate |
| **Request Signing** | HMAC signature on sensitive requests |
| **Token Rotation** | Short-lived access tokens (15 min) |

### 10.6 Data Protection

| Protection | Implementation |
|------------|----------------|
| **At Rest** | Encrypted storage for sensitive data |
| **In Transit** | TLS encryption for all network calls |
| **Memory** | Clear sensitive data from memory when not needed |
| **Screenshots** | Disable screenshots on sensitive screens (optional) |

---

## 11. Testing Strategy

### 11.1 Testing Pyramid

```
          ┌───────┐
          │  E2E  │          Few, critical paths
          │ Tests │
         ─┴───────┴─
        ┌───────────┐
        │Integration│        API, Navigation
        │   Tests   │
       ─┴───────────┴─
      ┌───────────────┐
      │   Unit Tests  │      Components, Hooks, Utils
      └───────────────┘
```

### 11.2 Unit Testing

**Framework**: Jest + React Native Testing Library

**Coverage Targets**:
| Area | Target |
|------|--------|
| Utilities | 90% |
| Hooks | 80% |
| Components | 70% |
| Overall | 75% |

**Example Unit Test**:

```typescript
// __tests__/components/OrderCard.test.tsx
import { render, screen } from '@testing-library/react-native';
import { OrderCard } from '@/components/orders/OrderCard';

describe('OrderCard', () => {
  const mockOrder = {
    id: '123',
    code: 'ORD-001',
    customerName: 'ABC Construction',
    status: 'IN_PROCESS',
  };

  it('renders order information correctly', () => {
    render(<OrderCard order={mockOrder} />);

    expect(screen.getByText('ORD-001')).toBeTruthy();
    expect(screen.getByText('ABC Construction')).toBeTruthy();
  });

  it('displays correct status badge', () => {
    render(<OrderCard order={mockOrder} />);

    expect(screen.getByText('IN PROCESS')).toBeTruthy();
  });
});
```

### 11.3 Integration Testing

**Areas to Test**:
- API client with mock server
- Navigation flows
- Form submissions
- Authentication flow

### 11.4 E2E Testing

**Framework**: Detox

**Critical Paths to Test**:
1. Login → View Orders → Order Details
2. Login → Map Tracking → Truck Location
3. Push Notification → Deep Link → Order Details
4. Settings → Language Change → UI Update

**Example E2E Test**:

```typescript
// e2e/orderFlow.test.ts
describe('Order Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should login and view order list', async () => {
    await element(by.id('login-email')).typeText('user@test.com');
    await element(by.id('login-password')).typeText('password123');
    await element(by.id('login-button')).tap();

    await expect(element(by.id('order-list'))).toBeVisible();
  });

  it('should navigate to order details', async () => {
    await element(by.id('order-card-0')).tap();
    await expect(element(by.id('order-details-screen'))).toBeVisible();
  });
});
```

### 11.5 Performance Testing

| Metric | Target | Tool |
|--------|--------|------|
| App Launch | < 2s | Flipper |
| Screen Transition | < 300ms | React DevTools |
| API Response | < 1s | Network monitoring |
| Memory Usage | < 150MB | Xcode/Android Studio |
| Frame Rate | 60fps | Flipper |

---

## 12. Appendix

### 12.1 Business Domain Glossary

| Term | Definition |
|------|------------|
| **Ready-Mix Concrete** | Concrete manufactured in a batch plant and delivered to site in plastic state |
| **Dispatch** | Process of assigning trucks to orders and routing deliveries |
| **Plant** | Manufacturing facility that produces ready-mix concrete |
| **Order** | Customer request for concrete delivery with specifications |
| **Ticket** | Delivery document accompanying concrete shipment |
| **Slump** | Measure of concrete workability/consistency |
| **Mix Design** | Specific proportions of materials in concrete |
| **Pour** | Act of placing concrete at delivery site |
| **Pre-Pour** | Order confirmed but not yet in delivery |
| **ETA** | Estimated Time of Arrival |
| **Will Call** | Order waiting for customer confirmation to proceed |

### 12.2 Order Status Reference

| Status Code | Display Name | Description |
|-------------|--------------|-------------|
| 0 | NORMAL | Standard active order |
| 1 | WILL_CALL | Awaiting customer confirmation |
| 2 | WEATHER_PERMITTING | Dependent on weather conditions |
| 3 | HOLD | Temporarily suspended |
| 4 | COMPLETED | Successfully delivered |
| 5 | WAIT_LIST | Queued pending availability |

### 12.3 Website Feature Reference

The following features exist on the website and provide **business context** for the mobile app:

| Website Feature | Mobile App Equivalent |
|-----------------|----------------------|
| Order Confirmation | View order status |
| Orders Management | Order list & details |
| Dispatch Monitoring | Map & tracking |
| Customer Management | N/A (not in mobile) |
| User Management | N/A (not in mobile) |
| Role Management | N/A (not in mobile) |
| Plant Configuration | N/A (not in mobile) |
| Market Summary | N/A (not in mobile) |
| Notifications | Push notifications |
| Weather Integration | Weather dashboard |

### 12.4 External Resources

| Resource | Link |
|----------|------|
| **Figma Designs** | https://www.figma.com/design/AiyzqEWrLPhMeQyP0w6Q41/Untitled?node-id=0-1&p=f |
| **React Native Docs** | https://reactnative.dev/docs/getting-started |
| **React Navigation** | https://reactnavigation.org/docs/getting-started |
| **TanStack Query** | https://tanstack.com/query/latest/docs/react/overview |
| **Mapbox React Native** | https://github.com/rnmapbox/maps |

### 12.5 Development Environment Setup

**Required Software**:
- Node.js 18+
- Xcode 15+ (macOS, for iOS)
- Android Studio (for Android)
- Watchman
- CocoaPods (iOS)

**Environment Variables**:
```env
API_BASE_URL=https://api.example.com
MAPBOX_ACCESS_TOKEN=pk.xxxx
FIREBASE_PROJECT_ID=your-project-id
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | January 2026 | Product Team | Initial document |

---

*This document serves as the single source of truth for the TruckAst Dolese ReadyMix mobile application development.*
