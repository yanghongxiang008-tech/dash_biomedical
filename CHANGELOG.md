# Changelog

All notable changes to this project will be documented in this file.

## [2026-02-04 14:40]

### Added
- **User Profile Menu in Research Page**: Integrated user avatar, settings, change password, and logout functionality to the Research page for consistency across the app.
- **Global Summary Tab**: Added a new "Summary" button in the navigation bar that embeds an external dashboard via iframe, featuring a custom vibrant AI-style gradient.
- **Cortex Tab Toggle**: Added a new display setting to toggle visibility of the Cortex tab in the navigation bar.

### Changed
- **Navigation Reordering**: Optimized the main navigation tabs. "Daily" and "Weekly" are now permanently at the beginning of the list to match preferred user workflow.
- **Default Tab Visibility**: Set `Research` and `Cortex` tabs to be hidden by default for new sessions to provide a cleaner initial user experience.
- **Dropdown Styling**: Improved the visual feedback of dropdown menu items by enhancing the highlight/hover background color.
- **Settings Redirection**: Improved the UX in the Settings page by automatically redirecting users to the home page after a successful save.

### Security & Permissions
- **Admin-only Actions**: 
    - The "User Management" option in the personal menu is now strictly hidden for non-admin users.
    - The "Edit" button on the Stock Analysis (Daily) page is now conditionally rendered only for admin users to prevent accidental data modification.
