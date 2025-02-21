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
import { addContaminationSlide } from '../components/pptxApp/slides/contaminationSlide';
import { addEnviroSlide } from '../components/pptxApp/slides/enviroSlide';
import { createScoringSlide } from '../components/pptxApp/slides/scoringSlide';
import { addContextSlide } from '../components/pptxApp/slides/contextSlide';
import { addPermissibilitySlide } from '../components/pptxApp/slides/permissibilitySlide';
import { addDevelopmentSlide } from '../components/pptxApp/slides/developmentSlide';

export async function generateReport(properties, onProgress) {
  try {
    const pptx = new pptxgen();
    
    // Calculate total number of selected slides
    const selectedSlideCount = Object.values(properties.selectedSlides)
      .filter(Boolean).length;
    
    let completedSlides = 0;
    
    // Function to update progress based on completed slides
    const updateProgress = () => {
      completedSlides++;
      const progress = Math.round((completedSlides / selectedSlideCount) * 100);
      onProgress?.(progress);
    };
    
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
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.snapshot !== false) {
      await addPropertySnapshotSlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.primaryAttributes !== false) {
      await addPrimarySiteAttributesSlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.secondaryAttributes !== false) {
      await addSecondaryAttributesSlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.planning !== false) {
      await addPlanningSlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.planningTwo !== false) {
      await addPlanningSlide2(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.servicing !== false) {
      await addServicingSlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.utilisation !== false) {
      await addUtilisationSlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.access !== false) {
      await addAccessSlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.hazards !== false) {
      await addHazardsSlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.environmental !== false) {
      await addEnviroSlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.contamination !== false) {
      await addContaminationSlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.scoring !== false) {
      await createScoringSlide(pptx, properties, properties.developableArea);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.context !== false) {
      await addContextSlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.permissibility !== false) {
      await addPermissibilitySlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (properties.selectedSlides.development !== false) {
      await addDevelopmentSlide(pptx, properties);
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Generate and save
    const filename = properties.site__address.replace(/[^a-zA-Z0-9]/g, '_');
    await pptx.writeFile({ fileName: `${filename}_Desktop_DD_Report.pptx` });
    
    // Ensure we show 100% at the end
    onProgress?.(100);
    
    return `${filename}_Desktop_DD_Report.pptx`;
  } catch (error) {
    console.error('Error generating PowerPoint:', error);
    throw error;
  }
}
