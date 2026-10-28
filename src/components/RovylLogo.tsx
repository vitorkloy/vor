import React from 'react';

interface RovylLogoProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Rovyl mark: three destinations arranged around a central quick-access hub.
 * The asymmetric upper module and lower diagonal create a subtle abstract “R”.
 */
export const RovylLogo: React.FC<RovylLogoProps> = ({
  size = 512,
  className = '',
  color = '#F4F2ED',
}) => {
  return (
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt=""
      className={className}
      style={{ color }}
      draggable={false}
    />
  );
};
