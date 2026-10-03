import React from 'react';

export default function CategorySeoContent({ slug }: { slug: string }) {
  if (slug === 'face-wash') {
    return (
      <div className="mt-16 border-t border-gray-200 pt-16 pb-8 bg-gray-50 rounded-xl px-4 md:px-8">
        <div className="container mx-auto max-w-4xl prose prose-rose">
          <h2 className="text-3xl font-serif font-bold text-black mb-6">Best Face Wash for Oily & Acne-Prone Skin in Pakistan</h2>
          <p className="text-gray-600 mb-6 text-lg">
            Finding the right cleanser is the most critical step in any skincare routine, especially if you struggle with oily, acne-prone, or sensitive skin. Our collection of premium face washes is expertly formulated to gently purify your skin, remove excess sebum, and unclog pores without causing dryness or irritation.
          </p>

          <h3 className="text-2xl font-bold text-black mb-4">Why Choose Azeeora Face Washes?</h3>
          <p className="text-gray-700 mb-6">
            Unlike harsh, stripping cleansers that damage your moisture barrier, Azeeora face washes are balanced to maintain your skin's natural pH. Whether you need a daily gentle cleanser or a targeted acne-control wash, our products contain soothing botanical extracts and active ingredients that leave your skin feeling fresh and radiant.
          </p>

          <h3 className="text-2xl font-bold text-black mb-6">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-lg text-black">Which face wash is best for acne-prone skin?</h4>
              <p className="text-gray-600">For acne-prone skin, we recommend our specialized acne control formulas that contain ingredients to unclog pores and reduce inflammation without overdrying.</p>
            </div>
            <div>
              <h4 className="font-bold text-lg text-black">Should I use face wash twice a day?</h4>
              <p className="text-gray-600">Yes, dermatologists generally recommend washing your face twice daily—once in the morning to remove overnight oils, and once at night to cleanse away makeup, dirt, and pollution.</p>
            </div>
            <div>
              <h4 className="font-bold text-lg text-black">Does face wash remove dark spots?</h4>
              <p className="text-gray-600">While a face wash primarily cleanses the skin, formulas containing brightening ingredients (like Vitamin C or Niacinamide) can help gradually fade dark spots when used as part of a complete skincare routine.</p>
            </div>
          </div>
        </div>

        {/* SEO FAQ Schema for Face Wash Category */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Which face wash is best for acne-prone skin?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "For acne-prone skin, we recommend our specialized acne control formulas that contain ingredients to unclog pores and reduce inflammation without overdrying."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Should I use face wash twice a day?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, dermatologists generally recommend washing your face twice daily—once in the morning to remove overnight oils, and once at night to cleanse away makeup, dirt, and pollution."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Does face wash remove dark spots?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "While a face wash primarily cleanses the skin, formulas containing brightening ingredients (like Vitamin C or Niacinamide) can help gradually fade dark spots when used as part of a complete skincare routine."
                  }
                }
              ]
            })
          }}
        />
      </div>
    );
  }

  return null;
}
