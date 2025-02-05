# Application Architecture Plan: Desktop Due Diligence PowerPoint Report Generator

This document outlines the architecture plan for refactoring the Desktop Due Diligence PowerPoint Report Generator application to enhance efficiency, maintainability, and reduce code duplication, while preserving existing functionality and visual appearance.

## 1. Architecture Overview

The application will adopt a component-based architecture using React. The main structure will consist of:

*   **App Container (`PptxApp`)**: The root component that manages global application state, such as selected feature and sidebar width. It will handle layout and routing between different sections of the application.
*   **Navigation Sidebar (`Sidebar`)**: A dedicated component for the left-side navigation, including tab selection and sidebar width controls. This will encapsulate all sidebar-related logic and UI elements.
*   **Main Content Area (`MainContent`)**:  This component will manage the display of content based on the active tab. It will dynamically render different views (e.g., `OverviewTab`, `PlanningTab`, etc.).
*   **Tab Components (`OverviewTab`, `PlanningTab`, `DevelopmentTab`, etc.)**: Each tab will be a separate component responsible for rendering the specific content associated with that tab. These components will be responsible for fetching and displaying data, and managing their own specific UI elements.
*   **Map View (`MapView`)**: A reusable component for displaying the map. It will handle map interactions and screenshot capturing.
*   **Slide Preview (`SlidePreview`)**:  Component to display a preview of generated slides.
*   **Report Generator Section (`ReportGenerator`)**: Component to manage the report generation process, including UI for triggering report generation and handling settings.
*   **Utility Components/Hooks**: Reusable components or hooks for common functionalities like unit conversions, data fetching, and styling.

## 2. Logic Flow

1.  **Application Initialization**:
    *   The `PptxApp` component initializes the application state, including `selectedFeature`, `activeTab`, and `sidebarWidth`.
    *   Sidebar width is set from default or persisted state (if implemented).
2.  **User Interaction - Tab Selection**:
    *   User clicks on a tab in the `Sidebar`.
    *   `Sidebar` component updates the `activeTab` state in `PptxApp`.
    *   `PptxApp` re-renders, and `MainContent` component receives the new `activeTab` as a prop.
3.  **Content Rendering**:
    *   `MainContent` component uses conditional rendering based on `activeTab` to display the corresponding Tab Component (e.g., `OverviewTab` for 'overview' tab).
    *   Each Tab Component is responsible for:
        *   Fetching necessary data based on `selectedFeature` (if required).
        *   Rendering specific UI elements for that tab (charts, maps, data displays).
        *   Passing down `selectedFeature` and other relevant props to child components like `MapView` and data display components.
4.  **User Interaction - Map Interaction & Feature Selection**:
    *   `MapView` component handles user interactions with the map.
    *   When a feature is selected on the map, `MapView` calls the `onFeatureSelect` callback (passed from `PptxApp` or a Tab Component).
    *   `PptxApp` updates the `selectedFeature` state.
    *   Components that depend on `selectedFeature` (like `Sidebar` title, Tab Components, `MapView`) re-render to reflect the selected feature's data.
5.  **User Interaction - Sidebar Width Adjustment**:
    *   User interacts with width controls in the `Sidebar`.
    *   `Sidebar` component updates the `sidebarWidth` state in `PptxApp`.
    *   `PptxApp` re-renders, and components that use `sidebarWidth` (like Tab Components and `MapView` layout) adjust their size.
6.  **Report Generation**:
    *   User interacts with the `ReportGenerator` component to initiate report generation.
    *   `ReportGenerator` component orchestrates the process of:
        *   Capturing map screenshots for each relevant slide.
        *   Fetching necessary data for each slide.
        *   Using slide generation functions (e.g., `addCoverSlide`, `addPlanningSlide`) to create PowerPoint slides using PptxGenJS.
        *   Downloading the generated PowerPoint file.

## 3. Data Sources

