import { LayerTree } from '@gi-nx/gi-types';
import { giraffeState, rpc } from '@gi-nx/iframe-sdk';
import { merge } from 'lodash';
import { BBox } from 'node_modules/@turf/helpers/dist/js';

import {
    POI_LAYER_GROUP_NAME,
    SITE_SEARCH_LAYER_GROUP_NAME,
    getTempLayerId,
} from '@/constants/siteSearch';
import {
    Feature,
    FeatureCollection,
    GiraffeBounds,
    GiraffeLayerPalette,
    Position,
} from '@/types/siteSearch';
import { convertMultipolygon, isSolid } from '@/utils/common';
export const latitudePerPixelAtZoom = (zoomLevel: number) => 0.587300091021 / 2 ** zoomLevel;
export const ADDRESS_ZOOM_LEVEL: number = 16;

export type LayerStyle = {
    fillOpacity?: number;
    mainColor?: GiraffeLayerPalette;
    mainLayer?: string;
    showLines?: boolean;
    showLabels?: boolean;
    showTable?: boolean;
    displayKeys?: string[];
    lineColor?: {
        fixedValue: string;
    };
    lineDimension?: string;
    lineWidth?: number;
};

// Function to validate if the parsed JSON is a valid GeoJSON Feature or FeatureCollection
export const isValidGeoJSON = (geojson: Feature | FeatureCollection): boolean => {
    if (!geojson || typeof geojson !== 'object') {
        return false;
    }

    // Check for FeatureCollection
    if (
        geojson.type === 'FeatureCollection' &&
        Array.isArray((geojson as FeatureCollection).features)
    ) {
        return (geojson as FeatureCollection).features.every(isValidFeature);
    }

    // Check for single Feature
    if (geojson.type === 'Feature') {
        return isValidFeature(geojson as Feature);
    }

    return false;
};

// Helper function to validate a single GeoJSON Feature
export const isValidFeature = (feature: Feature): boolean => {
    return (
        feature.type === 'Feature' &&
        feature.geometry &&
        typeof feature.geometry === 'object' &&
        typeof feature.properties === 'object'
    );
};

export const getMapHeightRatio = () => {
    // Get the ratio of viewable map height to total map height (i.e. minus the results table)
    // This ensures the searched location is not obscured by the table.
    // @ts-expect-error: uiLayout is a Giraffe v5 feature that hasn't been added to the library yet
    const giraffeUiLayout = giraffeState.get('uiLayout');
    const bottomPanelHeight = giraffeUiLayout?.controlled?.bottomBarIframe?.height || 0;
    const sidePanelHeight = giraffeUiLayout?.windowDimensions?.height || window.screen.height;
    const ratio = (sidePanelHeight - bottomPanelHeight) / sidePanelHeight;
    return ratio;
};

export const adjustBounds = (bounds: GiraffeBounds): GiraffeBounds => {
    // Enlarge the bounding box to fly to based on the height of the bottom panel.
    // E.g., if the bottom panel takes up half the screen (is half the height of the right panel),
    // double the height of the bounding box. The added blank height should end up behind the bottom panel
    const boundsHeight = bounds[1][1] - bounds[0][1];
    const newHeight = boundsHeight / getMapHeightRatio();
    const newBounds: GiraffeBounds = [[bounds[0][0], bounds[1][1] - newHeight], bounds[1]];

    return newBounds;
};

export const adjustPoint = (point: Position): Position => {
    // Shift the address point vertically to ensure it isn't obscured by the results table.
    // @ts-expect-error: uiLayout is a Giraffe v5 feature that hasn't been added to the library yet
    const giraffeUiLayout = giraffeState.get('uiLayout');
    const sidePanelHeight = giraffeUiLayout?.windowDimensions?.height || window.screen.height;

    const pixelsToShift = (sidePanelHeight * (getMapHeightRatio() - 1.0)) / 2.0;
    const newLatitude = point[1] + pixelsToShift * latitudePerPixelAtZoom(ADDRESS_ZOOM_LEVEL);
    const newPoint: Position = [point[0], newLatitude];
    return newPoint;
};

export const convertBboxToGiraffeBounds = (bbox: BBox) =>
    [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
    ] as GiraffeBounds;

const truncateCoordinates = (feature: Feature) => {
    return {
        geometry: {
            type: feature.geometry.type,
            coordinates: feature.geometry.coordinates.map((polygonCoordinates) =>
                polygonCoordinates.map((coords) => [
                    parseFloat(coords[0].toFixed(7)),
                    parseFloat(coords[1].toFixed(7)),
                ]),
            ),
        },
        properties: feature.properties,
        type: feature.type,
    };
};

