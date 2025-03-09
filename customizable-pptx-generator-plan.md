# Customizable PowerPoint Generator: Architecture and Implementation Plan

## Current System Overview

The current system:

1. Has predefined slide templates (cover, property snapshot, planning, etc.)
2. Captures specific screenshots for each slide
3. Uses hardcoded scoring logic for different attributes
4. Generates a PowerPoint with a fixed structure

## Simplified Requirements

The customizable PowerPoint generator should have:

1. A pre-defined cover slide (fixed layout and design)
2. A small number of pre-defined slide layouts (structure is fixed, content is customizable)
3. Layer configuration tools for users to build screenshots for each slide
4. A scoring logic builder that outputs to a dedicated scoring slide

## Proposed Architecture for Streamlined System

### 1. Core Components

#### A. Slide Layout System

- **Layout Library**: A small collection of pre-defined slide layouts
- **Layout Selection**: Interface for users to select which layouts to include
- **Layout Preview**: Preview of layouts with sample content

#### B. Screenshot Layer Configuration

- **Layer Selection**: Interface to select and configure map/data layers for screenshots
- **Screenshot Capture Service**: Service to capture screenshots with configured layers
- **Screenshot Preview**: Real-time preview of configured screenshots

#### C. Scoring Logic Builder

- **Scoring Rule Editor**: Interface to define scoring criteria and thresholds
- **Scoring Visualization**: Preview of how scoring will appear on the scoring slide
- **Scoring Results**: Calculations and representation of the scoring logic

#### D. Report Assembly

- **Slide Sequencer**: Interface to arrange selected slide layouts
- **Data Mapping**: Connect property data to slide content
- **Export Configuration**: Options for the final PowerPoint output

### 2. Data Model

```javascript
// Pre-defined slide layouts
interface SlideLayout {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  category: string;
  elements: LayoutElement[];
  screenshotPlaceholders: ScreenshotPlaceholder[];
}

// Screenshot placeholder in a layout
interface ScreenshotPlaceholder {
  id: string;
  name: string;
  position: { x: string, y: string, w: string, h: string };
  defaultScreenshotType: string;
}

// Layer configuration for screenshots
interface LayerConfiguration {
  id: string;
  screenshotPlaceholderId: string;
  layerSettings: {
    baseLayer: string,
    showBoundary: boolean,
    additionalLayers: AdditionalLayer[],
    zoom: string | number,
  };
}

// Additional layer for screenshots
interface AdditionalLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  style?: any;
}

// Scoring rule for the scoring slide
interface ScoringRule {
  id: string;
  name: string;
  description: string;
  criteria: ScoringCriterion[];
  visualizationType: string;
}

// User project
interface Project {
  id: string;
  name: string;
  description: string;
  selectedLayouts: string[]; // IDs of selected layouts
  layoutSequence: string[]; // Order of layouts
  screenshotConfigurations: LayerConfiguration[];
  scoringRules: ScoringRule[];
  propertyData: any; // Data for the specific property
}
```

## Implementation Plan

### Phase 1: Slide Layout System

1. **Create Layout Library**

   - Design a small set of fixed slide layouts (5-10 layouts)
   - Include a fixed cover slide design
   - Define screenshot placeholders within each layout

2. **Implement Layout Selection**
   - Create interface for selecting which layouts to include
   - Develop preview functionality for each layout
   - Build slide sequencing interface for ordering selected layouts

### Phase 2: Screenshot Layer Configuration

1. **Develop Layer Selection Interface**

   - Create UI for selecting base map layers
   - Add controls for enabling/disabling additional data layers
   - Implement opacity and styling controls for layers

2. **Enhance Screenshot Capture Service**

   - Refactor existing screenshot capture to support layer configuration
   - Implement caching to improve performance
   - Add support for different map views and zoom levels

3. **Build Screenshot Preview**
   - Create real-time preview of configured layers
   - Implement a preview refresh system when configuration changes
   - Add a screenshot gallery for reviewing all configured screenshots

### Phase 3: Scoring Logic Builder

1. **Create Scoring Rule Editor**

   - Develop interface for defining scoring criteria
   - Implement threshold configuration for different data types
   - Create a scoring rule library for reusable criteria

