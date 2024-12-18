import pptxgen from "pptxgenjs";
import { addCoverSlide } from '../components/pptxApp/slides/coverSlide';
import { registerFonts } from '../components/pptxApp/fonts/registerFonts';
import { convertCmValues } from '../components/pptxApp/utils/units';

export async function generateReport(properties) {
  try {
    const pptx = new pptxgen();
    
    // Register fonts
    registerFonts(pptx);
    
    // Set default layout to 16:9
    pptx.layout = 'LAYOUT_16x9';

    // Add NSW Government logo
    pptx.defineSlideMaster({
      title: 'NSW_MASTER',
      background: { color: 'FFFFFF' }
    });

    // Add slides based on selection
    if (properties.selectedSlides.cover !== false) {
      addCoverSlide(pptx, properties);
    }

    // Save the presentation
    const filename = `${properties.site__address.replace(/[^a-zA-Z0-9]/g, '_')}_report.pptx`;
    await pptx.writeFile({ fileName: filename });
    return filename;
  } catch (error) {
    console.error('Error generating PowerPoint:', error);
    throw error;
  }
}
