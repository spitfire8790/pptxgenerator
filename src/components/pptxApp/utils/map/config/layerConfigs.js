import { SCREENSHOT_TYPES } from './screenshotTypes';

export const LAYER_CONFIGS = {
  [SCREENSHOT_TYPES.AERIAL]: {
    url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
    layers: 'Australia_latest',
    opacity: 1,
    width: 2048,
    height: 2048,
    padding: 0.3
  },
  [SCREENSHOT_TYPES.COVER]: {
    url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
    layers: 'Australia_latest',
    opacity: 1,
    width: 2048,
    height: 2048,
    padding: 0.5
  },
  [SCREENSHOT_TYPES.SNAPSHOT]: {
    url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
    layers: 'Australia_latest',
    opacity: 1,
    width: 2048,
    height: 3584,
    padding: 0.1
  },
  [SCREENSHOT_TYPES.ZONING]: {
    url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer',
    layerId: 2,
    size: 2048,
    padding: 0.2
  },
  [SCREENSHOT_TYPES.FSR]: {
    url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Principal_Planning_Layers/MapServer',
    layerId: 4,
    size: 2048,
    padding: 0.2
  },
  [SCREENSHOT_TYPES.HOB]: {
    url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Principal_Planning_Layers/MapServer',
    layerId: 7,
    size: 2048,
    padding: 0.2
  },
  [SCREENSHOT_TYPES.CONTOUR]: {
    url: 'https://spatial.industry.nsw.gov.au/arcgis/rest/services/PUBLIC/Contours/MapServer',
    layerId: 0,
    size: 2048,
    width: 2048,
    height: 2048,
    padding: 0.1,
    dpi: 300,
    format: 'png32',
    transparent: true,
    spatialReference: 4283
  },
  [SCREENSHOT_TYPES.WIDE]: {
    width: 2886,
    height: 2172,
    padding: 0.1,
    dpi: 300,
    format: 'png32',
    transparent: true,
    spatialReference: 4283
  }
}; 