2. **Design Dedicated Scoring Slide**

   - Create a dedicated slide layout for displaying scoring results
   - Implement different visualization options (gauge charts, traffic lights, etc.)
   - Add summary section for overall score

3. **Implement Scoring Calculations**
   - Develop scoring logic based on defined rules
   - Create validation for score calculations
   - Build integration with property data sources

### Phase 4: Report Assembly and Export

1. **Build Report Assembly System**

   - Create system for combining selected layouts with configured screenshots
   - Implement data mapping from property data to slide content
   - Add validation to ensure all required elements are configured

2. **Implement Export System**

   - Develop PowerPoint generation with pptxgenjs
   - Add export configuration options (quality, compression, etc.)
   - Create preview of final PowerPoint before export

3. **Add Report Metadata**
   - Include metadata in exported PowerPoints
   - Add cover page with report generation date and property info
   - Create table of contents for multi-slide reports

## Technical Implementation Details

### Frontend Architecture

1. **Component Structure**

   - Create modular components for each main feature
   - Implement state management for project configuration
   - Design responsive UI for all configuration screens

2. **Screenshot Configuration**

   - Use map component with layer controls
   - Implement WebGL for efficient map rendering
   - Create layer presets for common configurations

3. **Scoring Interface**
   - Design intuitive criterion builder
   - Implement drag-and-drop for ordering criteria
   - Create visual feedback for scoring thresholds

### Backend Architecture

1. **API Design**

   - Create endpoints for saving/loading configurations
   - Implement screenshot capture services
   - Build scoring calculation endpoints

2. **Data Storage**

   - Store layout configurations in database
   - Use blob storage for captured screenshots
   - Implement caching for frequent operations

3. **Security**
   - Add authentication for user projects
   - Implement secure data handling for property information
   - Create access controls for shared projects

## Sample Code Examples

### Layer Configuration Interface

```javascript
// Layer configuration component
function LayerConfigurationPanel({ screenshotId, configuration, onChange }) {
  const [config, setConfig] = useState(
    configuration || {
      baseLayer: "aerial",
      showBoundary: true,
      additionalLayers: [],
      zoom: "auto",
    }
  );

  // Available layers for this screenshot type
  const availableLayers = getAvailableLayers(screenshotId);

  const handleBaseLayerChange = (baseLayer) => {
    const newConfig = { ...config, baseLayer };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const handleLayerToggle = (layerId, enabled) => {
    const additionalLayers = [...config.additionalLayers];
    const layerIndex = additionalLayers.findIndex((l) => l.id === layerId);

    if (layerIndex >= 0) {
      additionalLayers[layerIndex] = {
        ...additionalLayers[layerIndex],
        visible: enabled,
      };
    } else if (enabled) {
      additionalLayers.push({
        id: layerId,
        name: getLayerName(layerId),
        visible: true,
        opacity: 1.0,
      });
    }

    const newConfig = { ...config, additionalLayers };
    setConfig(newConfig);
    onChange(newConfig);
  };

  return (
    <div className="layer-configuration-panel">
      <h3>Configure Layers for {getScreenshotName(screenshotId)}</h3>

      <div className="base-layer-selector">
        <label>Base Layer:</label>
        <select
          value={config.baseLayer}
          onChange={(e) => handleBaseLayerChange(e.target.value)}
        >
          <option value="aerial">Aerial Imagery</option>
          <option value="streets">Street Map</option>
          <option value="topo">Topographic</option>
          <option value="simple">Simple</option>
        </select>
      </div>

      <div className="boundary-toggle">
        <label>
          <input
            type="checkbox"
            checked={config.showBoundary}
            onChange={(e) => {
              const newConfig = { ...config, showBoundary: e.target.checked };
              setConfig(newConfig);
              onChange(newConfig);
            }}
          />
          Show Property Boundary
        </label>
      </div>

      <div className="additional-layers">
        <h4>Additional Layers</h4>
        {availableLayers.map((layer) => (
          <div key={layer.id} className="layer-toggle">
            <label>
              <input
                type="checkbox"
                checked={config.additionalLayers.some(
                  (l) => l.id === layer.id && l.visible
                )}
                onChange={(e) => handleLayerToggle(layer.id, e.target.checked)}
              />
              {layer.name}
            </label>
            {config.additionalLayers.some(
              (l) => l.id === layer.id && l.visible
            ) && (
              <div className="layer-opacity">
                <label>Opacity:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={
                    config.additionalLayers.find((l) => l.id === layer.id)
                      ?.opacity || 1
                  }
                  onChange={(e) => {
                    const additionalLayers = config.additionalLayers.map((l) =>
                      l.id === layer.id
                        ? { ...l, opacity: parseFloat(e.target.value) }
                        : l
                    );
                    const newConfig = { ...config, additionalLayers };
                    setConfig(newConfig);
                    onChange(newConfig);
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="screenshot-preview">
        <h4>Preview</h4>
        <ScreenshotPreview configuration={config} />
      </div>
    </div>
  );
}
```

