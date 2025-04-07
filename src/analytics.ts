import ReactGA from 'react-ga4';

// Type guard to check if the environment variable is a non-empty string
function isValidMeasurementId(id: unknown): id is string {
    return typeof id === 'string' && id.trim() !== '' && id.startsWith('G-'); // Basic format check
}

// Get the Measurement ID and check its type
const GA_MEASUREMENT_ID: unknown = import.meta.env.VITE_GA_MEASUREMENT_ID;
let isGaInitialized = false; // Flag to track initialization status

export const initGA = () => {
  // Prevent multiple initializations
  if (isGaInitialized) {
    // console.log('Google Analytics already initialized.'); // Keep quiet after first init
    return;
  }

  console.log('Attempting to initialize Google Analytics...');
  console.log('Mode:', import.meta.env.MODE);

  // Use the type guard to ensure the ID is a valid string
  if (isValidMeasurementId(GA_MEASUREMENT_ID)) {
    console.log(`Initializing Google Analytics with ID: ${GA_MEASUREMENT_ID}`);
    try {
        ReactGA.initialize(GA_MEASUREMENT_ID, {
          testMode: import.meta.env.MODE !== 'production',
        });
        isGaInitialized = true; // Set flag
        console.log('Google Analytics Initialized.');

        // Send initial pageview ONCE upon successful initialization
        const initialPath = window.location.pathname + window.location.search;
        console.log(`Tracking initial pageview for: ${initialPath}`);
        ReactGA.send({ hitType: 'pageview', page: initialPath });

    } catch (error: unknown) {
         console.error('Error initializing Google Analytics:', error);
         isGaInitialized = false; // Ensure flag is false if init fails
    }
  } else {
    console.warn('Google Analytics Measurement ID (VITE_GA_MEASUREMENT_ID) is not set or invalid. GA not initialized.');
    isGaInitialized = false;
  }
};

/**
 * Tracks a custom event. Important for SPA engagement tracking.
 * @param args - Event parameters (category, action, label, etc.)
 */
export const trackEvent = (args: { category: string; action: string; label?: string; value?: number; nonInteraction?: boolean; transport?: 'beacon' | 'xhr' | 'image'; }) => {
    if (!isGaInitialized) {
       return; // Don't send events if not initialized
   }
   console.log(`Tracking GA Event: Category=${args.category}, Action=${args.action}, Label=${args.label ?? 'N/A'}`);
   // Ensure required fields are present
   if (!args.category || !args.action) {
       console.error("GA Event Tracking Error: 'category' and 'action' are required.");
       return;
   }
   ReactGA.event(args);
}

export const getGaStatus = (): boolean => isGaInitialized;
