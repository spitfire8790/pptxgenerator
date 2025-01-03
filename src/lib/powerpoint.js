import pptxgen from "pptxgenjs";
import { saveAs } from 'file-saver';
import { addCoverSlide } from '../components/pptxApp/slides/coverSlide';
import { registerFonts } from '../components/pptxApp/fonts/registerFonts';
import { convertCmValues } from '../components/pptxApp/utils/units';
import { addPropertySnapshotSlide } from '../components/pptxApp/slides/propertySnapshotSlide';
import { addPlanningSlide } from '../components/pptxApp/slides/planningSlide';
import { addPrimarySiteAttributesSlide } from '../components/pptxApp/slides/primarySiteAttributesSlide';
import { addSecondaryAttributesSlide } from '../components/pptxApp/slides/secondaryAttributesSlide';

export async function generateReport(properties, onProgress) {
  try {
    const pptx = new pptxgen();
    let progress = 0;
    
    // Register fonts and setup
    registerFonts(pptx);
    pptx.layout = 'LAYOUT_WIDE';
    pptx.defineSlideMaster({
      title: 'NSW_MASTER',
      background: { color: 'FFFFFF' }
    });

    // Add slides with progress updates
    if (properties.selectedSlides.cover !== false) {
      await addCoverSlide(pptx, properties);
      progress = 20;
      onProgress?.(progress);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.snapshot !== false) {
      await addPropertySnapshotSlide(pptx, properties);
      progress = 40;
      onProgress?.(progress);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.primaryAttributes !== false) {
      await addPrimarySiteAttributesSlide(pptx, properties);
      progress = 60;
      onProgress?.(progress);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.secondaryAttributes !== false) {
      await addSecondaryAttributesSlide(pptx, properties);
      progress = 80;
      onProgress?.(progress);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.planning !== false) {
      await addPlanningSlide(pptx, properties);
      progress = 90;
      onProgress?.(progress);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Generate and save
    const filename = properties.site__address.replace(/[^a-zA-Z0-9]/g, '_');
    await pptx.writeFile({ fileName: `${filename}_desktop_dd_report.pptx` });
    
    progress = 100;
    onProgress?.(progress);
    
    return `${filename}_desktop_dd_report.pptx`;
  } catch (error) {
    console.error('Error generating PowerPoint:', error);
    throw error;
  }
}
