import { convertCmValues } from '../utils/units';
import scoringCriteria from './scoringLogic';
import { proxyRequest } from '../utils/services/proxyService';
import { captureStreetViewScreenshot } from '../utils/map/services/screenshot';
import { formatAddresses } from '../utils/addressFormatting';

const makeGeometryRequest = async (url, params) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await proxyRequest(`${url}?${params}`);
        clearTimeout(timeoutId);

        if (!response) {
            console.error('No response from proxy request');
            return null;
        }

        if (response.features?.[0]) {
            return response.features[0].attributes;
        }
        return null;
    } catch (error) {
        console.error('Error querying geometry data:', error);
        return null;
    }
};

const getGeoscapeData = async (geometry) => {
    const url = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Current_Use/MapServer/0/query';
    const params = new URLSearchParams({
        f: 'json',
        geometryType: 'esriGeometryPolygon',
        geometry: JSON.stringify(geometry),
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'USE_TYPE, DESCRIPTION',
        returnGeometry: false
    });

    return makeGeometryRequest(url, params);
};

const getStreetViewData = async (geometry) => {
    const url = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Vacant_Land/MapServer/0/query';
    const params = new URLSearchParams({
        f: 'json',
        geometryType: 'esriGeometryPolygon',
        geometry: JSON.stringify(geometry),
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'VACANT_STATUS, LAST_USE',
        returnGeometry: false
    });

    return makeGeometryRequest(url, params);
};

const styles = {
    title: {
        x: '4%',
        y: '7%',
        w: '80%',
        h: '8%',
        fontSize: 26,
        fontFace: 'Public Sans Light',
        autoFit: true,
        breakLine: false,
        color: '002664',
        lineSpacing: 26
    },
    subtitle: {
        color: '363636',
    },
    titleLine: {
        x: '5%',
        y: '17%',
        w: '90%',
        h: 0.01,
        line: { color: '002664', width: 0.7 },
        fill: { color: '002664' }
    },
    sensitiveText: {
        x: '72%',
        y: '2%',
        w: '25%',
        h: '3%',
        fontSize: 9,
        color: 'FF3B3B',
        bold: true,
        align: 'right',
        fontFace: 'Public Sans'
    },
    nswLogo: {
        x: '90%',
        y: '5%',
        w: '8%',
        h: '8%',
        sizing: { type: 'contain' }
    },
    footerLine: {
        x: '5%',
        y: '93%',
        w: '90%',
        h: 0.01,
        line: { color: '002664', width: 0.7 },
        fill: { color: '002664' }
    },
    footer: {
        x: '4%',
        y: '94%',
        w: '90%',
        h: '4%',
        fontSize: 10,
        color: '002664',
        fontFace: 'Public Sans',
        align: 'left'
    },
    pageNumber: {
        x: '94%',
        y: '94%',
        w: '4%',
        h: '4%',
        fontSize: 8,
        color: '002664',
        fontFace: 'Public Sans',
        align: 'left'
    }
};