export const createDrawingLayer = async (name: string, featureCollection: FeatureCollection) => {
    return createDrawingLayerFeatures(name, featureCollection.features);
};

export const createDrawingLayerFeatures = async (name: string, features: Feature[]) => {
    const polygonFeatures = features
        .map((feature) => {
            const layerId = {
                properties: { layerId: name },
            };
            return merge(layerId, feature);
        })
        .flatMap(convertMultipolygon);
    const numPolygonsSplit = polygonFeatures.length - features.length;

    const solidPolygonFeatures = polygonFeatures.filter((f) => isSolid(f));
    const numUnsolidRemoved = solidPolygonFeatures.length - polygonFeatures.length;

    const truncatedFeatures = polygonFeatures
        .map((feature) => truncateCoordinates(feature))
        // Each feature in a raw section must be < 15_000 chars when stringified, otherwise an error will be thrown.
        .filter((feature) => JSON.stringify(feature).length < 15_000);
    const numTruncated = polygonFeatures.length - truncatedFeatures.length;

    const result = await rpc.invoke('createRawSections', [truncatedFeatures]);
    return {
        result,
        metadata: {
            numPolygonsSplit,
            numUnsolidRemoved,
            numTruncated,
        },
    };
};

const addLayerToGroup = (groupName: string, layerId: string) => {
    // Adds a layer to an existing group or creates a new group initialised with the layer
    return rpc.invoke('createLayerGroup', [groupName, [layerId]]).catch((err) => {
        if (err.message.includes('Group with this name already exists')) {
            const layerTree: LayerTree | undefined = giraffeState.get('layerTree');
            if (layerTree) {
                const layerTreeItems = layerTree?.items;
                const groupLayers: string[] = layerTreeItems[groupName]['children'];
                if (!groupLayers.includes(layerId)) {
                    rpc.invoke('moveLayerTreeItemIntoGroup', [layerId, groupName]);
                }
            }
        } else {
            throw err;
        }
    });
};

export const removeTempLayer = async (layerName: string) => {
    await rpc.invoke('removeTempLayer', [layerName]);
};

export const tempLayerExists = (layerName: string) => {
    const tempLayerId = getTempLayerId(layerName);
    const layerTree = giraffeState.get('layerTree');
    return layerTree ? Object.keys(layerTree.items).includes(tempLayerId) : false;
};

export const createLayerAndAddToGroup =
    (groupName: string) =>
    async (layerName: string, featureCollection: FeatureCollection, layerStyle: LayerStyle) => {
        const layerId = getTempLayerId(layerName);
        await removeTempLayer(layerName);
        await rpc.invoke('addTempLayerGeoJSON', [layerName, featureCollection, {}, layerStyle]);
        await addLayerToGroup(groupName, layerId);
    };

export const updateLayerAndAddToGroup =
    (groupName: string) =>
    async (layerName: string, featureCollection: FeatureCollection, layerStyle?: LayerStyle) => {
        const layerId = getTempLayerId(layerName);
        await rpc.invoke('updateTempLayerGeoJSON', [layerName, featureCollection]);
        if (layerStyle) {
            await rpc.invoke('updateLayerStyle', [layerName, layerStyle]);
        }
        await addLayerToGroup(groupName, layerId);
    };

export const createLayerAndAddToSiteSearchGroup = createLayerAndAddToGroup(
    SITE_SEARCH_LAYER_GROUP_NAME,
);
export const updateLayerAndAddToSiteSearchGroup = updateLayerAndAddToGroup(
    SITE_SEARCH_LAYER_GROUP_NAME,
);

export const createLayerAndAddtoPOIGroup = createLayerAndAddToGroup(POI_LAYER_GROUP_NAME);
export const updateLayerAndAddtoPOIGroup = updateLayerAndAddToGroup(POI_LAYER_GROUP_NAME);
export const setDrawTool = () => rpc.invoke('setDrawTool', [{ tool: 'MapSelector' }]);

export const expandBoundingBoxWithFeatures = (
    bbox: GiraffeBounds,
    features: Feature[],
): GiraffeBounds => {
    const allPositions: Position[] = [
        bbox[0],
        bbox[1],
        ...features.flatMap((feature) => feature.geometry.coordinates.flat()),
    ];

    const latitudes = allPositions.map((coord) => coord[0]);
    const longitudes = allPositions.map((coord) => coord[1]);

    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);

    const newBbox: GiraffeBounds = [
        [minLatitude, minLongitude],
        [maxLatitude, maxLongitude],
    ];

    return newBbox;
};
