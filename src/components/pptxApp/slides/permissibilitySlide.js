import { convertCmValues } from '../utils/units';
import { getAllPermissibleHousingTypes } from '../utils/lmrPermissibility';
import { formatAddresses } from '../utils/addressFormatting';

export async function addPermissibilitySlide(pptx, properties) {
  console.log('Permissibility slide data:', {
    zoneCode: properties.site_suitability__principal_zone_identifier,
    LGA: properties.site_suitability__LGA,
    copiedFrom: properties.copiedFrom
  });

  // Check if we have multiple properties
  const isMultipleProperties = properties.isMultipleProperties;
  const allProperties = properties.allProperties || [];
  
  // Get all unique zone identifiers across all properties
  let uniqueZones = [];
  
  if (isMultipleProperties && allProperties.length > 0) {
    // Extract all zone identifiers from all properties
    // This handles the case where different features have different zones
    const allZones = allProperties
      .map(prop => prop.copiedFrom?.site_suitability__principal_zone_identifier || prop.site_suitability__principal_zone_identifier)
      .filter(Boolean);
    
    // Create a set of unique zone identifiers to avoid duplicates
    uniqueZones = [...new Set(allZones)];
    console.log('Found unique zones:', uniqueZones);
  } else {
    // Single property case - just use the principal zone
    const zoneIdentifier = properties.site_suitability__principal_zone_identifier;
    if (zoneIdentifier) {
      uniqueZones = [zoneIdentifier];
    }
  }
  
  // If no zones found, create an error slide
  if (uniqueZones.length === 0) {
    const errorSlide = pptx.addSlide();
    errorSlide.addText('Error: No zone information available', {
      x: '10%',
      y: '45%',
      w: '80%',
      h: '10%',
      fontSize: 14,
      color: 'FF0000',
      align: 'center'
    });
    return errorSlide;
  }
  
  // Create a slide for each unique zone
  // This allows us to show permissibility information for each zone separately
  const slides = [];
  
  for (let i = 0; i < uniqueZones.length; i++) {
    const zoneIdentifier = uniqueZones[i];
    console.log(`Creating permissibility slide for zone: ${zoneIdentifier}`);
    
    // Create a slide for this zone
    // Pass the index and total count for page numbering and slide titles
    const slide = await createZoneSlide(pptx, properties, zoneIdentifier, i, uniqueZones.length, isMultipleProperties);
    slides.push(slide);
  }
  
  return slides;
}

