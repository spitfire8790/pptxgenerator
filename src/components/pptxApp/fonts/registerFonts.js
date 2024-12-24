export function registerFonts(pptx) {
  // Set Public Sans Light as the default font for the presentation
  pptx.theme = {
    headFontFace: 'Public Sans',
    bodyFontFace: 'Public Sans',
    fonts: [
      {
        name: 'Public Sans',
        data: 'https://fonts.gstatic.com/s/publicsans/v14/ijwRs572Xtc6ZYQws9YVwnNIfJ7Cww.woff2',
        type: 'light'
      },
      {
        name: 'Public Sans',
        data: 'https://fonts.gstatic.com/s/publicsans/v14/ijwGs572Xtc6ZYQws9YVwllKVG8qX1oyOymuFpmJygco.woff2',
        type: 'bold'
      }
    ]
  };

  // Set default font properties
  pptx.defaultTextOpts = {
    fontFace: 'Public Sans',
    fontSize: 10,
    color: '363636'
  };
} 