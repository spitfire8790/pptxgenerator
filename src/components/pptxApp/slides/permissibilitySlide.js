import { convertCmValues } from '../utils/units';

export async function addPermissibilitySlide(pptx, properties) {
  console.log('Permissibility slide data:', {
    zoneCode: properties.site_suitability__principal_zone_identifier,
    LGA: properties.site_suitability__LGA,
    copiedFrom: properties.copiedFrom
  });

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

    // Helper function to normalize LGA names for API compatibility
    const normalizeLGAName = (name) => {
      if (!name) return '';
      
      // Special cases mapping
      const specialCases = {
        'city of parramatta': 'Parramatta',
        'city of sydney': 'Sydney',
        'city of newcastle': 'Newcastle',
        'city of wollongong': 'Wollongong',
        'city of canterbury bankstown': 'Canterbury-Bankstown',
        'city of canada bay': 'Canada Bay',
        'city of ryde': 'Ryde',
        'municipality of kiama': 'Kiama',
        'city of blacktown': 'Blacktown',
        'city of blue mountains': 'Blue Mountains',
        'city of campbelltown': 'Campbelltown',
        'city of fairfield': 'Fairfield',
        'city of hawkesbury': 'Hawkesbury',
        'city of liverpool': 'Liverpool',
        'city of penrith': 'Penrith',
        'city of randwick': 'Randwick',
        'city of shellharbour': 'Shellharbour',
        'city of shoalhaven': 'Shoalhaven'
      };

      // Convert input to lowercase for case-insensitive matching
      const normalizedInput = name.toLowerCase();

      // Check if we have a match in special cases (case-insensitive)
      if (specialCases[normalizedInput]) {
        return specialCases[normalizedInput];
      }

      return name;
    };

    console.log('Making API request with:', {
      lgaName: normalizeLGAName(lgaName),
      zoneCode
    });

    // Create mapping of zone codes to their HEX fill colors
    const landZoningColors = {
      '2(a)': 'FFA6A3',
      'A': 'FC776E',
      'AGB': 'FAE8C5',
      'B': '63F0F5',
      'B1': 'C9FFF9',
      'B2': '62F0F5',
      'B3': '00C2ED',
      'B4': '959DC2',
      'B5': '7DA0AB',
      'B6': '95BFCC',
      'B7': 'BAD6DE',
      'C': 'BAD6DE',
      'C1': 'E69900',
      'C2': 'F0AE3C',
      'C3': 'F7C568',
      'C4': 'FFDA96',
      'D': '959DC2',
      'DR': 'FFFF70',
      'E': '00C2ED',
      'E1': '62F0F5',
      'E2': 'B4C6E7',
      'E3': '8EA9DB',
      'E4': '9999FF',
      'E5': '9966FF',
      'EM': '95BFCC',
      'ENP': 'FFD640',
      'ENT': '76C0D6',
      'ENZ': '73B273',
      'EP': 'FCF9B6',
      'F': 'FFFFA1',
      'G': 'FFFF70',
      'H': '55FF00',
      'I': 'D3FFBF',
      'IN1': 'DDB8F5',
      'IN2': 'F3DBFF',
      'IN3': 'C595E8',
      'MAP': 'E6FFFF',
      'MU': '959DC2',
      'MU1': '959DC2',
      'P': 'B3CCFC',
      'PAE': 'F4EC49',
      'PEP': '74B374',
      'PRC': '549980',
      'R': 'B3FCB3',
      'R1': 'FFCFFF',
      'R2': 'FFA6A3',
      'R3': 'FF776E',
      'R4': 'FF483B',
      'R5': 'FFD9D9',
      'RAC': 'E6CB97',
      'RAZ': 'E6CB97',
      'RE1': '55FF00',
      'RE2': 'D3FFBE',
      'REC': 'AEF2B3',
      'REZ': 'DEB8F5',
      'RO': '55FF00',
      'RP': 'D3FFBE',
      'RU1': 'EDD8AD',
      'RU2': 'E6CA97',
      'RU3': 'DEC083',
      'RU4': 'D6BC6F',
      'RU5': 'D6A19C',
      'RU6': 'C79E4C',
      'RUR': 'EFE4BE',
      'RW': 'D3B8F5',
      'SET': 'FFD2DC',
      'SP1': 'FFFFA1',
      'SP2': 'FFFF70',
      'SP3': 'FFFF00',
      'SP4': 'FFFF00',
      'SP5': 'E6E600',
      'SPU': 'FFFF00',
      'T': 'FCD2EF',
      'U': 'CAFCED',
      'UD': 'FF7F63',
      'UL': 'FFFFFF',
      'UR': 'FF776E',
      'W': 'FCC4B8',
      'W1': 'D9FFF2',
      'W2': '99FFDD',
      'W3': '33FFBB',
      'W4': '00E6A9',
      'WFU': '1182C2'
    };

    // Add set of housing-related uses to highlight
    const housingRelatedUses = new Set([
      'Residential Accommodation',
      'Affordable Housing',
      'Attached Dwelling',
      'Attached Dwellings',
      'Boarding Houses',
      'Dual Occupancy',
      'Dual Occupancy (attached)',
      'Dual Occupancy (detached)',
      'Dual Occupancies',
      'Dwelling',
      'Dwelling House',
      'Dwelling Houses',
      'Group Homes',
      'Group Home (permanent)',
      'Group Home (temporary)',
      'Multi Dwelling Housing',
      'Residential Flat Buildings',
      'Secondary Dwelling',
      'Secondary Dwellings',
      'Semi-Detached Dwellings',
      'Semi-detached Dwelling',
      'Seniors Housing',
      'Shop Top Housing'
    ]);

    // Make API request to get permissible uses via proxy
    try {
      const API_BASE_URL = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5173'
        : 'https://proxy-server.jameswilliamstrutt.workers.dev';

      const response = await fetch(`${API_BASE_URL}${process.env.NODE_ENV === 'development' ? '/api/proxy' : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://api.apps1.nsw.gov.au/eplanning/data/v0/FetchEPILandUsePermissibility',
          method: 'GET',
          headers: {
            'EpiName': normalizeLGAName(lgaName),
            'ZoneCode': zoneCode,
            'Accept': 'application/json'
          }
        })
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

      // Helper function to format items with commas and proper styling
      const formatItemsAsText = (items) => {
        if (!items || items.length === 0) return [{ text: 'None specified', options: { color: '363636' } }];
        
        return items.map((item, index) => {
          const isHousingRelated = housingRelatedUses.has(item);
          const formattedItem = {
            text: item + (isHousingRelated ? ' 🏠' : '') + (index < items.length - 1 ? ', ' : ''),
            options: {
              color: isHousingRelated ? '0066CC' : undefined,
              bold: isHousingRelated,
              highlight: isHousingRelated ? 'CCFFCC' : undefined
            }
          };
          return formattedItem;
        });
      };

      // Create combined table rows with all information
      const combinedTableRows = [
        [
          { 
            text: 'Environmental Planning Instrument:', 
            options: { 
              bold: true,
              color: '363636',
              fontSize: 8,
              valign: 'middle',
              align: 'left'
            }
          },
          {
            text: jsonData[0].EPIName,
            options: {
              color: '363636',
              fontSize: 8,
              valign: 'middle',
              align: 'left',
              wrap: true
            }
          }
        ],
        [
          { 
            text: 'Zone:', 
            options: { 
              bold: true,
              color: '363636',
              fontSize: 8,
              valign: 'middle',
              align: 'left'
            }
          },
          {
            text: [
              {
                text: properties.site_suitability__principal_zone_identifier || 'Not available',
                options: {
                  fontSize: 8,
                  color: '363636'
                }
              },
              {
                text: ' ■',
                options: {
                  fontSize: 10,
                  color: zoneCode ? landZoningColors[zoneCode] || '363636' : '363636'
                }
              }
            ],
            options: {
              valign: 'middle',
              align: 'left'
            }
          }
        ],
        [
          { 
            text: 'LGA:', 
            options: { 
              bold: true,
              color: '363636',
              fontSize: 8,
              valign: 'middle',
              align: 'left'
            }
          },
          {
            text: properties.site_suitability__LGA || 'Not available',
            options: {
              color: '363636',
              fontSize: 8,
              valign: 'middle',
              align: 'left'
            }
          }
        ],
        [
          { 
            text: 'Zone Objective:', 
            options: { 
              bold: true,
              color: '363636',
              fontSize: 8,
              valign: 'middle',
              align: 'left'
            }
          },
          {
            text: zone.ZoneObjective?.trim() || 'No zone objective available',
            options: {
              color: '363636',
              fontSize: 8,
              valign: 'middle',
              align: 'left',
              wrap: true
            }
          }
        ],
        [
          { 
            text: 'Permitted without consent',
            options: { 
              bold: true,
              color: '4CAF50',
              fontSize: 8,
              valign: 'middle',
              align: 'left'
            }
          },
          {
            text: formatItemsAsText(permittedUses.withoutConsent),
            options: {
              color: '4CAF50',
              fontSize: 8,
              valign: 'middle',
              align: 'left',
              wrap: true
            }
          }
        ],
        [
          { 
            text: 'Permitted with consent',
            options: { 
              bold: true,
              color: '4CAF50',
              fontSize: 8,
              valign: 'middle',
              align: 'left'
            }
          },
          {
            text: formatItemsAsText(permittedUses.withConsent),
            options: {
              color: '4CAF50',
              fontSize: 8,
              valign: 'middle',
              align: 'left',
              wrap: true
            }
          }
        ],
        [
          { 
            text: 'Prohibited Uses',
            options: { 
              bold: true,
              color: 'FF3B3B',
              fontSize: 8,
              valign: 'middle',
              align: 'left'
            }
          },
          {
            text: formatItemsAsText(permittedUses.prohibited),
            options: {
              color: 'FF3B3B',
              fontSize: 8,
              valign: 'middle',
              align: 'left',
              wrap: true
            }
          }
        ]
      ];

      // Add the combined table
      slide.addTable(combinedTableRows, {
        ...convertCmValues({
          x: '5%',
          y: '18%',
          w: '90%',
          h: '70%'
        }),
        colW: [2.2, 9.8],
        rowH: 0.4,
        fontSize: 8,
        fontFace: 'Public Sans',
        border: { 
          type: 'solid',
          pt: 1,
          color: '002664'
        },
        align: 'left',
        valign: 'middle',
        margin: 3,
        autoPage: false
      });

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

      // Add footer line
      slide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));

      // Add footer text
      slide.addText('Property and Development NSW', convertCmValues(styles.footer));
      slide.addText('15', convertCmValues(styles.pageNumber));

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
    fontSize: 8,
    color: '002664',
    fontFace: 'Public Sans',
    align: 'left'
  }
}; 