### Scoring Rule Editor

```javascript
// Scoring rule editor component
function ScoringRuleEditor({ rule, onChange }) {
  const [scoringRule, setScoringRule] = useState(
    rule || {
      id: `rule-${Date.now()}`,
      name: "New Scoring Rule",
      description: "",
      criteria: [],
      visualizationType: "gauge",
    }
  );

  const addCriterion = () => {
    const criteria = [
      ...scoringRule.criteria,
      {
        id: `criterion-${Date.now()}`,
        name: "New Criterion",
        description: "",
        weight: 1,
        type: "numeric",
        thresholds: [
          { value: 0, score: 1, label: "Low", color: "#FFE6EA" },
          { value: 50, score: 2, label: "Medium", color: "#FFF9DD" },
          { value: 100, score: 3, label: "High", color: "#E6F2DE" },
        ],
      },
    ];

    const newRule = { ...scoringRule, criteria };
    setScoringRule(newRule);
    onChange(newRule);
  };

  const updateCriterion = (id, updates) => {
    const criteria = scoringRule.criteria.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );

    const newRule = { ...scoringRule, criteria };
    setScoringRule(newRule);
    onChange(newRule);
  };

  const deleteCriterion = (id) => {
    const criteria = scoringRule.criteria.filter((c) => c.id !== id);

    const newRule = { ...scoringRule, criteria };
    setScoringRule(newRule);
    onChange(newRule);
  };

  return (
    <div className="scoring-rule-editor">
      <div className="rule-header">
        <input
          type="text"
          value={scoringRule.name}
          onChange={(e) => {
            const newRule = { ...scoringRule, name: e.target.value };
            setScoringRule(newRule);
            onChange(newRule);
          }}
          placeholder="Rule Name"
          className="rule-name-input"
        />

        <select
          value={scoringRule.visualizationType}
          onChange={(e) => {
            const newRule = {
              ...scoringRule,
              visualizationType: e.target.value,
            };
            setScoringRule(newRule);
            onChange(newRule);
          }}
        >
          <option value="gauge">Gauge Chart</option>
          <option value="trafficLight">Traffic Light</option>
          <option value="numeric">Numeric Score</option>
          <option value="table">Score Table</option>
        </select>
      </div>

      <textarea
        value={scoringRule.description}
        onChange={(e) => {
          const newRule = { ...scoringRule, description: e.target.value };
          setScoringRule(newRule);
          onChange(newRule);
        }}
        placeholder="Rule Description"
        className="rule-description"
      />

      <div className="criteria-list">
        <h4>Scoring Criteria</h4>
        {scoringRule.criteria.map((criterion) => (
          <CriterionEditor
            key={criterion.id}
            criterion={criterion}
            onUpdate={(updates) => updateCriterion(criterion.id, updates)}
            onDelete={() => deleteCriterion(criterion.id)}
          />
        ))}

        <button onClick={addCriterion} className="add-criterion-button">
          Add Criterion
        </button>
      </div>

      <div className="scoring-preview">
        <h4>Preview</h4>
        <ScoringVisualizationPreview rule={scoringRule} />
      </div>
    </div>
  );
}
```

### Report Assembly