export async function addUtilisationSlide(pptx, properties) {
    const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });

    try {
        // Determine if we're dealing with multiple properties
        const isMultipleProperties = properties.isMultipleProperties || 
                                   (properties.site__multiple_addresses && 
                                   Array.isArray(properties.site__multiple_addresses) && 
                                   properties.site__multiple_addresses.length > 1);
        
        // Use the pre-formatted address if available, otherwise fall back to the old logic
        const addressText = properties.formatted_address || 
                           (isMultipleProperties 
                             ? formatAddresses(properties.site__multiple_addresses)
                             : properties.site__address);
        
        // Add title
        slide.addText([
            { text: addressText, options: { color: styles.title.color } },
            { text: ' ', options: { breakLine: true } },
            { text: 'Utilisation and Improvements', options: { color: styles.subtitle.color } }
        ], convertCmValues(styles.title));

        // Add horizontal line under title
        slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.titleLine));

        // Add sensitive text
        slide.addText("SENSITIVE: NSW GOVERNMENT", convertCmValues(styles.sensitiveText));

        // Add NSW Logo
        slide.addImage({
            path: "/images/NSW-Government-official-logo.jpg",
            ...convertCmValues(styles.nswLogo)
        });

        // Add footer elements
        slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));
        slide.addText('Property and Development NSW', convertCmValues(styles.footer));
        slide.addText('8', convertCmValues(styles.pageNumber));

        // Left section - Geoscape 3D Built Form
        slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
            x: '5%',
            y: '18%',
            w: '40%',
            h: '61%',
            fill: 'FFFFFF',
            line: { color: '002664', width: 1.5 }
        }));

        // Add blue vertical bar for Geoscape 3D Built Form
        slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
            x: '5%',
            y: '18%',
            w: '6%',
            h: '61%',
            fill: '002664'
        }));

        // Add rotated text for Geoscape 3D Built Form
        slide.addText('Geoscape 3D Built Form', convertCmValues({
            x: '-22.5%',
            y: '45%',
            w: '61%',
            h: '6%',
            color: 'FFFFFF',
            fontSize: 14,
            fontFace: 'Public Sans',
            align: 'center',
            valign: 'middle',
            rotate: 270
        }));

        // Get and process data
        let geoscapeText = 'Geoscape 3D Built Form data unavailable.';
        let geoscapeScore = 0;
        let geoscapeResult = { score: 0, coverage: 0 };
        let streetViewText = 'Street View data unavailable.';
        let streetViewScore = 0;

        console.log('=== Utilisation Slide Debug ===');
        console.log('Developable Area:', properties.developableArea);
        
        // Process and normalize developable area format
        let developableArea = null;
        
        // Ensure we have a properly formatted developable area
        if (properties.developableArea) {
            if (Array.isArray(properties.developableArea)) {
                // If it's an array, convert it to a FeatureCollection
                developableArea = {
                    type: 'FeatureCollection',
                    features: properties.developableArea.map(area => {
                        if (area.type === 'Feature') return area;
                        return { type: 'Feature', geometry: area };
                    })
                };
                console.log('Converted array of developable areas to FeatureCollection:', developableArea);
            } else if (properties.developableArea.type === 'FeatureCollection' && properties.developableArea.features) {
                // If it's already a FeatureCollection, use it directly
                developableArea = properties.developableArea;
                console.log('Using existing FeatureCollection:', developableArea);
            } else if (properties.developableArea.type === 'Feature') {
                // If it's a single Feature, wrap it in a FeatureCollection
                developableArea = {
                    type: 'FeatureCollection',
                    features: [properties.developableArea]
                };
                console.log('Wrapped single Feature in FeatureCollection:', developableArea);
            } else if (properties.developableArea.geometry) {
                // If it's a geometry object, wrap it in a Feature and FeatureCollection
                developableArea = {
                    type: 'FeatureCollection',
                    features: [{ type: 'Feature', geometry: properties.developableArea }]
                };
                console.log('Wrapped geometry in Feature and FeatureCollection:', developableArea);
            } else {
                console.error('Invalid developable area format:', properties.developableArea);
            }
        } else {
            console.warn('No developable area found in properties');
        }
        
        // Validate the FeatureCollection format
        if (developableArea && (!developableArea.features || !Array.isArray(developableArea.features) || developableArea.features.length === 0)) {
            console.error('Invalid FeatureCollection structure:', developableArea);
            developableArea = null;
        }
        
        // Log final developable area structure that will be used for scoring
        console.log('Final developable area structure used for scoring:', JSON.stringify(developableArea, null, 2));

        // Get street view geometry (for backward compatibility)
        let streetViewGeometry = null;
        if (properties.developableArea && properties.developableArea[0]) {
            streetViewGeometry = {
                rings: [properties.developableArea[0].geometry.coordinates[0]]
            };
        }

        try {
            // Process Geoscape features directly from properties
            if (properties.geoscapeFeatures) {
                // Convert array of features to FeatureCollection format
                const geoscapeFeatureCollection = {
                    type: 'FeatureCollection',
                    features: properties.geoscapeFeatures
                };
                // Use the normalized developableArea
                geoscapeResult = scoringCriteria.geoscape.calculateScore(geoscapeFeatureCollection, developableArea);
                geoscapeScore = geoscapeResult.score;
                geoscapeText = scoringCriteria.geoscape.getScoreDescription(geoscapeResult);
            }

            // Process Street View data
            if (streetViewGeometry) {
                const streetViewData = await getStreetViewData(streetViewGeometry);
                if (streetViewData) {
                    streetViewScore = scoringCriteria.streetView.calculateScore(streetViewData);
                    streetViewText = scoringCriteria.streetView.getScoreDescription(streetViewScore, streetViewData);
                }
            }
        } catch (error) {
            console.error('Error getting utilisation data:', error);
        }

        // Add Geoscape 3D Built Form map and score
        if (properties.geoscapeScreenshot) {
            try {
                slide.addImage({
                    data: properties.geoscapeScreenshot,
                    ...convertCmValues({
                        x: '11%',
                        y: '18%',
                        w: '34%',
                        h: '61%',
                        sizing: {
                            type: 'contain',
                            align: 'center',
                            valign: 'middle'
                        }
                    })
                });

                // Add score box below the map
                const scoreColor = scoringCriteria.geoscape.getScoreColor(geoscapeScore);
                slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
                    x: '11%',
                    y: '80%',
                    w: '34%',
                    h: '10%',
                    fill: scoreColor,
                    line: { color: '002664', width: 0.5 }
                }));

                slide.addText(geoscapeText, convertCmValues({
                    x: '11%',
                    y: '80%',
                    w: '34%',
                    h: '10%',
                    fontSize: 11,
                    color: '363636',
                    align: 'center',
                    valign: 'middle',
                    fontFace: 'Public Sans',
                    breakLine: true
                }));
            } catch (error) {
                console.error('Error adding Geoscape 3D Built Form screenshot:', error);
                addGeoscapeErrorMessage();
            }
        } else {
            addGeoscapeErrorMessage();
        }

        function addGeoscapeErrorMessage() {
            slide.addText('Geoscape 3D Built Form map unavailable', convertCmValues({
                x: '5%',
                y: '24%',
                w: '40%',
                h: '50%',
                fontSize: 12,
                color: 'FF0000',
                align: 'center',
                valign: 'middle'
            }));
        }

        // Store the geoscape score in the properties object
        properties.scores.geoscape = geoscapeScore;

        // Right section - Street View
        slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
            x: '50%',
            y: '18%',
            w: '40%',
            h: '61%',
            fill: 'FFFFFF',
            line: { color: '002664', width: 1.5 }
        }));

        // Add blue vertical bar for Street View
        slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
            x: '50%',
            y: '18%',
            w: '6%',
            h: '61%',
            fill: '002664'
        }));

        // Add rotated text for Street View
        slide.addText('Street View', convertCmValues({
            x: '22.5%',
            y: '45%',
            w: '61%',
            h: '6%',
            color: 'FFFFFF',
            fontSize: 14,
            fontFace: 'Public Sans',
            align: 'center',
            valign: 'middle',
            rotate: 270
        }));

        // Get Street View screenshot
        if (!properties.streetViewScreenshot && developableArea && developableArea.features && developableArea.features.length > 0) {
            try {
                // Create a proper feature for the street view screenshot function
                const streetViewFeature = developableArea.features[0];
                console.log('Using feature for Street View screenshot:', streetViewFeature);
                properties.streetViewScreenshot = await captureStreetViewScreenshot(streetViewFeature, developableArea);
            } catch (error) {
                console.error('Error capturing Street View screenshot:', error);
                console.error('Error details:', error.stack);
            }
        }

        // Add Street View map
        if (properties.streetViewScreenshot) {
            try {
                slide.addImage({
                    data: properties.streetViewScreenshot,
                    ...convertCmValues({
                        x: '56%',
                        y: '18%',
                        w: '34%',
                        h: '61%',
                        sizing: {
                            type: 'contain',
                            align: 'center',
                            valign: 'middle'
                        }
                    })
                });
            } catch (error) {
                console.error('Error adding Street View screenshot:', error);
                addStreetViewErrorMessage();
            }
        } else {
            addStreetViewErrorMessage();
        }

        function addStreetViewErrorMessage() {
            slide.addText('Street View map unavailable', convertCmValues({
                x: '50%',
                y: '24%',
                w: '40%',
                h: '50%',
                fontSize: 12,
                color: 'FF0000',
                align: 'center',
                valign: 'middle'
            }));
        }

        // Add Street View description box and score (right side)
        slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
            x: '50%',
            y: '80%',
            w: '40%',
            h: '12%',
            fill: scoringCriteria.streetView.getScoreColor(streetViewScore).replace('#', ''),
            line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
        }));

        // Add description text - now in italics
        slide.addText('Please describe street view image with reference to any improvements on site', convertCmValues({
            x: '50%',
            y: '80%',
            w: '40%',
            h: '8%',
            fontSize: 7,
            color: 'FF0000',
            fontFace: 'Public Sans',
            italic: true,
            align: 'left',
            valign: 'top',
            wrap: true
        }));

        // Add line
        slide.addShape(pptx.shapes.LINE, convertCmValues({
            x: '51%',
            y: '88.5%',
            w: '34%',
            h: 0,
            line: { color: '8C8C8C', width: 0.4 }
        }));

        // Update source text
        slide.addText('Source: Google, 2005', convertCmValues({
            x: '50%',
            y: '88%',
            w: '40%',
            h: '3%',
            fontSize: 6,
            color: '363636',
            fontFace: 'Public Sans Light',
            italic: true,
            align: 'left',
            wrap: true
        }));

        // Add Geoscape text box
        slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
            x: '5%',
            y: '80%',
            w: '40%',
            h: '12%',
            fill: geoscapeScore === 1 ? 'FFE6EA' : geoscapeScore === 2 ? 'FFF9DD' : 'E6F2DE',
            line: { color: '8C8C8C', width: 0.5, dashType: 'dash' }
        }));

        // Add Geoscape description
        slide.addText(scoringCriteria.geoscape.getScoreDescription(geoscapeResult), convertCmValues({
            x: '5%',
            y: '80%',
            w: '40%',
            h: '8%',
            fontSize: 7,
            color: '363636',
            fontFace: 'Public Sans',
            align: 'left',
            valign: 'top',
            wrap: true
        }));

        // Add score text
        slide.addText(`Score: ${geoscapeScore}/3`, convertCmValues({
            x: '5%',
            y: '86%',
            w: '40%',
            h: '4%',
            fontSize: 7,
            color: '363636',
            fontFace: 'Public Sans',
            bold: true,
            align: 'right'
        }));

        // Add line
        slide.addShape(pptx.shapes.LINE, convertCmValues({
            x: '6%',
            y: '88.5%',
            w: '34%',
            h: 0,
            line: { color: '8C8C8C', width: 0.4 }
        }));

        // Add source text
        slide.addText('Source: Geoscape Buildings, Department of Customer Service, March 2024', convertCmValues({
            x: '5%',
            y: '88%',
            w: '40%',
            h: '3%',
            fontSize: 6,
            color: '363636',
            fontFace: 'Public Sans Light',
            italic: true,
            align: 'left',
            wrap: true
        }));

        return slide;

    } catch (error) {
        console.error('Error generating utilisation slide:', error);
        slide.addText('Error generating utilisation slide: ' + error.message, {
            x: '10%',
            y: '45%',
            w: '80%',
            h: '10%',
            fontSize: 14,
            color: 'FF0000',
            align: 'center'
        });
        return slide;
    }
}
