import { createClient } from '@supabase/supabase-js';
import { getCurrentUserName } from '../auth/tokenUtils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function recordReportGeneration(generationTime, selectedSlides, properties) {
    try {
        const userName = await getCurrentUserName();
        const allSlides = Object.values(selectedSlides).every(Boolean);
        const suburb = properties?.site_suitability__LGA || 'Unknown LGA';

        // Convert milliseconds to seconds before storing
        const timeInSeconds = Math.round(generationTime / 1000);

        const { error } = await supabase
            .from('report_stats')
            .insert([
                {
                    user_name: userName,
                    generation_time: timeInSeconds,
                    all_slides: allSlides,
                    suburb: suburb,
                    timestamp: new Date().toISOString()
                }
            ]);

        if (error) throw error;
    } catch (error) {
        console.error('Error recording report stats:', error);
    }
} 