*   **Map Data**: ArcGIS Online Feature Services and Map Services (URLs are likely hardcoded or configurable within the application, as seen in `planningSlide2.js`:startLine:24-endLine:24).
    *   Example: Heritage data service URL in `planningSlide2.js`:startLine:24-endLine:24.
*   **Property Data**:  Likely fetched based on selected feature, potentially from ArcGIS Online or a similar geospatial data source. The `selectedFeature` object structure suggests it contains property attributes.
*   **Screenshot Service**: Browser-based screenshot capture using libraries like `html2canvas` or similar, as implied by functions like `captureMapScreenshot`, `capturePrimarySiteAttributesMap` etc. in `ReportGenerator.jsx`:startLine:9-endLine:29 and `pptxgenerator/src/components/pptxApp/ReportGenerator.jsx`:startLine:9-endLine:29.
*   **Scoring Logic**: Defined within the application (`scoringLogic.js` and `pptxgenerator/src/components/pptxApp/slides/scoringLogic.js`).
*   **Images**: Local image files for logos and potentially other slide elements (e.g., NSW logo path in `planningSlide.js`:startLine:370-endLine:370 and `src/components/pptxApp/slides/planningSlide.js`:startLine:370-endLine:370).

## 4. Component Breakdown

### 4.1. `PptxApp` Component (`pptxgenerator/src/components/pptxApp/index.jsx`:startLine:1-endLine:268 and `src/components/pptxApp/index.jsx`:startLine:1-endLine:266)

*   **Responsibilities**:
    *   Root component, manages overall application layout.
    *   Manages global state: `selectedFeature`, `activeTab`, `sidebarWidth`.
    *   Handles sidebar width changes (`handleWidthChange`, `handleInputChange`, `adjustWidth`).
    *   Handles feature selection (`handleFeatureSelect`).
    *   Renders `Sidebar` and `MainContent`.
*   **State**:
    *   `selectedFeature`: Currently selected geographic feature (from `pptxgenerator/src/components/pptxApp/index.jsx`:startLine:18-endLine:18 and `src/components/pptxApp/index.jsx`:startLine:18-endLine:18).
    *   `activeTab`: Currently active tab ID (from `pptxgenerator/src/components/pptxApp/index.jsx`:startLine:19-endLine:19 and `src/components/pptxApp/index.jsx`:startLine:19-endLine:19).
    *   `sidebarWidth`: Width of the sidebar in pixels (from `pptxgenerator/src/components/pptxApp/index.jsx`:startLine:20-endLine:20 and `src/components/pptxApp/index.jsx`:startLine:20-endLine:20).
*   **Props**: None.

### 4.2. `Sidebar` Component

*   **Responsibilities**:
    *   Renders the left-side navigation sidebar.
    *   Displays the property address or "Select a Property" title (from `pptxgenerator/src/components/pptxApp/index.jsx`:startLine:73-endLine:77 and `src/components/pptxApp/index.jsx`:startLine:73-endLine:77).
    *   Renders tab buttons and handles tab selection.
    *   Includes sidebar width controls (input and buttons).
*   **Props**:
    *   `selectedFeature`: To display property address in the title.
    *   `activeTab`: To highlight the active tab.
    *   `sidebarWidth`: To control the width input value.
    *   `onTabChange`: Callback function to handle tab changes (updates `activeTab` in `PptxApp`).
    *   `onWidthChange`: Callback function to handle sidebar width changes (updates `sidebarWidth` in `PptxApp`).
*   **State**: None (likely controlled by props from `PptxApp`).

### 4.3. `MainContent` Component

*   **Responsibilities**:
    *   Renders the main content area to the right of the sidebar.
    *   Dynamically renders Tab Components based on the `activeTab` prop.
    *   Manages layout for different tabs (some with sidebar, some full-width).
*   **Props**:
    *   `activeTab`: To determine which tab content to render.
    *   `selectedFeature`: To pass down to Tab Components.
    *   `sidebarWidth`: To control the width of sidebar-based tab contents.
    *   `onFeatureSelect`: Callback to handle feature selection from `MapView` (passed down to Tab Components that use `MapView`).
