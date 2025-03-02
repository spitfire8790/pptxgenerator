import { SCREENSHOT_TYPES } from './screenshotTypes';

export const LAYER_CONFIGS = {
  [SCREENSHOT_TYPES.AERIAL]: {
    url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
    layers: 'Australia_latest',
    opacity: 1,
    width: 2048,
    height: 2048,
    padding: 0.2,
    dpi: 300,
    fallbackUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer',
    fallbackFormat: 'png32',
    fallbackTransparent: false,
    fallbackSpatialReference: 102100
  },
  [SCREENSHOT_TYPES.COVER]: {
    url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
    layers: 'Australia_latest',
    opacity: 1,
    width: 2048,
    height: 2048,
    padding: 0.7,
    dpi: 300,
    fallbackUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer',
    fallbackFormat: 'png32',
    fallbackTransparent: false,
    fallbackSpatialReference: 102100
  },
  [SCREENSHOT_TYPES.SNAPSHOT]: {
    url: 'https://api.metromap.com.au/ogc/gda2020/key/cstti1v27eq9nu61qu4g5hmzziouk84x211rfim0mb35cujvqpt1tufytqk575pe/service',
    layers: 'Australia_latest',
    opacity: 1,
    width: 2048,
    height: 2048,
    padding: 0.2,
    dpi: 500,
    fallbackUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer',
    fallbackFormat: 'png32',
    fallbackTransparent: false,
    fallbackSpatialReference: 102100
  },
  [SCREENSHOT_TYPES.ZONING]: {
    url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer',
    layerId: 2,
    size: 2048,
    padding: 0.2,
    dpi: 300,
    format: 'png32',
    transparent: true,
    showBoundary: true
  },
  [SCREENSHOT_TYPES.FSR]: {
    url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Principal_Planning_Layers/MapServer',
    layerId: 4,
    size: 2048,
    padding: 0.2,
    dpi: 300,
    format: 'png32',
    transparent: true,
    showBoundary: true
  },
  [SCREENSHOT_TYPES.HOB]: {
    url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Principal_Planning_Layers/MapServer',
    layerId: 7,
    size: 2048,
    padding: 0.2,
    dpi: 300,
    format: 'png32',
    transparent: true,
    showBoundary: true
  },
  [SCREENSHOT_TYPES.CONTOUR]: {
    url: 'https://spatial.industry.nsw.gov.au/arcgis/rest/services/PUBLIC/Contours/MapServer',
    layerId: 0,
    size: 2048,
    width: 2048,
    height: 2048,
    padding: 0.3,
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
  },
  [SCREENSHOT_TYPES.WATER_MAINS]: {
    url: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_Water_Sewer_Infrastructure/FeatureServer/13',
    layerId: 14235,
    size: 2048,
    padding: 0.2,
    dpi: 300,
    format: 'png32',
    transparent: true,
  },
  [SCREENSHOT_TYPES.SEWER_MAINS]: {
    url: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/NSW_Water_Sewer_Infrastructure/FeatureServer/11',
    layerId: 14112,
    size: 2048,
    padding: 0.2,
    dpi: 300,
    format: 'png32',
    transparent: true
  },
  [SCREENSHOT_TYPES.POWER]: {
    services: [
      {
        url: 'https://services-ap1.arcgis.com/ug6sGLFkytbXYo4f/arcgis/rest/services/LUAL_Network_LV_Public/FeatureServer/0',
        spatialReference: 3857
      },
      {
        url: 'https://services.arcgis.com/Gbs1D7TkFBVkx0Nz/ArcGIS/rest/services/LookUpNLive/FeatureServer/2',
        spatialReference: 7856
      }
    ],
    size: 2048,
    padding: 0.2,
    dpi: 300
  },
  [SCREENSHOT_TYPES.TEC]: {
    url: 'https://mapprod1.environment.nsw.gov.au/arcgis/rest/services/EDP/TECs_GreaterSydney/MapServer',
    layerId: 0,
    size: 2048,
    padding: 0.3,
    dpi: 300,
    format: 'png32',
    transparent: true,
    spatialReference: 4283
  },
};
