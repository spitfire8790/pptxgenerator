import pptxgen from "pptxgenjs";
import { saveAs } from 'file-saver';
import { addCoverSlide } from '../components/pptxApp/slides/coverSlide';
import { registerFonts } from '../components/pptxApp/fonts/registerFonts';
import { convertCmValues } from '../components/pptxApp/utils/units';
import { addPropertySnapshotSlide } from '../components/pptxApp/slides/propertySnapshotSlide';
import { addPlanningSlide } from '../components/pptxApp/slides/planningSlide';
import { addPrimarySiteAttributesSlide } from '../components/pptxApp/slides/primarySiteAttributesSlide';
import { addSecondaryAttributesSlide } from '../components/pptxApp/slides/secondaryAttributesSlide';
import { addPlanningSlide2 } from '../components/pptxApp/slides/planningSlide2';
import { addServicingSlide } from '../components/pptxApp/slides/servicingSlide';
import { addUtilisationSlide } from '../components/pptxApp/slides/utilisationSlide';
import { addAccessSlide } from '../components/pptxApp/slides/accessSlide';
import { addHazardsSlide } from '../components/pptxApp/slides/hazardsSlide';

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

    if (properties.selectedSlides.planning2 !== false) {
      await addPlanningSlide2(pptx, properties);
      progress = 95;
      onProgress?.(progress);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.servicing !== false) {
      await addServicingSlide(pptx, properties);
      progress = 98;
      onProgress?.(progress);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.utilisation !== false) {
      await addUtilisationSlide(pptx, properties);
      progress = 90;
      onProgress?.(progress);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.access !== false) {
      await addAccessSlide(pptx, properties);
      progress = 95;
      onProgress?.(progress);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.hazards !== false) {
      await addHazardsSlide(pptx, properties);
      progress = 98;
      onProgress?.(progress);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Generate and save
    const filename = properties.site__address.replace(/[^a-zA-Z0-9]/g, '_');
    await pptx.writeFile({ fileName: `${filename}_Desktop_DD_Report.pptx` });
    
    progress = 100;
    onProgress?.(progress);
    
    return `${filename}_Desktop_DD_Report.pptx`;
  } catch (error) {
    console.error('Error generating PowerPoint:', error);
    throw error;
  }
}
