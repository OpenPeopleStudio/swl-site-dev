/**
 * JSON-LD Structured Data Utilities
 * 
 * Functions to generate JSON-LD structured data for breadcrumbs and updates
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snowwhitelaundry.co";

export type BreadcrumbMeta = {
  title: string;
  slug: string;
  category: string;
  createdAt: string;
  createdBy: string;
  keywords: string[];
  summary: string;
};

export type UpdateMeta = {
  title: string;
  slug: string;
  date: string;
  category: string;
  keywords: string[];
};

export function generateBreadcrumbJSONLD(meta: BreadcrumbMeta): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.summary,
    author: {
      "@type": "Organization",
      name: "Snow White Laundry",
    },
    publisher: {
      "@type": "Organization",
      name: "Snow White Laundry",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
      },
    },
    datePublished: meta.createdAt,
    dateModified: meta.createdAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/overshare/${meta.slug}`,
    },
    keywords: meta.keywords.join(", "),
    about: {
      "@type": "Thing",
      name: meta.category,
    },
    mentions: [
      {
        "@type": "Place",
        name: "St. John's, Newfoundland",
        address: {
          "@type": "PostalAddress",
          addressLocality: "St. John's",
          addressRegion: "Newfoundland and Labrador",
          addressCountry: "CA",
        },
      },
    ],
    isPartOf: {
      "@type": "WebSite",
      name: "Snow White Laundry Overshare",
      url: `${BASE_URL}/overshare`,
    },
  };
}

export function generateUpdateJSONLD(meta: UpdateMeta): object {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: meta.title,
    author: {
      "@type": "Organization",
      name: "Snow White Laundry",
    },
    publisher: {
      "@type": "Organization",
      name: "Snow White Laundry",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
      },
    },
    datePublished: meta.date,
    dateModified: meta.date,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/updates/${meta.slug}`,
    },
    keywords: meta.keywords.join(", "),
    articleSection: meta.category,
    isPartOf: {
      "@type": "WebSite",
      name: "Snow White Laundry Overshare",
      url: `${BASE_URL}/overshare`,
    },
  };
}

export function generateRestaurantJSONLD(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Snow White Laundry",
    image: `${BASE_URL}/og-image.jpg`,
    description: "A restaurant in St. John's, Newfoundland, where intention, emotion, and craft converge to create thoughtful dining experiences.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "St. John's",
      addressRegion: "Newfoundland and Labrador",
      addressCountry: "CA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "47.5615",
      longitude: "-52.7126",
    },
    servesCuisine: "Contemporary Newfoundland",
    priceRange: "$$$",
    openingHours: "Mo-Sa 17:00-23:00",
    openingDate: "2026-05",
    acceptsReservations: true,
    menu: `${BASE_URL}/menu`,
  };
}

export function generateContactPageJSONLD(): object {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact",
    description: "Contact Snow White Laundry",
    url: `${BASE_URL}/contact`,
    mainEntity: {
      "@type": "Restaurant",
      name: "Snow White Laundry",
      address: {
        "@type": "PostalAddress",
        addressLocality: "St. John's",
        addressRegion: "Newfoundland and Labrador",
        addressCountry: "CA",
      },
    },
  };
}

export function generateComingSoonJSONLD(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Snow White Laundry",
    description: "Opening 2026 in St. John's, Newfoundland",
    address: {
      "@type": "PostalAddress",
      addressLocality: "St. John's",
      addressRegion: "Newfoundland and Labrador",
      addressCountry: "CA",
    },
    openingDate: "2026",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "17:00",
      closes: "23:00",
    },
  };
}
