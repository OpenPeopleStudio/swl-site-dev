"use client";

import Script from "next/script";
import { generateRestaurantJSONLD, generateContactPageJSONLD, generateComingSoonJSONLD } from "./jsonld";

export function RestaurantSchema() {
  return (
    <Script
      id="restaurant-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(generateRestaurantJSONLD()),
      }}
    />
  );
}

export function ContactPageSchema() {
  return (
    <Script
      id="contact-page-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(generateContactPageJSONLD()),
      }}
    />
  );
}

export function ComingSoonSchema() {
  return (
    <Script
      id="coming-soon-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(generateComingSoonJSONLD()),
      }}
    />
  );
}
