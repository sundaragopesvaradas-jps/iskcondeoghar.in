import React, { useEffect } from 'react';

interface ExternalRedirectProps {
  to: string;
}

const ExternalRedirect: React.FC<ExternalRedirectProps> = ({ to }) => {
  useEffect(() => {
    window.location.href = to;
  }, [to]);
  
  return <div>Welcome to Ask Any Questions from Srila Prabhupada's Books</div>;
};

export default ExternalRedirect; 