```javascript
// Report assembly component
function ReportAssembly({ project, onUpdate }) {
  const [selectedLayouts, setSelectedLayouts] = useState(
    project.selectedLayouts || []
  );
  const [layoutSequence, setLayoutSequence] = useState(
    project.layoutSequence || []
  );

  // Available slide layouts
  const availableLayouts = getAvailableLayouts();

  const toggleLayout = (layoutId) => {
    if (selectedLayouts.includes(layoutId)) {
      // Remove layout
      const newSelectedLayouts = selectedLayouts.filter(
        (id) => id !== layoutId
      );
      const newLayoutSequence = layoutSequence.filter((id) => id !== layoutId);

      setSelectedLayouts(newSelectedLayouts);
      setLayoutSequence(newLayoutSequence);
      onUpdate({
        ...project,
        selectedLayouts: newSelectedLayouts,
        layoutSequence: newLayoutSequence,
      });
    } else {
      // Add layout
      const newSelectedLayouts = [...selectedLayouts, layoutId];
      const newLayoutSequence = [...layoutSequence, layoutId];

      setSelectedLayouts(newSelectedLayouts);
      setLayoutSequence(newLayoutSequence);
      onUpdate({
        ...project,
        selectedLayouts: newSelectedLayouts,
        layoutSequence: newLayoutSequence,
      });
    }
  };

  const moveLayout = (layoutId, direction) => {
    const currentIndex = layoutSequence.indexOf(layoutId);
    if (currentIndex < 0) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= layoutSequence.length) return;

    const newLayoutSequence = [...layoutSequence];
    [newLayoutSequence[currentIndex], newLayoutSequence[newIndex]] = [
      newLayoutSequence[newIndex],
      newLayoutSequence[currentIndex],
    ];

    setLayoutSequence(newLayoutSequence);
    onUpdate({
      ...project,
      layoutSequence: newLayoutSequence,
    });
  };

  return (
    <div className="report-assembly">
      <div className="layout-selection">
        <h3>Available Slide Layouts</h3>
        <div className="layout-grid">
          {availableLayouts.map((layout) => (
            <div
              key={layout.id}
              className={`layout-card ${
                selectedLayouts.includes(layout.id) ? "selected" : ""
              }`}
              onClick={() => toggleLayout(layout.id)}
            >
              <img src={layout.thumbnailUrl} alt={layout.name} />
              <div className="layout-info">
                <h4>{layout.name}</h4>
                <p>{layout.description}</p>
              </div>
              <div className="layout-status">
                {selectedLayouts.includes(layout.id)
                  ? "Selected"
                  : "Click to Add"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="layout-sequence">
        <h3>Slide Sequence</h3>
        {layoutSequence.length === 0 && (
          <p className="empty-message">
            No layouts selected. Please select layouts from above.
          </p>
        )}
        <div className="sequence-list">
          {layoutSequence.map((layoutId, index) => {
            const layout = availableLayouts.find((l) => l.id === layoutId);
            if (!layout) return null;

            return (
              <div key={layoutId} className="sequence-item">
                <div className="sequence-number">{index + 1}</div>
                <img
                  src={layout.thumbnailUrl}
                  alt={layout.name}
                  className="sequence-thumbnail"
                />
                <div className="sequence-info">
                  <h4>{layout.name}</h4>
                </div>
                <div className="sequence-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayout(layoutId, "up");
                    }}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayout(layoutId, "down");
                    }}
                    disabled={index === layoutSequence.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayout(layoutId);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

## User Interface Mockups

1. **Layout Selection Screen**

   - Grid of available slide layout thumbnails
   - Checkboxes to select/deselect layouts
   - Drag-and-drop interface for sequencing selected layouts

2. **Screenshot Layer Configuration**

   - Layer selection panel with toggles for each layer
   - Opacity and style controls for enabled layers
   - Real-time preview of the screenshot with current configuration

3. **Scoring Rule Editor**

   - Form for defining scoring criteria and thresholds
   - Visual threshold sliders with color indicators
   - Preview of how scoring will appear on the final slide

4. **Report Assembly**
   - Overview of selected slide sequence
   - Configuration status for each slide (complete/incomplete)
   - Export options and preview button

## Implementation Workflow

1. **Project Setup**

   - Create new project with basic slide layouts
   - Input property information
   - Select which slide layouts to include

2. **Layer Configuration**

   - For each slide with a screenshot placeholder:
     - Select base map and layers
     - Configure layer appearance
     - Preview and adjust as needed

3. **Scoring Configuration**

   - Define scoring criteria
   - Set thresholds and weights
   - Preview scoring results

4. **Report Generation**
   - Review all configurations
   - Generate preview
   - Export final PowerPoint

## Deployment and Rollout Plan

1. **Phased Deployment**

   - Deploy Layout Library first
   - Add Layer Configuration
   - Introduce Scoring Builder
   - Complete with Report Assembly

2. **User Training**

   - Create step-by-step tutorial
   - Provide sample configurations
   - Offer guided sessions for first-time users

3. **Feedback Process**
   - Collect user feedback on workflow
   - Identify pain points
   - Prioritize improvements

## Conclusion

This streamlined architecture focuses on the core user needs:

1. A pre-defined cover slide with fixed design
2. A small set of pre-defined slide layouts
3. Configurable screenshot layers for each slide
4. A scoring logic builder with dedicated scoring slide

The implementation prioritizes simplicity and user efficiency by:

- Providing fixed layouts that ensure consistent design
- Focusing customization on content rather than structure
- Offering powerful layer configuration for screenshots
- Creating an intuitive scoring system

This approach balances flexibility with ease of use, allowing users to create professional PowerPoint reports without needing to design slide layouts from scratch.

## Codebase File Structure

The following file structure is designed to ensure maximum reusability and modularity, with special attention to layer configuration:

```
/src
│
├── /components                  # Reusable UI components
│   ├── /layout                  # Layout components
│   │   ├── LayoutSelector.tsx   # Component for selecting slide layouts
│   │   ├── LayoutPreview.tsx    # Preview component for layouts
│   │   └── SlideSequencer.tsx   # Component for arranging slide order
│   │
│   ├── /map                     # Map and layer related components
│   │   ├── MapViewer.tsx        # Main map viewing component
│   │   ├── LayerControl.tsx     # Controls for layer visibility/opacity
│   │   ├── LayerPreview.tsx     # Preview component for configured layers
│   │   └── ScreenshotPreview.tsx # Preview of screenshots with layers
│   │
│   ├── /scoring                 # Scoring related components
│   │   ├── ScoreEditor.tsx      # Main scoring rule editor component
│   │   ├── CriterionEditor.tsx  # Component for editing individual criteria
│   │   ├── ThresholdSlider.tsx  # Slider for configuring thresholds
│   │   └── ScorePreview.tsx     # Preview of scoring visualizations
│   │
│   └── /common                  # Common UI components
│       ├── Tabs.tsx             # Tabbed interface component
│       ├── Card.tsx             # Card component for layouts
│       └── Button.tsx           # Button component
│
├── /layers                      # Layer configuration files
│   ├── /base                    # Base layer definitions
│   │   ├── aerial.ts            # Aerial imagery layer config
│   │   ├── streets.ts           # Streets layer config
│   │   └── topo.ts              # Topographic layer config
│   │
│   ├── /data                    # Data layer definitions
│   │   ├── property.ts          # Property boundary layer
│   │   ├── zoning.ts            # Zoning districts layer
│   │   ├── flood.ts             # Flood hazard layer
│   │   └── utilities.ts         # Utilities layer
│   │
│   ├── /thematic                # Thematic map layers
│   │   ├── heatmap.ts           # Heat map layer config
│   │   ├── cluster.ts           # Point cluster layer config
│   │   └── choropleth.ts        # Choropleth layer config
│   │
│   ├── index.ts                 # Layer registry and exports
│   └── types.ts                 # Layer type definitions
│
├── /utils                       # Utility functions
│   ├── /gis                     # GIS utilities
│   │   ├── crs.ts               # Coordinate reference system management
│   │   ├── projection.ts        # Map projection utilities
│   │   ├── transform.ts         # Coordinate transformation functions
│   │   └── spatial.ts           # Spatial analysis utilities
│   │
│   ├── /pptx                    # PowerPoint utilities
│   │   ├── generator.ts         # PowerPoint generation utilities
│   │   ├── slide.ts             # Slide creation utilities
│   │   ├── elements.ts          # Slide element creation utilities
│   │   └── styling.ts           # PowerPoint styling utilities
│   │
│   └── /helpers                 # Helper functions
│       ├── screenshot.ts        # Screenshot capture utilities
│       ├── validation.ts        # Data validation utilities
│       └── formatting.ts        # Data formatting utilities
│
├── /services                    # Services for external interactions
│   ├── api.ts                   # API service for backend communication
│   ├── arcgis.ts                # ArcGIS REST service integration
│   ├── storage.ts               # Storage service for configurations
│   └── export.ts                # Export service for PowerPoint
│
├── /models                      # Data models
│   ├── layout.ts                # Slide layout model
│   ├── layer.ts                 # Layer configuration model
│   ├── scoring.ts               # Scoring rule model
│   └── project.ts               # User project model
│
├── /hooks                       # Custom React hooks
│   ├── useMap.ts                # Hook for map operations
│   ├── useScreenshot.ts         # Hook for screenshot capture
│   ├── useScoring.ts            # Hook for scoring calculations
│   └── useLayerConfig.ts        # Hook for layer configuration
│
├── /pages                       # Application pages
│   ├── ProjectSetup.tsx         # Project setup page
│   ├── LayerConfiguration.tsx   # Layer configuration page
│   ├── ScoringBuilder.tsx       # Scoring builder page
│   └── ReportAssembly.tsx       # Report assembly page
│
├── /constants                   # Application constants
│   ├── defaults.ts              # Default values
│   ├── layout-templates.ts      # Predefined layout templates
│   ├── layer-defaults.ts        # Default layer settings
│   └── scoring-presets.ts       # Predefined scoring presets
│
└── /contexts                    # React contexts
    ├── ProjectContext.tsx       # Context for project state
    ├── LayerContext.tsx         # Context for layer configuration
    ├── MapContext.tsx           # Context for map state
    └── ExportContext.tsx        # Context for export operations
