const styles = {
  title: {
    x: '5%',
    y: '5%',
    w: '90%',
    h: '10%',
    fontSize: 24,
    color: '002664',
    bold: true
  },
  section: {
    x: '5%',
    w: '90%',
    h: '10%',
    fontSize: 16,
    color: '363636'
  },
  value: {
    x: '5%',
    w: '90%',
    h: '5%',
    fontSize: 14,
    color: '666666'
  }
};

export function addOverviewSlide(pptx, properties) {
  const slide = pptx.addSlide({ masterName: 'NSW_MASTER' });
  
  // Add title
  slide.addText("Property Overview", styles.title);

  // Add property details
  let currentY = '20%';

  // Address
  slide.addText("Address", { ...styles.section, y: currentY });
  currentY = '25%';
  slide.addText(properties.site__address, { ...styles.value, y: currentY });
  
  // Lot Details
  currentY = '35%';
  slide.addText("Legal Description", { ...styles.section, y: currentY });
  currentY = '40%';
  slide.addText(`Lot ${properties.site__related_lot_references}`, { ...styles.value, y: currentY });

  // Area
  currentY = '50%';
  slide.addText("Site Area", { ...styles.section, y: currentY });
  currentY = '55%';
  slide.addText(`${properties.site_suitability__area} m²`, { ...styles.value, y: currentY });

  // Zoning
  currentY = '65%';
  slide.addText("Zoning", { ...styles.section, y: currentY });
  currentY = '70%';
  slide.addText(properties.site_suitability__landzone || 'Not specified', { ...styles.value, y: currentY });
} 