*   **State**: None.

### 4.4. Tab Components (`OverviewTab`, `PlanningTab`, `DevelopmentTab`, etc.)

*   **Responsibilities (for each tab component)**:
    *   Fetch and display data relevant to the specific tab (e.g., `PropertyOverview`, `Planning`, `Development`, `AmenityChart`, `ImageryMap`, `GrowthProjections`, `Sales`, `Topography`, `Climate`, `AreaOverview`, `LayerDrawing`, `ReportGenerator` from `pptxgenerator/src/components/pptxApp/index.jsx`:startLine:2-endLine:14 and `src/components/pptxApp/index.jsx`:startLine:2-endLine:14).
    *   Render specific UI elements for the tab (maps, charts, data tables, text descriptions).
    *   Manage tab-specific state (if any).
*   **Props**:
    *   `selectedFeature`: To fetch and display data related to the selected feature.
    *   `sidebarWidth`: To control layout if the tab has a sidebar.
    *   `onFeatureSelect`: To pass down to `MapView` if used within the tab.
*   **State**: Tab-specific state (e.g., chart data, form input values).

### 4.5. `MapView` Component (`pptxgenerator/src/components/pptxApp/MapView.jsx` and `src/components/pptxApp/MapView.jsx`)

*   **Responsibilities**:
    *   Displays an interactive map.
    *   Handles map initialization and layer loading.
    *   Manages feature selection on the map.
    *   Provides functionality for capturing map screenshots (using screenshot service).
*   **Props**:
    *   `onFeatureSelect`: Callback function to notify parent component when a feature is selected on the map.
*   **State**: Map-related state (e.g., map center, zoom level, selected map layers).

### 4.6. `ReportGenerator` Component (`ReportGenerator.jsx` and `pptxgenerator/src/components/pptxApp/ReportGenerator.jsx`)

*   **Responsibilities**:
    *   Provides UI for initiating report generation.
    *   Orchestrates the report generation process (data fetching, screenshot capturing, slide creation).
    *   Handles download of the generated PowerPoint report.
*   **Props**:
    *   `selectedFeature`: To generate report based on the selected feature.
    *   `developableArea`: To include developable area data in the report.
*   **State**: Report generation related state (e.g., generation status, settings).

### 4.7. Utility Components/Hooks

*   **`UnitConverter` (Utility Function/Hook)**: For converting units (e.g., cm values as used in `planningSlide.js`:startLine:1-endLine:1 and `src/components/pptxApp/slides/planningSlide.js`:startLine:1-endLine:1 and `planningSlide2.js`:startLine:1-endLine:1 and `src/components/pptxApp/slides/planningSlide2.js`:startLine:1-endLine:1 and `accessSlide.js`:startLine:1-endLine:1 and `src/components/pptxApp/slides/accessSlide.js`:startLine:1-endLine:1).
*   **`useProxyRequest` (Custom Hook)**: For making proxy requests (encapsulates `proxyRequest` function from `planningSlide2.js`:startLine:3-endLine:3 and `src/components/pptxApp/slides/planningSlide2.js`:startLine:3-endLine:3 and `accessSlide.js`:startLine:3-endLine:3 and `src/components/pptxApp/slides/accessSlide.js`:startLine:3-endLine:3).
*   **`ScoringCriteria` (Data Module)**:  Exports scoring logic and styles (from `scoringLogic.js` and `pptxgenerator/src/components/pptxApp/slides/scoringLogic.js` and `src/components/pptxApp/slides/scoringLogic.js`).
*   **`SlideStyles` (Data Module)**: Defines styles for PowerPoint slide elements (from `planningSlide.js`:startLine:67-endLine:300 and `src/components/pptxApp/slides/planningSlide.js`:startLine:67-endLine:300 and `planningSlide2.js`:startLine:76-endLine:185 and `src/components/pptxApp/slides/planningSlide2.js`:startLine:76-endLine:185 and `accessSlide.js`:startLine:6-endLine:75 and `src/components/pptxApp/slides/accessSlide.js`:startLine:6-endLine:75).

