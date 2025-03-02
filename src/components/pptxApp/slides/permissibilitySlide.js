import { convertCmValues } from '../utils/units';
import { getAllPermissibleHousingTypes } from '../utils/lmrPermissibility';

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

    // Get zone code from the zone identifier - take only the code part before the first space
    const zoneCode = properties.site_suitability__principal_zone_identifier?.split(' ')?.[0]?.trim();
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

      // Try to get EPI Name from property ID first
      let epiName = null;
      if (properties.site__property_id) {
        epiName = await fetchEPINameFromPropertyID(properties.site__property_id);
      }

      // Prepare headers for the permissibility API request
      const headers = {
        'Accept': 'application/json'
      };

      // If we have an EPI Name from the property ID, use it
      if (epiName) {
        headers['EpiName'] = epiName;
      } else {
        // Otherwise fall back to normalized LGA name
        headers['EpiName'] = normalizeLGAName(lgaName);
      }

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

      // Check Low Medium Rise (LMR) housing area status
      let lmrStatus = 'Checking...';
      let isInLMRArea = false; // Track if property is in LMR area

      try {
        // Define a function to check LMR status for a given point using the query endpoint
        const checkLMRStatus = async (longitude, latitude) => {
          console.log('Checking LMR status with coordinates:', { latitude, longitude });
          
          // Use the MapServer export image endpoint instead of query
          const lmrEndpoint = 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer/export';
          
          // Set a small bounding box around the point
          const delta = 0.0001; // Very small area around the point
          const bbox = `${longitude-delta},${latitude-delta},${longitude+delta},${latitude+delta}`;
          
          // Format the params for exporting a map image
          const params = new URLSearchParams({
            bbox: bbox,
            bboxSR: 4326,
            layers: 'show:4', // Only show the LMR layer
            layerDefs: '',
            size: '50,50', // Increased size for better detection
            imageSR: 4326,
            format: 'png',
            transparent: true,
            f: 'json'
          });
          
          // Use the proxy endpoint for the request
          const API_BASE_URL = process.env.NODE_ENV === 'development' 
            ? 'http://localhost:5173'
            : 'https://proxy-server.jameswilliamstrutt.workers.dev';
            
          const lmrResponse = await fetch(`${API_BASE_URL}${process.env.NODE_ENV === 'development' ? '/api/proxy' : ''}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              url: `${lmrEndpoint}?${params.toString()}`,
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            })
          });
          
          const lmrResponseText = await lmrResponse.text();
          console.log('LMR API Raw Response:', lmrResponseText);
          
          try {
            // Parse response
            const lmrData = JSON.parse(lmrResponseText);
            
            // If we have an imageData URL or href (image URL), the service worked
            if (lmrData && (lmrData.imageData || lmrData.href)) {
              // Now we need to check if the image contains non-transparent pixels
              // We'll make a second request to get the actual image data
              const imageUrl = lmrData.imageData || lmrData.href;
              console.log('Using image URL for LMR check:', imageUrl);
              
              const imgResponse = await fetch(`${API_BASE_URL}${process.env.NODE_ENV === 'development' ? '/api/proxy' : ''}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  url: imageUrl,
                  method: 'GET',
                  responseType: 'arraybuffer'
                })
              });
              
              // Get the response as array buffer
              const imgBuffer = await imgResponse.arrayBuffer();
              console.log('Image data size:', imgBuffer.byteLength);
              
              // Check if the image has actual content
              // The ArcGIS server returns a very small transparent image when no features are found
              // We need to check if the image contains any non-transparent pixels
              
              // First, check if we have a valid image response
              const contentType = imgResponse.headers?.get('content-type');
              const hasValidContentType = contentType && contentType.includes('image/');
              
              if (!hasValidContentType) {
                console.log('Invalid content type for image:', contentType);
                return false;
              }
              
              // For PNG images, we can check for the presence of IDAT chunks
              // IDAT chunks contain the actual image data
              // If there are multiple IDAT chunks or large IDAT chunks, the image likely has content
              
              // Convert ArrayBuffer to Uint8Array for easier manipulation
              const imgData = new Uint8Array(imgBuffer);
              
              // Check for PNG signature
              const isPNG = imgData.length >= 8 && 
                imgData[0] === 0x89 && imgData[1] === 0x50 && imgData[2] === 0x4E && 
                imgData[3] === 0x47 && imgData[4] === 0x0D && imgData[5] === 0x0A && 
                imgData[6] === 0x1A && imgData[7] === 0x0A;
              
              if (!isPNG) {
                console.log('Not a PNG image');
                // If not PNG, fall back to size-based detection
                return imgBuffer.byteLength > 100;
              }
              
              // Count IDAT chunks and their total size
              let idatCount = 0;
              let idatTotalSize = 0;
              let pos = 8; // Skip PNG signature
              
              while (pos < imgData.length - 12) { // Need at least 12 bytes for chunk header and CRC
                // Read chunk length (4 bytes)
                const chunkLength = (imgData[pos] << 24) | (imgData[pos+1] << 16) | 
                                   (imgData[pos+2] << 8) | imgData[pos+3];
                pos += 4;
                
                // Read chunk type (4 bytes)
                const chunkType = String.fromCharCode(imgData[pos], imgData[pos+1], 
                                                     imgData[pos+2], imgData[pos+3]);
                pos += 4;
                
                if (chunkType === 'IDAT') {
                  idatCount++;
                  idatTotalSize += chunkLength;
                }
                
                // Skip chunk data and CRC
                pos += chunkLength + 4;
              }
              
              console.log('PNG analysis:', {
                idatCount,
                idatTotalSize
              });
              
              // If we have IDAT chunks with significant size, the image has content
              // Empty/transparent images typically have very small IDAT chunks
              const hasContent = idatCount > 0 && idatTotalSize > 50;
              
              return hasContent;
            }
            
            return false;
          } catch (parseError) {
            console.error('Error parsing LMR response:', parseError);
            return false;
          }
        };

        // Function to check LMR status for a site polygon
        const checkLMRStatusForSite = async (coordinates) => {
          // If we don't have valid coordinates, return false
          if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
            console.log('No valid coordinates provided for LMR check');
            return false;
          }

          // Get the bounding box of the site
          let minLon = Infinity;
          let minLat = Infinity;
          let maxLon = -Infinity;
          let maxLat = -Infinity;

          // Flatten the coordinates if they're in a nested structure
          let points = coordinates;
          if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
            // Handle polygon format: [[[lon, lat], [lon, lat], ...]]
            points = coordinates[0];
          }

          // Calculate the bounding box
          for (const point of points) {
            if (Array.isArray(point) && point.length >= 2) {
              const lon = point[0];
              const lat = point[1];
              
              minLon = Math.min(minLon, lon);
              minLat = Math.min(minLat, lat);
              maxLon = Math.max(maxLon, lon);
              maxLat = Math.max(maxLat, lat);
            }
          }

          // Use exact site boundaries without adding a buffer
          console.log('Site exact bounding box for LMR check:', { minLon, minLat, maxLon, maxLat });

          // Use the MapServer export image endpoint
          const lmrEndpoint = 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer/export';
          
          // Format the params for exporting a map image of the entire site using exact boundaries
          const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
          const params = new URLSearchParams({
            bbox: bbox,
            bboxSR: 4326,
            layers: 'show:4', // Only show the LMR layer
            layerDefs: '',
            size: '200,200', // Larger image for better detection
            imageSR: 4326,
            format: 'png',
            transparent: true,
            f: 'json'
          });
          
          // Use the proxy endpoint for the request
          const API_BASE_URL = process.env.NODE_ENV === 'development' 
            ? 'http://localhost:5173'
            : 'https://proxy-server.jameswilliamstrutt.workers.dev';
            
          const lmrResponse = await fetch(`${API_BASE_URL}${process.env.NODE_ENV === 'development' ? '/api/proxy' : ''}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              url: `${lmrEndpoint}?${params.toString()}`,
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            })
          });
          
          const lmrResponseText = await lmrResponse.text();
          console.log('LMR API Raw Response for site:', lmrResponseText);
          
          try {
            // Parse response
            const lmrData = JSON.parse(lmrResponseText);
            
            // If we have an imageData URL or href (image URL), the service worked
            if (lmrData && (lmrData.imageData || lmrData.href)) {
              // Now we need to check if the image contains non-transparent pixels
              // We'll make a second request to get the actual image data
              const imageUrl = lmrData.imageData || lmrData.href;
              console.log('Using image URL for site LMR check:', imageUrl);
              
              const imgResponse = await fetch(`${API_BASE_URL}${process.env.NODE_ENV === 'development' ? '/api/proxy' : ''}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  url: imageUrl,
                  method: 'GET',
                  responseType: 'arraybuffer'
                })
              });
              
              // Get the response as array buffer
              const imgBuffer = await imgResponse.arrayBuffer();
              console.log('Site image data size:', imgBuffer.byteLength);
              
              // Check if the image has actual content
              // The ArcGIS server returns a very small transparent image when no features are found
              // We need to check if the image contains any non-transparent pixels
              
              // First, check if we have a valid image response
              const contentType = imgResponse.headers?.get('content-type');
              const hasValidContentType = contentType && contentType.includes('image/');
              
              if (!hasValidContentType) {
                console.log('Invalid content type for site image:', contentType);
                return false;
              }
              
              // For PNG images, we can check for the presence of IDAT chunks
              // IDAT chunks contain the actual image data
              // If there are multiple IDAT chunks or large IDAT chunks, the image likely has content
              
              // Convert ArrayBuffer to Uint8Array for easier manipulation
              const imgData = new Uint8Array(imgBuffer);
              
              // Check for PNG signature
              const isPNG = imgData.length >= 8 && 
                imgData[0] === 0x89 && imgData[1] === 0x50 && imgData[2] === 0x4E && 
                imgData[3] === 0x47 && imgData[4] === 0x0D && imgData[5] === 0x0A && 
                imgData[6] === 0x1A && imgData[7] === 0x0A;
              
              if (!isPNG) {
                console.log('Site image is not a PNG');
                // If not PNG, fall back to size-based detection
                return imgBuffer.byteLength > 100;
              }
              
              // Count IDAT chunks and their total size
              let idatCount = 0;
              let idatTotalSize = 0;
              let pos = 8; // Skip PNG signature
              
              while (pos < imgData.length - 12) { // Need at least 12 bytes for chunk header and CRC
                // Read chunk length (4 bytes)
                const chunkLength = (imgData[pos] << 24) | (imgData[pos+1] << 16) | 
                                   (imgData[pos+2] << 8) | imgData[pos+3];
                pos += 4;
                
                // Read chunk type (4 bytes)
                const chunkType = String.fromCharCode(imgData[pos], imgData[pos+1], 
                                                     imgData[pos+2], imgData[pos+3]);
                pos += 4;
                
                if (chunkType === 'IDAT') {
                  idatCount++;
                  idatTotalSize += chunkLength;
                }
                
                // Skip chunk data and CRC
                pos += chunkLength + 4;
              }
              
              console.log('Site PNG analysis:', {
                idatCount,
                idatTotalSize
              });
              
              // If we have IDAT chunks with significant size, the image has content
              // Empty/transparent images typically have very small IDAT chunks
              const hasContent = idatCount > 0 && idatTotalSize > 50;
              
              return hasContent;
            }
            
            return false;
          } catch (parseError) {
            console.error('Error parsing LMR response for site:', parseError);
            return false;
          }
        };

        // First, try using the developable area if available
        if (properties.developableArea && properties.developableArea[0] && 
            properties.developableArea[0].geometry && 
            properties.developableArea[0].geometry.coordinates) {
          
          console.log('Using developable area for LMR check');
          
          // Check LMR status for the entire developable area
          const isInLMRResult = await checkLMRStatusForSite(properties.developableArea[0].geometry.coordinates);
          isInLMRArea = isInLMRResult;
          
          if (isInLMRArea) {
            lmrStatus = '✓ Property is located within a Low Medium Rise (LMR) housing area. Additional development controls apply.';
          } else {
            lmrStatus = '✗ Property is not located within a Low Medium Rise (LMR) housing area.';
          }
        } 
        // If no developable area, try using site geometry
        else if (properties.site__geometry) {
          
          console.log('Using site geometry for LMR check');
          
          // Check LMR status for the entire site geometry
          const isInLMRResult = await checkLMRStatusForSite(properties.site__geometry);
          isInLMRArea = isInLMRResult;
          
          if (isInLMRArea) {
            lmrStatus = '✓ Property is located within a Low Medium Rise (LMR) housing area. Additional development controls apply.';
          } else {
            lmrStatus = '✗ Property is not located within a Low Medium Rise (LMR) housing area.';
          }
        }
        // Finally, fall back to lat/long if available
        else if (properties.site__latitude && properties.site__longitude) {
          console.log('Using site lat/long for LMR check');
          
          // Check LMR status using site coordinates
          const isInLMRResult = await checkLMRStatus(properties.site__longitude, properties.site__latitude);
          isInLMRArea = isInLMRResult;
          
          if (isInLMRArea) {
            lmrStatus = '✓ Property is located within a Low Medium Rise (LMR) housing area. Additional development controls apply.';
          } else {
            lmrStatus = '✗ Property is not located within a Low Medium Rise (LMR) housing area.';
          }
        } else {
          console.log('Missing geometry data for LMR check');
          lmrStatus = 'Cannot determine LMR status: Missing property geometry data';
        }

        // Add isInLMRArea property to be used by the permissibility check
        properties.isInLMRArea = isInLMRArea;
        
        // If property is in LMR area, check what's permissible
        let lmrDevelopmentOptions = [];
        if (isInLMRArea) {
          console.log('Checking LMR development options');
          lmrDevelopmentOptions = await getAllPermissibleHousingTypes(properties);
          console.log('LMR development options:', lmrDevelopmentOptions);
        }
      } catch (lmrError) {
        console.error('Error checking LMR status:', lmrError);
        lmrStatus = `Unable to check LMR status: ${lmrError.message}`;
      }

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
                text: ensureString(properties.site_suitability__principal_zone_identifier || 'Not available'), 
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
        ],
        [
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
            text: ensureString(lmrStatus),
            options: {
              color: lmrStatus.startsWith('✓') ? '4CAF50' : (lmrStatus.startsWith('✗') ? 'FF3B3B' : '363636'),
              fontSize: 8,
              valign: 'middle',
              align: 'left',
              wrap: true
            }
          }
        ],
        [
          { 
            text: 'LMR Housing Options', 
            options: { 
              bold: true,
              color: isInLMRArea ? '0066CC' : '363636',
              fontSize: 8,
              valign: 'middle',
              align: 'left'
            }
          },
          {
            text: isInLMRArea ? 'See LMR Development Options table below for details' : 'Not applicable - Property is not within an LMR area',
            options: {
              color: isInLMRArea ? '0066CC' : '363636',
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
          h: properties.isInLMRArea ? '45%' : '70%'
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
        try {
          // Check again if we have permissible options
          const permissibleOptions = await getAllPermissibleHousingTypes(properties);
          
          if (permissibleOptions.length > 0) {
            // Create a new slide for LMR development options
            const lmrSlide = pptx.addSlide();
            
            // Add title to the new slide
            lmrSlide.addText([
              { text: properties.site__address, options: { color: styles.title.color } },
              { text: ' ', options: { breakLine: true } },
              { text: 'LMR Development Options', options: { color: styles.subtitle.color } }
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

            // Add footer text
            lmrSlide.addText('Property and Development NSW', convertCmValues(styles.footer));
            lmrSlide.addText('16', convertCmValues(styles.pageNumber)); // Increment page number
            
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
                  // Skip the distance requirement for Residential Flat Buildings as we're now using ranges
                  if (option.type === 'Residential Flat Buildings' && key === 'distance') {
                    return null;
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
                
                // Special handling for Residential Flat Buildings to show ranges
                if (option.type === 'Residential Flat Buildings' && option.fsrRange) {
                  const minFSR = option.fsrRange.min.toFixed(2);
                  const maxFSR = option.fsrRange.max.toFixed(2);
                  
                  // If min and max are the same, just show one value
                  const rangeText = minFSR === maxFSR 
                    ? minFSR 
                    : `${minFSR} - ${maxFSR}`;
                  
                  if (typeof option.currentFSR === 'number') {
                    // Calculate difference using the average value for display
                    const avgFSR = (option.fsrRange.min + option.fsrRange.max) / 2;
                    const difference = avgFSR - option.currentFSR;
                    const minDifference = option.fsrRange.min - option.currentFSR;
                    const maxDifference = option.fsrRange.max - option.currentFSR;
                    
                    // Determine if all changes are positive, negative, or mixed
                    const allPositive = minDifference >= 0;
                    const allNegative = maxDifference <= 0;
                    
                    let changeSymbol, changeColor, changeText;
                    
                    if (allPositive) {
                      changeSymbol = '↑';
                      changeColor = '4CAF50';
                      changeText = minFSR === maxFSR 
                        ? `${Math.abs(difference).toFixed(2)}` 
                        : `${Math.abs(minDifference).toFixed(2)} - ${Math.abs(maxDifference).toFixed(2)}`;
                    } else if (allNegative) {
                      changeSymbol = '↓';
                      changeColor = 'FF3B3B';
                      changeText = minFSR === maxFSR 
                        ? `${Math.abs(difference).toFixed(2)}` 
                        : `${Math.abs(maxDifference).toFixed(2)} - ${Math.abs(minDifference).toFixed(2)}`;
                    } else {
                      // Mixed case (some positive, some negative)
                      changeSymbol = '↕';
                      changeColor = '363636';
                      changeText = `${minDifference.toFixed(2)} to ${maxDifference.toFixed(2)}`;
                    }
                    
                    return [
                      { text: `Current: ${current}\n`, options: { color: '363636' } },
                      { text: `New: ${rangeText}\n`, options: { color: '363636', bold: true } },
                      { 
                        text: `${changeSymbol} ${changeText}`, 
                        options: { color: changeColor, bold: true } 
                      }
                    ];
                  } else {
                    return [
                      { text: `Current: ${current}\n`, options: { color: '363636' } },
                      { text: `New: ${rangeText}`, options: { color: '363636', bold: true } }
                    ];
                  }
                } else {
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
                }
              })();
              
              // Format HOB values with comparison
              const hobText = (() => {
                const current = typeof option.currentHOB === 'number' ? option.currentHOB.toFixed(1) + 'm' : 'Unknown';
                
                // Special handling for Residential Flat Buildings to show ranges
                if (option.type === 'Residential Flat Buildings' && option.hobRange) {
                  const minHOB = option.hobRange.min.toFixed(1);
                  const maxHOB = option.hobRange.max.toFixed(1);
                  
                  // If min and max are the same, just show one value
                  const rangeText = minHOB === maxHOB 
                    ? `${minHOB}m` 
                    : `${minHOB}m - ${maxHOB}m`;
                  
                  if (typeof option.currentHOB === 'number') {
                    // Calculate difference using the average value for display
                    const avgHOB = (option.hobRange.min + option.hobRange.max) / 2;
                    const difference = avgHOB - option.currentHOB;
                    const minDifference = option.hobRange.min - option.currentHOB;
                    const maxDifference = option.hobRange.max - option.currentHOB;
                    
                    // Determine if all changes are positive, negative, or mixed
                    const allPositive = minDifference >= 0;
                    const allNegative = maxDifference <= 0;
                    
                    let changeSymbol, changeColor, changeText;
                    
                    if (allPositive) {
                      changeSymbol = '↑';
                      changeColor = '4CAF50';
                      changeText = minHOB === maxHOB 
                        ? `${Math.abs(difference).toFixed(1)}m` 
                        : `${Math.abs(minDifference).toFixed(1)}m - ${Math.abs(maxDifference).toFixed(1)}m`;
                    } else if (allNegative) {
                      changeSymbol = '↓';
                      changeColor = 'FF3B3B';
                      changeText = minHOB === maxHOB 
                        ? `${Math.abs(difference).toFixed(1)}m` 
                        : `${Math.abs(maxDifference).toFixed(1)}m - ${Math.abs(minDifference).toFixed(1)}m`;
                    } else {
                      // Mixed case (some positive, some negative)
                      changeSymbol = '↕';
                      changeColor = '363636';
                      changeText = `${minDifference.toFixed(1)}m to ${maxDifference.toFixed(1)}m`;
                    }
                    
                    return [
                      { text: `Current: ${current}\n`, options: { color: '363636' } },
                      { text: `New: ${rangeText}\n`, options: { color: '363636', bold: true } },
                      { 
                        text: `${changeSymbol} ${changeText}`, 
                        options: { color: changeColor, bold: true } 
                      }
                    ];
                  } else {
                    return [
                      { text: `Current: ${current}\n`, options: { color: '363636' } },
                      { text: `New: ${rangeText}`, options: { color: '363636', bold: true } }
                    ];
                  }
                } else {
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
              const zoneCode = properties.site_suitability__principal_zone_identifier?.split(' ')?.[0]?.trim() || '';
              
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
      }

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