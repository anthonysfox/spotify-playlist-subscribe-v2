import React from "react";

/** Cover art, or the diagonal-stripe placeholder for a playlist with no
 *  artwork yet (a brand-new Apple Music playlist has none until it has tracks). */
export const CoverArt = ({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt?: string;
  className: string;
}) => {
  if (src)
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`${className} object-cover`}
      />
    );
  return <div className={`${className} art-placeholder`} aria-label={alt} />;
};
