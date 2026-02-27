# UniTrack – University Sessional Management App

A full-stack mobile-first university management application built with Expo React Native, designed for Mehran University.

## Architecture

- **Frontend**: Expo Router (file-based routing), React Native with NativeTabs (liquid glass on iOS 26+)
- **Backend**: Express.js server (port 5000) serving APIs and landing page
- **Data Storage**: AsyncStorage for client-side persistence (seeded with demo data)
- **Fonts**: Poppins (via @expo-google-fonts/poppins)
- **State**: React Context (AppContext) for all app state

## User Roles

- **Student** (`/app/(student)/`) – Dashboard, Subjects (enroll/submit), MCQ Tests, Notifications
- **Teacher** (`/app/(teacher)/`) – Dashboard, Subject Management, Assignment Creation/Grading, MCQ Test Creation, Presentation Scheduling
- **CR** (`/app/(cr)/`) – Home, Announcements, Class Schedule
- **Admin** (`/app/(admin)/`) – Dashboard, User Management, Departments/Analytics

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Student | ali.hassan@muet.edu.pk | student123 |
| Teacher | ahmed.khan@muet.edu.pk | teacher123 |
| CR | sara.malik@muet.edu.pk | cr123 |
| Admin | admin@muet.edu.pk | admin123 |

## Color Scheme

- Primary: `#0F1E3C` (deep navy)
- Accent: `#C9A227` (gold)
- Role colors: Student=Blue, Teacher=Purple, CR=Green, Admin=Red

## File Structure

```
app/
  _layout.tsx          # Root layout with fonts, providers
  index.tsx            # Auth redirect
  (auth)/              # Login, Register screens
  (student)/           # Student panel tabs
  (teacher)/           # Teacher panel tabs
  (cr)/                # CR panel tabs
  (admin)/             # Admin panel tabs
context/
  AppContext.tsx        # Central data store with AsyncStorage
components/
  ui/                  # Card, Badge, Button components
  ErrorBoundary.tsx
constants/
  colors.ts            # Theme colors
```

## Features Implemented

- JWT-like authentication with role-based routing
- Seeded demo data for immediate testing
- Student: Subject enrollment, assignment submission, MCQ test taking with timer, notifications
- Teacher: Subject creation, assignment management, submission grading, MCQ test builder, presentation scheduling, results view
- CR: Announcements with class notifications, schedule view
- Admin: User management, approval system, department analytics
- Marks breakdown per subject (assignments + tests + presentations)
- In-app notification system with unread badge count
