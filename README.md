# WhereHajs

> **100% vibe coded** - this application was entirely created using AI, without writing any code manually. It may not always work because I don't fully understand what's happening here, but *it works on my machine*.

A desktop application for analyzing and categorizing bank transactions. Import bank statements, assign categories, and analyze your spending.

## Features

### Data Import
- Import CSV files from your bank
- Automatic detection of file format and encoding
- Flexible column mapping - you decide what is date, description, and amount
- Save mapping configurations as presets for reuse

### Categorization
- Create custom categories with colors
- Automatic category assignment based on keywords in transaction descriptions
- One-click manual category assignment
- Category grouping (e.g., "Food" group containing Walmart, Target, Costco categories)
- Filter view by category or group

### Merging Data from Multiple Files
- Import additional transactions from new files
- Automatic duplicate detection for overlapping periods
- Preview before import with ability to choose what to import

### Spending Analysis
- Summary of all transactions
- Pie chart of spending by category
- Date range filtering
- View in category or group mode

### Save and Continue Work
- Save entire project to JSON file
- Quick access to recently opened project
- Prompt to save when closing app with unsaved changes

### Other
- Full offline operation - no internet required
- Portable version - single exe file without installation

### Localization
- Available in English and Polish
- Language switcher on the landing page

## Installation

```bash
npm install
npm run dev
```

## Building

```bash
npm run build:win
```

Executable files in `dist/` folder:
- `wherehajs-1.0.0-setup.exe` - Installer
- `wherehajs-1.0.0-portable.exe` - Portable version

## License

MIT
