import { convertCmValues } from '../utils/units';

export async function addPermissibilitySlide(pptx, properties) {
  let slide;
  try {
    console.log('Starting to add permissibility slide...');
    slide = pptx.addSlide();

    // Get zone code from the zone identifier - take only the code part (e.g., "SP2" from "SP2 - Infrastructure")
    const zoneCode = properties.site_suitability__principal_zone_identifier?.split('-')?.[0]?.trim();
    // Just use the LGA name as the API supports partial matches
    const lgaName = properties.site_suitability__LGA;
    
    if (!zoneCode || !lgaName) {
      throw new Error('Missing zone code or LGA information');
    }

    console.log('Making API request with:', {
      lgaName,
      zoneCode
    });

    // Make API request to get permissible uses via proxy
    try {
      const API_BASE_URL = process.env.NODE_ENV === 'development' 
        ? ''  // Empty for development as we use Vite's proxy
        : 'https://api.apps1.nsw.gov.au';

      const response = await fetch(`${API_BASE_URL}/eplanning/data/v0/FetchEPILandUsePermissibility`, {
        method: 'GET',
        headers: {
          'EpiName': lgaName,
          'ZoneCode': zoneCode,
          'Accept': 'application/json'
        }
      });

      const responseText = await response.text();
      console.log('Raw API Response:', responseText);

      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          responseText,
          headers: Object.fromEntries(response.headers.entries())
        };
        console.error('Failed to fetch permitted uses:', errorDetails);
        throw new Error(`Failed to fetch permitted uses: ${response.statusText}. Response: ${responseText}`);
      }

      let jsonData;
      try {
        jsonData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse API response:', {
          error: parseError,
          responseText
        });
        throw new Error(`Invalid JSON response from API: ${parseError.message}. This might indicate an issue with the Planning Portal API.`);
      }

      console.log('Permitted uses response:', JSON.stringify(jsonData, null, 2));

      if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
        throw new Error('Invalid or empty response from permissibility API');
      }

      const precinct = jsonData[0]?.Precinct?.[0];
      if (!precinct) {
        throw new Error('No precinct data found in response');
      }

      const zone = precinct.Zone?.find((z) => z.ZoneCode === zoneCode);
      console.log('Found zone match:', {
        searchingFor: zoneCode,
        foundZone: zone
      });

      if (!zone) {
        throw new Error(`No zone data found for ${zoneCode}`);
      }

      const landUse = zone.LandUse?.[0];
      if (!landUse) {
        throw new Error('No land use data found for zone');
      }

      // Remove duplicates and sort alphabetically
      const withConsentSet = new Set(
        (landUse.PermittedWithConsent || [])
          .map((use) => use.Landuse)
      );
      const withoutConsentSet = new Set(
        (landUse.PermittedWithoutConsent || [])
          .map((use) => use.Landuse)
      );
      const prohibitedSet = new Set(
        (landUse.Prohibited || [])
          .map((use) => use.Landuse)
      );

      const permittedUses = {
        withConsent: [...withConsentSet].sort((a, b) => a.localeCompare(b)),
        withoutConsent: [...withoutConsentSet].sort((a, b) => a.localeCompare(b)),
        prohibited: [...prohibitedSet].sort((a, b) => a.localeCompare(b))
      };

      // Format the permitted uses with bullets
      const formatWithTicks = (items) => {
        if (!items || items.length === 0) return 'None specified';
        return items.map(item => `✓ ${item}`).join('\n');
      };

      const formatWithCrosses = (items) => {
        if (!items || items.length === 0) return 'None specified';
        return items.map(item => `✗ ${item}`).join('\n');
      };

      // Add title
      slide.addText([
        { text: properties.site__address, options: { color: styles.title.color } },
        { text: ' ', options: { breakLine: true } },
        { text: 'Permissible Uses', options: { color: styles.subtitle.color } }
      ], convertCmValues({
        ...styles.title,
        color: undefined
      }));

      // Add horizontal line under title
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.titleLine));

      // Add sensitive text
      slide.addText("SENSITIVE: NSW GOVERNMENT", convertCmValues(styles.sensitiveText));

      // Add NSW Logo
      slide.addImage({
        path: "/images/NSW-Government-official-logo.jpg",
        ...convertCmValues(styles.nswLogo)
      });

      // Add LEP Information Card with rounded corners
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '5%',
        y: '18%',
        w: '90%',
        h: '15%',
        fill: 'FFFFFF',
        line: { color: '002664', width: 1 },
        roundness: 0.05
      }));

      // Add LEP content
      slide.addText([
        { text: `${jsonData[0].EPIName}\n`, options: { bold: true, fontSize: 14 } },
        { text: `Zone: ${properties.site_suitability__principal_zone_identifier || 'Not available'}\n`, options: { fontSize: 12 } },
        { text: `LGA: ${properties.site_suitability__LGA || 'Not available'}\n`, options: { fontSize: 12 } },
        { text: `Zone Objective: ${zone.ZoneObjective || 'No zone objective available'}`, options: { fontSize: 12 } }
      ], convertCmValues({
        x: '6%',
        y: '19%',
        w: '88%',
        h: '13%',
        color: '363636',
        fontFace: 'Public Sans'
      }));

      // Add Permitted Uses Section (Green Border) with rounded corners
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '5%',
        y: '35%',
        w: '90%',
        h: '30%',
        fill: 'FFFFFF',
        line: { color: '4CAF50', width: 2 },
        roundness: 0.05
      }));

      // Add Permitted Uses Title
      slide.addText('Permitted Uses', convertCmValues({
        x: '6%',
        y: '36%',
        w: '88%',
        h: '4%',
        color: '4CAF50',
        fontSize: 14,
        bold: true,
        fontFace: 'Public Sans'
      }));

      // Add Without Consent Section with rounded corners
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '6%',
        y: '41%',
        w: '42%',
        h: '22%',
        fill: 'F5F5F5',
        line: { color: 'E0E0E0', width: 1 },
        roundness: 0.05
      }));

      slide.addText([
        { text: 'Permitted without consent\n', options: { bold: true, fontSize: 12 } },
        { text: formatWithTicks(permittedUses.withoutConsent), options: { fontSize: 10, color: '4CAF50' } }
      ], convertCmValues({
        x: '7%',
        y: '42%',
        w: '40%',
        h: '20%',
        color: '363636',
        fontFace: 'Public Sans'
      }));

      // Add With Consent Section with rounded corners
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '52%',
        y: '41%',
        w: '42%',
        h: '22%',
        fill: 'F5F5F5',
        line: { color: 'E0E0E0', width: 1 },
        roundness: 0.05
      }));

      slide.addText([
        { text: 'Permitted with consent\n', options: { bold: true, fontSize: 12 } },
        { text: formatWithTicks(permittedUses.withConsent), options: { fontSize: 10, color: '4CAF50' } }
      ], convertCmValues({
        x: '53%',
        y: '42%',
        w: '40%',
        h: '20%',
        color: '363636',
        fontFace: 'Public Sans'
      }));

      // Add Prohibited Uses Section (Red Border) with rounded corners
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues({
        x: '5%',
        y: '67%',
        w: '90%',
        h: '25%',
        fill: 'FFFFFF',
        line: { color: 'FF3B3B', width: 2 },
        roundness: 0.05
      }));

      // Add Prohibited Uses Title
      slide.addText('Prohibited Uses', convertCmValues({
        x: '6%',
        y: '68%',
        w: '88%',
        h: '4%',
        color: 'FF3B3B',
        fontSize: 14,
        bold: true,
        fontFace: 'Public Sans'
      }));

      // Add Prohibited Uses Content with red crosses
      slide.addText([
        { text: formatWithCrosses(permittedUses.prohibited), options: { fontSize: 10, color: 'FF3B3B' } }
      ], convertCmValues({
        x: '6%',
        y: '73%',
        w: '88%',
        h: '18%',
        fontFace: 'Public Sans'
      }));

      // Add footer line
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));

      // Add footer text
      slide.addText('Property and Development NSW', convertCmValues(styles.footer));
      slide.addText('13', convertCmValues(styles.pageNumber));

      return slide;
    } catch (error) {
      console.error('Error generating permissibility slide:', error);
      if (!slide) {
        slide = pptx.addSlide();
      }
      slide.addText('Error generating permissibility slide: ' + error.message, {
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
  } catch (error) {
    console.error('Error generating permissibility slide:', error);
    if (!slide) {
      slide = pptx.addSlide();
    }
    slide.addText('Error generating permissibility slide: ' + error.message, {
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
    color: '363636'
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
    fontSize: 13,
    color: '002664',
    fontFace: 'Public Sans',
    align: 'left'
  }
}; 