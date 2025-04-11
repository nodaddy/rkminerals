# Icon System Documentation

This application uses React Icons library as the primary source for icons. The icons are centralized in the `AppIcons.js` file to make it easier to update or change icon libraries in the future.

## Using Icons in Components

To use icons in your components, follow these steps:

1. Import the AppIcons component:

```jsx
import AppIcons from "../path/to/components/AppIcons";
```

2. Use the icons in your JSX:

```jsx
<AppIcons.Dashboard size={20} />
<AppIcons.Search className="search-icon" />
<AppIcons.Trash onClick={handleDelete} />
```

## Available Icons

All available icons are exported from the `AppIcons.js` file. The icons are organized by category:

### Navigation and Sidebar

- `Dashboard`: Grid layout icon
- `Home`: Home icon
- `Tool`: Tool/wrench icon
- `Clock`: Clock/time icon
- `Activity`: Activity/chart icon
- `Settings`: Settings/gear icon
- `Logout`: Logout/sign out icon

### Form and Input

- `Mail`: Email icon
- `Lock`: Password/lock icon

### Actions

- `Trash`: Delete/trash can icon
- `Add`: Plus/add icon
- `Edit`: Edit/pencil icon
- `Search`: Search/magnifying glass icon
- `Download`: Download icon
- `Upload`: Upload icon

### Data and Entities

- `Calendar`: Calendar/date icon
- `User`: User/profile icon
- `Truck`: Truck/shipping icon
- `Box`: Box/package icon
- `Money`: Dollar sign/money icon
- `Database`: Database icon
- `Filter`: Filter icon
- `Refresh`: Refresh/reload icon

### Feedback

- `Error`: Alert/error icon
- `Success`: Check/success icon
- `Close`: X/close icon

## Adding New Icons

To add more icons to the application:

1. Open `src/components/AppIcons.js`
2. Import any additional icons from react-icons
3. Add them to the AppIcons object with a descriptive name

Example:

```jsx
import { FiStar } from "react-icons/fi";

// Add to AppIcons object
const AppIcons = {
  // ... existing icons
  Star: FiStar,
};
```

## Changing Icon Library

If you want to switch to a different icon library:

1. Install the desired icon library:

```
npm install @another-icon-library/icons
```

2. Update the imports in `AppIcons.js`:

```jsx
import { NewIcon1, NewIcon2 } from "@another-icon-library/icons";
```

3. Update the mappings in the AppIcons object.

All components will continue to work without changes since they reference the icon names, not the actual implementations.
