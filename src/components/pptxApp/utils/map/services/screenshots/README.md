# Screenshot Service Refactoring

This directory contains modular screenshot capture services for different map types, which have been refactored from the monolithic `screenshot.js` file.

## Refactoring Approach

The refactoring follows these principles:

1. **Modular Structure**: Each screenshot type is contained in its own file
2. **Shared Utilities**: Common functions are in `shared.js`
3. **Backward Compatibility**: The original `screenshot.js` re-exports all functions, maintaining the existing API
4. **Self-Contained Modules**: When appropriate, layer configurations are moved into their respective modules
5. **Simplified Testing**: Smaller modules are easier to test individually

## Directory Structure

```
screenshots/
├── shared.js            # Common utilities and functions
├── aerial.js            # Aerial imagery screenshot
├── contour.js           # Contour map screenshot
├── heritage.js          # Heritage map screenshot
├── flood.js             # Flood map screenshot
├── primarySiteAttributes.js # Primary site attributes map
└── ... (other screenshot types)
```

## Usage

The screenshot functionality can be accessed in two ways:

1. **Through the original interface**:

   ```javascript
   import { captureFloodMap } from "../services/screenshot";
   ```

2. **Directly from the module**:
   ```javascript
   import { captureFloodMap } from "../services/screenshots/flood";
   ```

## Adding New Screenshot Types

To add a new screenshot type:

1. Create a new file in the `screenshots/` directory
2. Import shared utilities from `shared.js`
3. Add the export to `screenshot.js`

## Layer Configurations

Layer configurations have two possible locations:

1. **For widely used configs**: Keep in `layerConfigs.js`
2. **For screenshot-specific configs**: Define in the respective screenshot module

## Future Improvements

- [ ] Complete the refactoring of all screenshot types
- [ ] Add unit tests for each screenshot module
- [ ] Consider refactoring layer configurations into a more modular structure
- [ ] Improve error handling and logging consistency across modules