## 5. State Management

*   **Component-Level State**: `useState` hook will be used for managing state within individual components (e.g., `activeTab` and `sidebarWidth` in `PptxApp`, local UI state in Tab Components).
*   **Prop Drilling**: State will be passed down from parent components to child components using props. For this application's scale, prop drilling is likely sufficient and avoids the need for more complex state management solutions like Context API or Redux. If deeply nested prop passing becomes cumbersome, consider using Context API for specific state slices (e.g., `selectedFeature` context).

## 6. Styling

*   **Inline Styles and CSS Classes**: Existing styling approach using a combination of inline styles (e.g., width set dynamically using `sidebarWidth` in `pptxgenerator/src/components/pptxApp/index.jsx`:startLine:134-endLine:134 and `src/components/pptxApp/index.jsx`:startLine:134-endLine:134) and CSS classes (e.g., Tailwind CSS classes like `flex`, `h-screen`, `w-48` in `pptxgenerator/src/components/pptxApp/index.jsx`:startLine:69-endLine:71 and `src/components/pptxApp/index.jsx`:startLine:69-endLine:71) will be retained.
*   **Style Modules**: Styles for PowerPoint slide elements (like in `planningSlide.js`:startLine:67-endLine:300 and `src/components/pptxApp/slides/planningSlide.js`:startLine:67-endLine:300 and `planningSlide2.js`:startLine:76-endLine:185 and `src/components/pptxApp/slides/planningSlide2.js`:startLine:76-endLine:185 and `accessSlide.js`:startLine:6-endLine:75 and `src/components/pptxApp/slides/accessSlide.js`:startLine:6-endLine:75) will be organized in separate JavaScript modules (`SlideStyles`) for better maintainability and reusability across slide generation functions.

## 7. Improvements and Duplication Reduction

*   **Componentization**: Break down the monolithic `PptxApp` and Tab Components into smaller, reusable components. This will improve code organization and reduce redundancy.
*   **Reduce Duplication in Tab Rendering**: The current `index.jsx` (`pptxgenerator/src/components/pptxApp/index.jsx` and `src/components/pptxApp/index.jsx`) repeats similar `div` structures for each tab (e.g., `overview`, `planning`, `development`). This duplication will be eliminated by using a dynamic rendering approach within `MainContent` and Tab Components.
*   **Reusable Map Component**:  `MapView` component will be made generic and reusable across different tabs, accepting props to customize its behavior (layers, interactions).
*   **Centralized Styling**: Slide styles will be centralized in `SlideStyles` modules, making it easier to maintain and update the visual appearance of the PowerPoint report.
*   **Modular Scoring Logic**: Scoring logic will be kept modular in `ScoringCriteria` modules, allowing for easy updates and extensions to scoring rules.
*   **Utility Hooks/Functions**: Common functionalities like unit conversion and proxy requests will be extracted into utility hooks or functions for reusability across the application.

## 8. URL Parameters and Existing Functionality

*   **Retain URL Parameters**: The application should continue to support URL parameters for map layers, screenshots, and any other configurable aspects. These parameters will be handled in the `MapView` and Tab Components as needed.
*   **Preserve Scoring Logic**: All existing scoring logic defined in `scoringLogic.js` and related files will be retained and integrated into the refactored architecture.
*   **Maintain Styles**: The visual appearance of the application and generated PowerPoint reports will be preserved as closely as possible to the current version by reusing existing styles and CSS classes.

This architecture plan provides a roadmap for refactoring the Desktop Due Diligence PowerPoint Report Generator application. By following this plan, the resulting application will be more modular, maintainable, and efficient, while retaining all the existing features and visual design.