```

### Key Implementation Details

#### 1. GIS Utilities and CRS Management

The CRS management utility (`utils/gis/crs.ts`) will be implemented as a reusable component that leverages libraries like Proj4js or the ArcGIS API for JavaScript:

```typescript
// utils/gis/crs.ts
import proj4 from "proj4";
import { loadModules } from "esri-loader";

// Register common projections
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
proj4.defs(
  "EPSG:3857",
  "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs"
);

// CRS conversion utility
export const transformCoordinates = (
  coordinates: [number, number],
  fromCRS: string,
  toCRS: string
): [number, number] => {
  return proj4(fromCRS, toCRS, coordinates);
};

// Get CRS info
export const getCRSInfo = async (srid: string | number) => {
  const [SpatialReference] = await loadModules([
    "esri/geometry/SpatialReference",
  ]);
  return new SpatialReference({ wkid: Number(srid) });
};

// Create ArcGIS spatial reference from EPSG code
export const createSpatialReference = async (epsgCode: number) => {
  const [SpatialReference] = await loadModules([
    "esri/geometry/SpatialReference",
  ]);
  return new SpatialReference({ wkid: epsgCode });
};

// Check if two CRS are equivalent
export const areEquivalentCRS = (crs1: string, crs2: string): boolean => {
  // Implementation to check CRS equivalence
  return crs1 === crs2 || getEquivalentCodes(crs1).includes(crs2);
};