// Helper function to create a slide for a specific zone
// This allows us to reuse the existing slide creation logic for each zone
async function createZoneSlide(pptx, properties, zoneIdentifier, index, totalZones, isMultipleProperties) {
  let slide;
  try {
    console.log(`Starting to add permissibility slide for zone: ${zoneIdentifier}`);
    slide = pptx.addSlide();

    // Get zone code from the zone identifier - take only the code part before the first space
    const zoneCode = zoneIdentifier?.split(' ')?.[0]?.trim();
    // Just use the LGA name as the API supports partial matches
    const lgaName = properties.site_suitability__LGA;
    
    if (!zoneCode || !lgaName) {
      throw new Error('Missing zone code or LGA information');
    }

    // Helper function to fetch EPI Name from property ID
    const fetchEPINameFromPropertyID = async (propertyID) => {
      if (!propertyID) {
        console.log('No property ID provided for EPI Name lookup');
        return null;
      }

      console.log(`Fetching EPI Name for property ID: ${propertyID}`);
      
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
            url: `https://api.apps1.nsw.gov.au/planning/viewersf/V1/ePlanningApi/layerintersect?type=property&id=${propertyID}&layers=epi`,
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          })
        });

        if (!response.ok) {
          console.error('Failed to fetch EPI Name:', response.statusText);
          return null;
        }

        const data = await response.json();
        console.log('EPI Name API response:', data);

        // Look for Land Zoning Map entry first as it's most relevant
        const landZoningEntry = data.find(item => item.layerName === "Land Zoning Map");
        if (landZoningEntry && landZoningEntry.results && landZoningEntry.results.length > 0) {
          const epiName = landZoningEntry.results[0].EPI_Name || landZoningEntry.results[0]["EPI Name"];
          if (epiName) {
            console.log(`Found EPI Name from Land Zoning Map: ${epiName}`);
            return epiName;
          }
        }

        // If not found in Land Zoning Map, look in other entries
        for (const entry of data) {
          if (entry.results && entry.results.length > 0) {
            for (const result of entry.results) {
              const epiName = result.EPI_Name || result["EPI Name"];
              if (epiName && result["EPI Type"] === "LEP") {
                console.log(`Found EPI Name from ${entry.layerName}: ${epiName}`);
                return epiName;
              }
            }
          }
        }

        console.log('No suitable EPI Name found in response');
        return null;
      } catch (error) {
        console.error('Error fetching EPI Name:', error);
        return null;
      }
    };

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

      // Prepare headers for the permissibility API request
      const headers = {
        'Accept': 'application/json'
      };

      // Preference using the normalized LGA name first
      headers['EpiName'] = normalizeLGAName(lgaName);
      
      // Only try to get EPI Name from property ID as fallback if needed
      // We'll keep this code commented out as we're now preferencing the LGA approach
      /*
      let epiName = null;
      if (properties.site__property_id) {
        epiName = await fetchEPINameFromPropertyID(properties.site__property_id);
        if (epiName) {
          headers['EpiName'] = epiName;
        }
      }
      */

      // Add zone code to headers
      headers['ZoneCode'] = zoneCode;

      console.log('Final API request headers:', headers);

      const response = await fetch(`${API_BASE_URL}${process.env.NODE_ENV === 'development' ? '/api/proxy' : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://api.apps1.nsw.gov.au/eplanning/data/v0/FetchEPILandUsePermissibility',
          method: 'GET',
          headers: headers
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

      // Helper function to ensure text is always a string
      const ensureString = (text) => {
        if (typeof text === 'string') return text;
        if (text === null || text === undefined) return '';
        if (Array.isArray(text)) return text.map(t => typeof t === 'object' ? (t.text || '') : String(t)).join('');
        return String(text);
      };

      // Check LMR overlap status - completely disabled
      // let lmrStatus = 'Checking...';
      // Force LMR status to false regardless of the stored value
      let isInLMRArea = false; // Temporarily disable LMR functionality
      properties.isInLMRArea = false; // Override the property value
      
      /* Completely disable LMR functionality
      // Set the LMR status based on the stored value (now always false)
      if (isInLMRArea) {
        lmrStatus = '✓ Property is located within a Low Medium Rise (LMR) housing area. Additional development controls apply.';
      } else {
        lmrStatus = '✗ Property is not located within a Low Medium Rise (LMR) housing area.';
      }
      
      // If property is in LMR area, check what's permissible
      let lmrDevelopmentOptions = [];
      if (isInLMRArea) {
        console.log('Checking LMR development options');
        lmrDevelopmentOptions = await getAllPermissibleHousingTypes(properties);
        console.log('LMR development options:', lmrDevelopmentOptions);
      }
      */

      // Helper function to format items with commas and proper styling
      const formatItemsAsText = (items) => {
        if (!items || items.length === 0) return 'None specified';
        
        return items.map((item, index) => {
          const isHousingRelated = housingRelatedUses.has(item);
          return item + (isHousingRelated ? ' 🏠' : '') + (index < items.length - 1 ? ', ' : '');
        }).join('');
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
            text: ensureString(jsonData[0].EPIName),
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
                text: ensureString(zoneIdentifier || 'Not available'), 
                options: { color: '363636' } 
              },
              { 
                text: ' ', 
                options: { color: '363636' } 
              },
              { 
                text: '■', 
                options: { 
                  color: landZoningColors[zoneCode] || '363636'
                } 
              }
            ],
            options: {
              fontSize: 8,
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
            text: ensureString(properties.site_suitability__LGA || 'Not available'),
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
            text: ensureString(zone.ZoneObjective?.trim() || 'No zone objective available'),
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

      // Only add LMR-related rows if the LMR status has been determined in the access slide
      // Commented out per request to completely remove LMR references from the table
      /*
      if (typeof properties.isInLMRArea !== 'undefined') {
        // Add LMR status row
        combinedTableRows.push([
          { 
            text: 'Low Medium Rise (LMR)', 
            options: { 
              bold: true,
              color: '363636',
              fontSize: 8,
              valign: 'middle',
              align: 'left'
            }
          },
          {
            text: properties.isInLMRArea ? 
              '✓ Property is located within a Low Medium Rise (LMR) housing area. Additional development controls apply.' :
              '✗ Property is not located within a Low Medium Rise (LMR) housing area.',
            options: {
              color: properties.isInLMRArea ? '4CAF50' : 'FF3B3B',
              fontSize: 8,
              valign: 'middle',
              align: 'left',
              wrap: true
            }
          }
        ]);

        // Add LMR Housing Options row
        combinedTableRows.push([
          { 
            text: 'LMR Housing Options', 
            options: { 
              bold: true,
              color: properties.isInLMRArea ? '0066CC' : '363636',
              fontSize: 8,
              valign: 'middle',
              align: 'left'
            }
          },
          {
            text: properties.isInLMRArea ? 
              'See LMR Development Options table below for details' :
              'Not applicable - Property is not within an LMR area',
            options: {
              color: properties.isInLMRArea ? '0066CC' : '363636',
              fontSize: 8,
              valign: 'middle',
              align: 'left',
              wrap: true
            }
          }
        ]);
      }
      */

      // Add the combined table
      slide.addTable(combinedTableRows, {
        ...convertCmValues({
          x: '5%',
          y: '18%',
          w: '90%',
          h: '70%'  // Always use 70% since LMR is removed
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

      // If property is in LMR area, add the LMR development options table on a new slide
      if (properties.isInLMRArea) {
        // Temporarily disabled LMR slide creation
        /*
        try {
          // Check again if we have permissible options
          const permissibleOptions = await getAllPermissibleHousingTypes(properties);
          
          if (permissibleOptions.length > 0) {
            // Create a new slide for LMR development options
            const lmrSlide = pptx.addSlide();
            
            // Add title to the new slide
            lmrSlide.addText([
              { text: properties.formatted_address || properties.site__address, options: { color: styles.title.color } },
              { text: ' ', options: { breakLine: true } },
              { text: `LMR Development Options${totalZones > 1 ? ` - Zone ${index + 1} of ${totalZones}: ${zoneIdentifier}` : ''}`, options: { color: styles.subtitle.color } }
            ], convertCmValues({
              ...styles.title,
              color: undefined
            }));

            // Add horizontal line under title
            lmrSlide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.titleLine));

            // Add sensitive text
            lmrSlide.addText("SENSITIVE: NSW GOVERNMENT", convertCmValues(styles.sensitiveText));

            // Add NSW Logo
            lmrSlide.addImage({
              path: "/images/NSW-Government-official-logo.jpg",
              ...convertCmValues(styles.nswLogo)
            });

            // Add footer line
            lmrSlide.addShape(pptx.shapes.RECTANGLE, convertCmValues(styles.footerLine));

            // Add source footnote
            lmrSlide.addText('Source: ', {
              ...convertCmValues({
                x: '5%',
                y: '90%',
                w: '90%',
                h: '3%'
              }),
              fontSize: 8,
              color: '363636',
              fontFace: 'Public Sans',
              align: 'left'
            });

            // Add footer text
            lmrSlide.addText('Property and Development NSW', convertCmValues(styles.footer));
            
            // Calculate page number for LMR slide
            const basePageNumber = 16;
            const pageOffset = index * 2; // Each zone adds 2 pages (permissibility + LMR)
            lmrSlide.addText(`${basePageNumber + pageOffset}`, convertCmValues(styles.pageNumber));
            
            // Format the permissible options for the table
            const lmrOptionsTableTitle = [
              [
                { 
                  text: 'LMR Development Options', 
                  options: { 
                    bold: true,
                    color: '002664',
                    fontSize: 9,
                    valign: 'middle',
                    align: 'left',
                    colspan: 6
                  }
                }
              ],
              [
                { 
                  text: 'Housing Type', 
                  options: { 
                    bold: true,
                    color: '363636',
                    fontSize: 8,
                    valign: 'middle',
                    align: 'left'
                  }
                },
                { 
                  text: 'Site Requirements', 
                  options: { 
                    bold: true,
                    color: '363636',
                    fontSize: 8,
                    valign: 'middle',
                    align: 'left'
                  }
                },
                { 
                  text: 'Site Characteristics', 
                  options: { 
                    bold: true,
                    color: '363636',
                    fontSize: 8,
                    valign: 'middle',
                    align: 'left'
                  }
                },
                { 
                  text: 'Permissible', 
                  options: { 
                    bold: true,
                    color: '363636',
                    fontSize: 8,
                    valign: 'middle',
                    align: 'center'
                  }
                },
                { 
                  text: 'FSR', 
                  options: { 
                    bold: true,
                    color: '363636',
                    fontSize: 8,
                    valign: 'middle',
                    align: 'center'
                  }
                },
                { 
                  text: 'HOB', 
                  options: { 
                    bold: true,
                    color: '363636',
                    fontSize: 8,
                    valign: 'middle',
                    align: 'center'
                  }
                }
              ]
            ];
            
            // Create rows for each housing type
            const lmrOptionsRows = permissibleOptions.map(option => {
              // Format the site requirements text
              const siteRequirements = Object.entries(option.requirements || {})
                .map(([key, value]) => {
                  // Special handling for Residential Flat Buildings based on zone
                  if (option.type === 'Residential Flat Buildings') {
                    const zoneCode = zoneIdentifier?.split(' ')?.[0]?.trim() || '';
                    
                    if (zoneCode === 'R1' || zoneCode === 'R2') {
                      if (key === 'area') return 'Min. Area: 500m²';
                      if (key === 'width') return 'Min. Width: 12m';
                    } else if (zoneCode === 'R3' || zoneCode === 'R4') {
                      return null; // No minimum requirements for R3/R4
                    }
                  }
                  
                  // Format area values with commas for thousands
                  if (key === 'area' && typeof value === 'number') {
                    return `Min. Area: ${value.toLocaleString()}m²`;
                  }
                  
                  // Format width values without decimal places
                  if (key === 'width' && typeof value === 'number') {
                    return `Min. Width: ${Math.round(value)}m`;
                  }
                  
                  return `${key}: ${value}`;
                })
                .filter(Boolean) // Remove null entries
                .join('\n');
              
              // Format the site characteristics text with ticks/crosses
              const siteCharacteristics = Object.entries(option.criteria || {})
                .map(([key, value], index, array) => {
                  // Skip the distance criterion for Residential Flat Buildings as we're now using ranges
                  if (option.type === 'Residential Flat Buildings' && key === 'distance') {
                    return null;
                  }
                  
                  const title = key.charAt(0).toUpperCase() + key.slice(1);
                  const isMet = value.met;
                  const symbol = isMet ? '✓' : '✗';
                  const color = isMet ? '4CAF50' : 'FF3B3B';
                  
                  const elements = [
                    { text: `${title}: `, options: { color: '363636' } },
                    { text: value.actual, options: { color: '363636' } },
                    { text: ' ', options: { color: '363636' } },
                    { text: symbol, options: { color, bold: true } }
                  ];
                  
                  // Add line break if not the last item
                  if (index < array.length - 1) {
                    elements.push({ text: '\n', options: { color: '363636' } });
                  }
                  
                  return elements;
                })
                .filter(Boolean) // Remove null entries
                .flat(); // Flatten the array of arrays into a single array
              
              // Format the permissible status with tick/cross
              const permissibleStatus = option.isPermissible ? '✓' : '✗';
              
              // Format FSR values with comparison
              const fsrText = (() => {
                const current = typeof option.currentFSR === 'number' ? option.currentFSR.toFixed(2) : 'Unknown';
                
                // Special handling for Residential Flat Buildings
                if (option.type === 'Residential Flat Buildings') {
                  const zoneCode = zoneIdentifier?.split(' ')?.[0]?.trim() || '';
                  
                  if (zoneCode === 'R1' || zoneCode === 'R2') {
                    const maxFSR = 0.8;
                    
                    if (typeof option.currentFSR === 'number') {
                      const difference = maxFSR - option.currentFSR;
                      const changeSymbol = difference > 0 ? '↑' : (difference < 0 ? '↓' : '=');
                      const changeColor = difference > 0 ? '4CAF50' : (difference < 0 ? 'FF3B3B' : '363636');
                      
                      return [
                        { text: `Current: ${current}\n`, options: { color: '363636' } },
                        { text: `New: ${maxFSR.toFixed(2)}\n`, options: { color: '363636', bold: true } },
                        { 
                          text: `${changeSymbol} ${Math.abs(difference).toFixed(2)}`, 
                          options: { color: changeColor, bold: true } 
                        }
                      ];
                    } else {
                      return [
                        { text: `Current: ${current}\n`, options: { color: '363636' } },
                        { text: `New: ${maxFSR.toFixed(2)}`, options: { color: '363636', bold: true } }
                      ];
                    }
                  } else if (zoneCode === 'R3' || zoneCode === 'R4') {
                    const minFSR = 1.5;
                    const maxFSR = 2.2;
                    
                    if (typeof option.currentFSR === 'number') {
                      const avgFSR = (minFSR + maxFSR) / 2;
                      const difference = avgFSR - option.currentFSR;
                      const minDifference = minFSR - option.currentFSR;
                      const maxDifference = maxFSR - option.currentFSR;
                      
                      // Determine if all changes are positive, negative, or mixed
                      const allPositive = minDifference >= 0;
                      const allNegative = maxDifference <= 0;
                      
                      let changeSymbol, changeColor, changeText;
                      
                      if (allPositive) {
                        changeSymbol = '↑';
                        changeColor = '4CAF50';
                        changeText = `${Math.abs(minDifference).toFixed(2)} - ${Math.abs(maxDifference).toFixed(2)}`;
                      } else if (allNegative) {
                        changeSymbol = '↓';
                        changeColor = 'FF3B3B';
                        changeText = `${Math.abs(maxDifference).toFixed(2)} - ${Math.abs(minDifference).toFixed(2)}`;
                      } else {
                        changeSymbol = '↕';
                        changeColor = '363636';
                        changeText = `${minDifference.toFixed(2)} to ${maxDifference.toFixed(2)}`;
                      }
                      
                      return [
                        { text: `Current: ${current}\n`, options: { color: '363636' } },
                        { text: `New: ${minFSR.toFixed(2)} - ${maxFSR.toFixed(2)}\n`, options: { color: '363636', bold: true } },
                        { 
                          text: `${changeSymbol} ${changeText}`, 
                          options: { color: changeColor, bold: true } 
                        }
                      ];
                    } else {
                      return [
                        { text: `Current: ${current}\n`, options: { color: '363636' } },
                        { text: `New: ${minFSR.toFixed(2)} - ${maxFSR.toFixed(2)}`, options: { color: '363636', bold: true } }
                      ];
                    }
                  }
                }
                
                // Standard handling for other housing types
                const potential = option.potentialFSR.toFixed(2);
                
                if (typeof option.currentFSR === 'number') {
                  const difference = option.potentialFSR - option.currentFSR;
                  const changeSymbol = difference > 0 ? '↑' : (difference < 0 ? '↓' : '=');
                  const changeColor = difference > 0 ? '4CAF50' : (difference < 0 ? 'FF3B3B' : '363636');
                  
                  return [
                    { text: `Current: ${current}\n`, options: { color: '363636' } },
                    { text: `New: ${potential}\n`, options: { color: '363636', bold: true } },
                    { 
                      text: `${changeSymbol} ${Math.abs(difference).toFixed(2)}`, 
                      options: { color: changeColor, bold: true } 
                    }
                  ];
                } else {
                  return [
                    { text: `Current: ${current}\n`, options: { color: '363636' } },
                    { text: `New: ${potential}`, options: { color: '363636', bold: true } }
                  ];
                }
              })();
              
              // Format HOB values with comparison
              const hobText = (() => {
                const current = typeof option.currentHOB === 'number' ? option.currentHOB.toFixed(1) + 'm' : 'Unknown';
                
                // Special handling for Residential Flat Buildings
                if (option.type === 'Residential Flat Buildings') {
                  const zoneCode = zoneIdentifier?.split(' ')?.[0]?.trim() || '';
                  
                  if (zoneCode === 'R1' || zoneCode === 'R2') {
                    const maxHOB = 9.5;
                    
                    if (typeof option.currentHOB === 'number') {
                      const difference = maxHOB - option.currentHOB;
                      const changeSymbol = difference > 0 ? '↑' : (difference < 0 ? '↓' : '=');
                      const changeColor = difference > 0 ? '4CAF50' : (difference < 0 ? 'FF3B3B' : '363636');
                      
                      return [
                        { text: `Current: ${current}\n`, options: { color: '363636' } },
                        { text: `New: ${maxHOB.toFixed(1)}m\n`, options: { color: '363636', bold: true } },
                        { 
                          text: `${changeSymbol} ${Math.abs(difference).toFixed(1)}m`, 
                          options: { color: changeColor, bold: true } 
                        }
                      ];
                    } else {
                      return [
                        { text: `Current: ${current}\n`, options: { color: '363636' } },
                        { text: `New: ${maxHOB.toFixed(1)}m`, options: { color: '363636', bold: true } }
                      ];
                    }
                  } else if (zoneCode === 'R3' || zoneCode === 'R4') {
                    const minHOB = 17.5;
                    const maxHOB = 22.0;
                    
                    return [
                      { text: `Current: ${current}\n`, options: { color: '363636' } },
                      { text: `New: ${minHOB.toFixed(1)}m - ${maxHOB.toFixed(1)}m`, options: { color: '363636', bold: true } }
                    ];
                  }
                }
                
                // Standard handling for other housing types
                const potential = option.potentialHOB.toFixed(1) + 'm';
                
                if (typeof option.currentHOB === 'number') {
                  const difference = option.potentialHOB - option.currentHOB;
                  const changeSymbol = difference > 0 ? '↑' : (difference < 0 ? '↓' : '=');
                  const changeColor = difference > 0 ? '4CAF50' : (difference < 0 ? 'FF3B3B' : '363636');
                  
                  return [
                    { text: `Current: ${current}\n`, options: { color: '363636' } },
                    { text: `New: ${potential}\n`, options: { color: '363636', bold: true } },
                    { 
                      text: `${changeSymbol} ${Math.abs(difference).toFixed(1)}m`, 
                      options: { color: changeColor, bold: true } 
                    }
                  ];
                } else {
                  return [
                    { text: `Current: ${current}\n`, options: { color: '363636' } },
                    { text: `New: ${potential}`, options: { color: '363636', bold: true } }
                  ];
                }
              })();
              
              // Create the row
              return [
                { 
                  text: ensureString(option.type), 
                  options: { 
                    color: '363636',
                    fontSize: 8,
                    valign: 'middle',
                    align: 'left'
                  }
                },
                { 
                  text: ensureString(siteRequirements), 
                  options: { 
                    color: '363636',
                    fontSize: 8,
                    valign: 'middle',
                    align: 'left',
                    wrap: true
                  }
                },
                { 
                  text: siteCharacteristics, 
                  options: { 
                    fontSize: 8,
                    valign: 'middle',
                    align: 'left',
                    wrap: true
                  }
                },
                {
                  text: permissibleStatus,
                  options: {
                    color: option.isPermissible ? '4CAF50' : 'FF3B3B',
                    bold: true,
                    fontSize: 10,
                    valign: 'middle',
                    align: 'center'
                  }
                },
                { 
                  text: fsrText, 
                  options: { 
                    fontSize: 8,
                    valign: 'middle',
                    align: 'center'
                  }
                },
                { 
                  text: hobText, 
                  options: { 
                    fontSize: 8,
                    valign: 'middle',
                    align: 'center'
                  }
                }
              ];
            });
            
            // Add proximity notes for residential flat buildings if applicable
            const rfbOption = permissibleOptions.find(option => option.type === 'Residential Flat Buildings');
            if (rfbOption) {
              lmrOptionsRows.push([
                { 
                  text: 'Note: Residential Flat Buildings FSR/HOB Values', 
                  options: { 
                    color: '363636',
                    fontSize: 8,
                    valign: 'middle',
                    align: 'left',
                    bold: true,
                    colspan: 6
                  }
                }
              ]);
              
              // Get zone code
              const zoneCode = zoneIdentifier?.split(' ')?.[0]?.trim() || '';
              
              if (zoneCode === 'R1' || zoneCode === 'R2') {
                lmrOptionsRows.push([
                  { 
                    text: `For R1/R2 zones, Residential Flat Buildings have a max FSR of 0.8:1 and HOB of 9.5m.`, 
                    options: { 
                      color: '363636',
                      fontSize: 8,
                      valign: 'middle',
                      align: 'left',
                      colspan: 6
                    }
                  }
                ]);
              } else if (zoneCode === 'R3' || zoneCode === 'R4') {
                lmrOptionsRows.push([
                  { 
                    text: `For R3/R4 zones, Residential Flat Buildings have max FSR values ranging from 1.5 to 2.2 and HOB values ranging from 17.5m to 22.0m, depending on proximity to stations/centers.`, 
                    options: { 
                      color: '363636',
                      fontSize: 8,
                      valign: 'middle',
                      align: 'left',
                      colspan: 6
                    }
                  }
                ]);
              }
            }
            
            // Combine the title and rows
            const lmrOptionsTableRows = [...lmrOptionsTableTitle, ...lmrOptionsRows];
            
            // Add the LMR options table to the new slide
            lmrSlide.addTable(lmrOptionsTableRows, {
              ...convertCmValues({
                x: '5%',
                y: '18%',
                w: '90%',
                h: '70%'  // Can use more space on the dedicated slide
              }),
              colW: [2.5, 2, 2, 1, 2, 2],  // Adjusted column widths to match the header line width
              rowH: 0.4,  // Slightly increased row height for better readability
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
            
            // Update the text in the original slide to reference the new slide
            const lmrRowIndex = 7; // Index of the LMR Housing Options row in combinedTableRows
            combinedTableRows[lmrRowIndex][1].text = 'See next slide for LMR Development Options details';
          }
        } catch (lmrOptionsError) {
          console.error('Error adding LMR options table:', lmrOptionsError);
        }
        */
      }

      // Add title
      slide.addText([
        { text: properties.formatted_address || 
                (isMultipleProperties && properties.site__multiple_addresses ? 
                formatAddresses(properties.site__multiple_addresses) : 
                properties.site__address), 
          options: { color: styles.title.color } },
        { text: ' ', options: { breakLine: true } },
        { text: `Permissible Uses${totalZones > 1 ? ` - Zone ${index + 1} of ${totalZones}: ${zoneIdentifier}` : ''}`, options: { color: styles.subtitle.color } }
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
      
      // Calculate page number based on index and whether LMR slide is included
      const basePageNumber = 15;
      // Since LMR is disabled, each zone only adds 1 page
      const pageOffset = index; // Each zone adds 1 page now (LMR slides disabled)
      slide.addText(`${basePageNumber + pageOffset}`, convertCmValues(styles.pageNumber));

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
