import pptxgen from "pptxgenjs";
import { saveAs } from 'file-saver';
import { addCoverSlide } from '../components/pptxApp/slides/coverSlide';
import { registerFonts } from '../components/pptxApp/fonts/registerFonts';
import { convertCmValues } from '../components/pptxApp/utils/units';
import { addPropertySnapshotSlide } from '../components/pptxApp/slides/propertySnapshotSlide';
import { addPlanningSlide } from '../components/pptxApp/slides/planningSlide';

export async function generateReport(properties) {
  try {
    const pptx = new pptxgen();
    
    // Register fonts
    registerFonts(pptx);
    
    // Set default layout to WIDE
    pptx.layout = 'LAYOUT_WIDE';

    // Add NSW Government logo
    pptx.defineSlideMaster({
      title: 'NSW_MASTER',
      background: { color: 'FFFFFF' }
    });

    // Add slides based on selection
    if (properties.selectedSlides.cover !== false) {
      addCoverSlide(pptx, properties);
    }
    if (properties.selectedSlides.snapshot !== false) {
      addPropertySnapshotSlide(pptx, properties);
    }
    if (properties.selectedSlides.planning !== false) {
      addPlanningSlide(pptx, properties);
    }

    // Generate and save PowerPoint directly
    const filename = properties.site__address.replace(/[^a-zA-Z0-9]/g, '_');
    await pptx.writeFile({ fileName: `${filename}_desktop_dd_report.pptx` });
    
    return `${filename}_desktop_dd_report.pptx`;
  } catch (error) {
    console.error('Error generating PowerPoint:', error);
    throw error;
  }
}