// Get equivalent EPSG codes (some EPSG codes represent the same CRS)
export const getEquivalentCodes = (crs: string): string[] => {
  const equivalents: Record<string, string[]> = {
    "EPSG:4326": ["EPSG:4326", "WGS84"],
    "EPSG:3857": ["EPSG:3857", "EPSG:900913", "EPSG:3785", "GOOGLE"],
  };

  return equivalents[crs] || [crs];
};
```

#### 2. Layer Configuration Structure

Each layer in the `layers` directory will be structured for maximum reusability:

```typescript
// layers/base/aerial.ts
import { BaseLayer } from "../types";
import { createArcGISLayer } from "../../services/arcgis";

export const aerialLayer: BaseLayer = {
  id: "aerial",
  name: "Aerial Imagery",
  type: "imagery",
  description: "High-resolution aerial imagery",
  thumbnailUrl: "/assets/thumbnails/aerial.png",

  // Factory function to create the actual layer
  createLayer: async (options = {}) => {
    return createArcGISLayer({
      url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
      ...options,
    });
  },

  // Default settings
  defaultSettings: {
    opacity: 1.0,
    visible: true,
    brightness: 0,
    contrast: 0,
  },

  // Configuration UI options
  configOptions: ["opacity", "brightness", "contrast"],

  // Metadata including attribution
  metadata: {
    attribution: "Esri, Maxar, GeoEye, Earthstar Geographics",
    maxZoom: 23,
    minZoom: 0,
  },
};
```

#### 3. Layer Registry System

The layer registry will make it easy to discover and use available layers:

```typescript
// layers/index.ts
import { aerialLayer } from "./base/aerial";
import { streetsLayer } from "./base/streets";
import { topoLayer } from "./base/topo";
import { propertyLayer } from "./data/property";
import { zoningLayer } from "./data/zoning";
import { floodLayer } from "./data/flood";
// Import other layers...

