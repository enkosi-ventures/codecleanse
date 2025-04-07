import ReactGA from 'react-ga4';

export const initGA = () => {
  console.log('Initializing Google Analytics');
  console.log('Mode:', import.meta.env.MODE);
  if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
    console.warn('Google Analytics Measurement ID is not set');
    return;
  }
  ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID, {
    testMode: import.meta.env.MODE !== 'production',
  });
};

export const trackPageView = (page: any) => {
  ReactGA.send({ hitType: 'pageview', page });
};
