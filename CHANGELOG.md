# Changelog / 更新日志

All notable changes to this project will be documented in this file.
本项目的所有重大变更都将记录在此文件中。

## [2026-02-04 14:40]

### Added / 新增功能
- **User Profile Menu in Research Page / Research 页面个人菜单**: 
  - Integrated user avatar, settings, change password, and logout functionality for consistency.
  - 在 Research 页面整合了用户头像、设置、修改密码和退出登录功能，确保全站体验一致。
- **Global Summary Tab / 全局汇总页**: 
  - Added a new "Summary" button in the navigation bar that embeds an external dashboard via iframe, featuring a custom vibrant AI-style gradient.
  - 在导航栏新增了“Summary”按钮，通过 iframe 嵌入外部看板，并配有专属的 AIGC 幻彩风格渐变样式。
- **Cortex Tab Toggle / Cortex 选项卡开关**: 
  - Added a new display setting to toggle visibility of the Cortex tab.
  - 在设置中新增了 Cortex 选项卡的显示/隐藏切换开关。

### Changed / 改进与优化
- **Navigation Reordering / 导航栏顺序优化**: 
  - Optimized the main navigation tabs. "Daily" and "Weekly" are now permanently at the beginning of the list to match preferred user workflow.
  - 优化了导航栏顺序，“Daily”和“Weekly”现在固定排在首位，更符合用户工作流。
- **Default Tab Visibility / 默认显示逻辑**: 
  - Set `Research` and `Cortex` tabs to be hidden by default for a cleaner initial experience.
  - 将 `Research` 和 `Cortex` 选项卡设为默认隐藏，为用户提供更清爽的初始界面。
- **Dropdown Styling / 下拉菜单样式**: 
  - Improved the visual feedback of dropdown menu items by enhancing the highlight/hover background color.
  - 增强了下拉菜单项在悬停/选中态下的背景颜色反馈。
- **Settings Redirection / 设置页跳转优化**: 
  - Automatically redirecting users to the home page after a successful save in the Settings page.
  - 设置页面保存成功后会自动跳转回主页，提升交互连贯性。

### Security & Permissions / 安全与权限控制
- **Admin-only Actions / 仅限管理员操作**: 
    - The "User Management" option in the personal menu is now strictly hidden for non-admin users.
    - 个人菜单中的“用户管理”选项现在对非管理员用户完全隐藏。
    - The "Edit" button on the Stock Analysis (Daily) page is now conditionally rendered only for admin users.
    - 股票分析（Daily）页面的“编辑”按钮现在仅对管理员显示，防止误操作。