import { Layer } from "./types";

// Layer registry
const layerRegistry: Record<string, Layer> = {
  aerial: aerialLayer,
  streets: streetsLayer,
  topo: topoLayer,
  property: propertyLayer,
  zoning: zoningLayer,
  flood: floodLayer,
  // Register other layers...
};

// Get all available layers
export const getAllLayers = (): Layer[] => {
  return Object.values(layerRegistry);
};

// Get layers by category
export const getLayersByCategory = (category: string): Layer[] => {
  return Object.values(layerRegistry).filter(
    (layer) => layer.category === category
  );
};

// Get a specific layer by ID
export const getLayerById = (id: string): Layer | undefined => {
  return layerRegistry[id];
};

// Get base layers
export const getBaseLayers = (): Layer[] => {
  return Object.values(layerRegistry).filter((layer) => layer.type === "base");
};

// Get data layers
export const getDataLayers = (): Layer[] => {
  return Object.values(layerRegistry).filter(
    (layer) => layer.type !== "base" && layer.category === "data"
  );
};
```

#### 4. Layer Configuration Component

```typescript
// components/map/LayerControl.tsx
import React, { useState, useEffect } from "react";
import { Layer, LayerConfig } from "../../layers/types";
import { getLayerById } from "../../layers";
import { useLayerConfig } from "../../hooks/useLayerConfig";

interface LayerControlProps {
  layerId: string;
  initialConfig?: LayerConfig;
  onChange: (config: LayerConfig) => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  layerId,
  initialConfig,
  onChange,
}) => {
  const layer = getLayerById(layerId);
  const { config, updateConfig, previewLayer } = useLayerConfig(
    layerId,
    initialConfig
  );

  if (!layer) return <div>Layer not found</div>;

  const handleVisibilityChange = (visible: boolean) => {
    updateConfig({ visible });
  };

  const handleOpacityChange = (opacity: number) => {
    updateConfig({ opacity });
  };

  return (
    <div className="layer-control">
      <div className="layer-header">
        <input
          type="checkbox"
          checked={config.visible}
          onChange={(e) => handleVisibilityChange(e.target.checked)}
        />
        <h4>{layer.name}</h4>
      </div>

      {config.visible && (
        <div className="layer-options">
          <label>
            Opacity:
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.opacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            />
            {config.opacity.toFixed(1)}
          </label>

          {/* Render additional controls based on layer.configOptions */}
          {layer.configOptions?.includes("brightness") && (
            <label>
              Brightness:
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={config.brightness || 0}
                onChange={(e) =>
                  updateConfig({ brightness: parseFloat(e.target.value) })
                }
              />
            </label>
          )}

          {/* Add more configuration options based on layer type */}
        </div>
      )}
    </div>
  );
};
```

This file structure and implementation approach provides several benefits:

1. **Reusability**: Layer definitions, GIS utilities, and UI components are all designed to be reusable
2. **Separation of concerns**: Clear separation between layer definitions, configuration UI, and utility functions
3. **Extensibility**: Easy to add new layers, utilities, or components
4. **Maintainability**: Organized file structure makes it easier to locate and update specific functionality
5. **Performance**: Modular approach allows for code splitting and lazy loading of components

The CRS management is implemented as a reusable utility that leverages external libraries (Proj4js) rather than implementing complex calculations manually.
