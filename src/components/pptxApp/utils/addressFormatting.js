/**
 * Utility functions for formatting addresses
 */

/**
 * Formats an array of addresses into a single string, combining consecutive numbers
 * and handling multiple addresses with the same street name.
 * 
 * @param {string[]} addresses - Array of address strings to format
 * @returns {string} Formatted address string
 */
export const formatAddresses = (addresses) => {
  if (!addresses || addresses.length === 0) return '';
  if (addresses.length === 1) return addresses[0];

  // Define all possible street types
  const streetTypes = [
    'street', 'st',
    'road', 'rd',
    'avenue', 'ave',
    'drive', 'dr',
    'parade', 'pde',
    'lane', 'ln',
    'way',
    'close', 'cl',
    'circuit', 'cct',
    'crescent', 'cres',
    'court', 'ct',
    'place', 'pl',
    'boulevard', 'blvd',
    'highway', 'hwy',
    'terrace', 'tce',
    'grove', 'gr',
    'square', 'sq',
    'parkway', 'pwy',
    'esplanade', 'esp',
    'walk',
    'rise',
    'trail', 'trl',
    'loop',
    'alley',
    'view',
    'ridge',
    'mews',
    'plaza',
    'promenade', 'prom',
    'quay',
    'gardens', 'gdns',
    'track', 'trk',
    'bypass',
    'circle',
    'concourse',
    'glade',
    'green',
    'mall'
  ];

  // Split each address into parts
  const addressParts = addresses.map(addr => {
    const parts = addr.split(' ');
    const postcode = parts[parts.length - 1];
    
    // Find where the street name ends and suburb begins
    let streetEnd = 0;
    for (let i = 0; i < parts.length - 1; i++) {
      if (streetTypes.includes(parts[i].toLowerCase())) {
        streetEnd = i;
        break;
      }
    }
    
    // Everything after street type (but before postcode) is suburb
    const suburb = parts.slice(streetEnd + 1, -1).join(' ');
    const streetParts = parts.slice(0, streetEnd + 1);
    
    // Check if first part is a number
    const hasNumber = /^\d+$/.test(streetParts[0]);
    
    return {
      hasNumber,
      streetNumber: hasNumber ? parseInt(streetParts[0], 10) : null,
      streetName: hasNumber ? streetParts.slice(1).join(' ') : streetParts.join(' '),
      suburb,
      postcode,
      fullStreetAddress: streetParts.join(' ')
    };
  });

  // Separate addresses with and without numbers
  const withNumbers = addressParts.filter(part => part.hasNumber);
  const withoutNumbers = addressParts.filter(part => !part.hasNumber);

  // Group addresses with numbers by street name and suburb
  const groupedAddresses = withNumbers.reduce((acc, curr) => {
    const key = `${curr.streetName}|${curr.suburb}|${curr.postcode}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {});

  // Process each group of numbered addresses
  const processedGroups = Object.entries(groupedAddresses).map(([key, group]) => {
    const [streetName, suburb, postcode] = key.split('|');
    
    // Sort by street number
    group.sort((a, b) => a.streetNumber - b.streetNumber);
    
    // Find consecutive ranges
    const ranges = [];
    let range = [group[0]];
    
    for (let i = 1; i < group.length; i++) {
      if (group[i].streetNumber === group[i-1].streetNumber + 2) {
        // Skip even numbers in the range
        range.push(group[i]);
      } else if (group[i].streetNumber === group[i-1].streetNumber + 1) {
        range.push(group[i]);
      } else {
        ranges.push(range);
        range = [group[i]];
      }
    }
    ranges.push(range);

    // Format each range
    const formattedRanges = ranges.map(range => {
      if (range.length === 1) {
        return range[0].streetNumber.toString();
      } else if (range.length === 2) {
        return `${range[0].streetNumber}, ${range[1].streetNumber}`;
      } else {
        return `${range[0].streetNumber}-${range[range.length-1].streetNumber}`;
      }
    });

    return {
      streetNumbers: formattedRanges.join(', '),
      streetName,
      suburb,
      postcode,
      formattedAddress: `${formattedRanges.join(', ')} ${streetName}`
    };
  });

  // Format addresses without numbers
  const unnumberedAddresses = withoutNumbers.map(addr => ({
    formattedAddress: addr.streetName,
    suburb: addr.suburb,
    postcode: addr.postcode
  }));

  // Combine all processed addresses
  const allProcessedAddresses = [...processedGroups, ...unnumberedAddresses];

  // Check if all addresses share the same suburb and postcode
  const allSameLocation = allProcessedAddresses.every(addr => 
    addr.suburb === allProcessedAddresses[0].suburb && 
    addr.postcode === allProcessedAddresses[0].postcode
  );

  if (allSameLocation) {
    // If same suburb/postcode, combine street addresses
    const streetAddresses = allProcessedAddresses
      .map(addr => addr.formattedAddress)
      .join(' and ');
    return `${streetAddresses}, ${allProcessedAddresses[0].suburb} ${allProcessedAddresses[0].postcode}`;
  } else {
    // If different suburbs, format each address separately
    return allProcessedAddresses
      .map(addr => `${addr.formattedAddress}, ${addr.suburb} ${addr.postcode}`)
      .join(' and ');
  }
}; 