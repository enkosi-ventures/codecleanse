import React from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { trackEvent } from '../analytics';
import { 
  AD_PROMO_URL, AD_IMAGE_SRC, AD_IMAGE_ALT,
  AD_EVENT_CATEGORY, AD_EVENT_ACTION, AD_EVENT_LABEL
} from '../constants';


const AdBanner = ({ style = {} }: { style?: React.CSSProperties }) => {
  const handleAdClick = () => {
    trackEvent({
        category: AD_EVENT_CATEGORY,
        action: AD_EVENT_ACTION,
        label: AD_EVENT_LABEL,
        // Help ensure the event is sent before the user navigates away,
        // especially on mobile.
        transport: 'beacon',
    });
    console.log(`Ad Click Tracked: ${AD_EVENT_LABEL}`);
  };

  return (
    <Box
      sx={{
        width: '100%',
        mt: 2,
        mb: 1,
        textAlign: 'center',
        lineHeight: 0,
        ...style,
      }}
      className="internal-ad-banner"
    >
      <Typography variant="caption" display="block" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.65rem' }}>
        Also by Enkosi Ventures:
      </Typography>
      <Link
        href={AD_PROMO_URL}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ display: 'inline-block', lineHeight: 0 }}
        aria-label={AD_IMAGE_ALT}
        onClick={handleAdClick}
      >
        <img
          src={AD_IMAGE_SRC}
          alt={AD_IMAGE_ALT}
          style={{
            maxWidth: '100%',
            height: 'auto',
            maxHeight: '90px',
            display: 'block',
            border: '1px solid #aaa',
          }}
        />
      </Link>
    </Box>
  );
};

export default AdBanner;