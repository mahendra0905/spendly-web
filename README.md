# Spendly — Know Where It Goes 👛✨

A modern, high-performance web-based Personal Finance Terminal & Expense Tracker. Built with pure client-side technologies using browser-native **IndexedDB**, zero server dependencies, and responsive light-theme **Tailwind CSS**.

![Spendly Logo](logo_brand.png)

---

## 🌟 Key Features

- **📊 Dashboard Overview**:
  - Live Monthly Budget progress bar with visual remaining budget warnings (`text-secondary` / `text-error`).
  - Today's Expense breakdown & Recent Activity feed.
  - Top 5 Biggest Expenses highlight cards.
  - Mini Friend Ledger readout embedded inside Monthly Budget card.

- **📜 Transaction History**:
  - Combined timeline for regular expenses and **Friend Ledger Give/Take** transactions.
  - **Month Period Presets**: View *Last 2 Months (Default)*, *Single Month*, *Last 3 Months*, *Last 6 Months*, *This Year*, or *Custom Month Range*.
  - Category filters (`All Transactions`, `Friend Ledger`, `Food`, `Shopping`, `Bills`, etc.) and search.

- **👥 Friends & Debts (Hisab-Kitab / Ledger)**:
  - Track money given (`💸 I Gave`) and money received (`💰 I Received`).
  - **Settlement Return Date**: Set return dates for transactions with automatic reminder creation.
  - Per-friend summary ledger & balance calculation.

- **📅 Upcoming Bills & Reminders**:
  - Categorized reminders with Priority Badges (🔴 High, 🟡 Medium, 🟢 Low).
  - Bill tracking with due date status badges.

- **🔔 Interactive Notification Center**:
  - Clickable top-bar notification bell with unread badge counter (`#notifBadge`).
  - **1-Day Prior Settlement Alerts**: Automatic notification 1 day before friend dues.
  - High-priority reminder alerts & over-budget warnings.

- **💾 Zero Server Dependency & Data Backup**:
  - Powered by browser-native IndexedDB engine (`SpendlyDB`).
  - Export full database as `.json` backup file or `.csv` spreadsheet export.
  - Full local privacy & offline support.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+)
- **Styling**: Tailwind CSS, Material Symbols Outlined icons, Inter Google Font
- **Database**: Browser-native IndexedDB (Version 1)
- **Version Control**: Git & GitHub

---

## 🚀 Quick Start

1. Clone or download this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/spendly-web.git
   ```
2. Open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Safari, Firefox).
3. No build tools or node servers required!

---

## 🔒 Privacy

All financial data, friend transactions, and reminders are stored exclusively inside your browser's local IndexedDB. No data is sent to external servers.

---
*Created with ❤️ for Spendly*
