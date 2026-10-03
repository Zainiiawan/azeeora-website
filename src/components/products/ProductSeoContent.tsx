import React from 'react';

export default function ProductSeoContent({ slug }: { slug: string }) {
  if (slug === 'azeeora-beauty-cream') {
    return (
      <div className="mt-16 border-t border-gray-200 pt-16 pb-8">
        <div className="container mx-auto px-4 max-w-4xl prose prose-rose">
          <h2 className="text-3xl font-serif font-bold text-black mb-6">The Best Beauty Cream in Pakistan for Glowing Skin</h2>
          <p className="text-gray-600 mb-6 text-lg">
            Experience the ultimate transformation with <strong>Azeeora Beauty Cream</strong>. Formulated with premium ingredients, this cream targets dark spots, uneven skin tone, and dullness to reveal a radiant, flawless complexion. Whether you are dealing with hyperpigmentation or simply want to enhance your natural glow, our beauty cream is the perfect addition to your daily skincare routine.
          </p>

          <div className="grid md:grid-cols-2 gap-8 my-10">
            <div className="bg-rose-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-black mb-4">Key Benefits</h3>
              <ul className="space-y-3 text-gray-700">
                <li>✨ Brightens and evens out skin tone</li>
                <li>✨ Reduces the appearance of dark spots and blemishes</li>
                <li>✨ Deeply hydrates and nourishes the skin</li>
                <li>✨ Protects against environmental damage</li>
                <li>✨ Leaves a smooth, non-greasy finish</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-black mb-4">Who is it suitable for?</h3>
              <p className="text-gray-700">
                Azeeora Beauty Cream is suitable for all skin types, including dry, oily, combination, and normal skin. It is specially formulated for those looking to combat dullness and achieve a radiant glow without clogging pores.
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-black mb-4">How to Use</h3>
          <ol className="list-decimal pl-5 space-y-2 text-gray-700 mb-10">
            <li>Cleanse your face thoroughly with Azeeora Face Wash.</li>
            <li>Pat dry and apply a small amount of Azeeora Beauty Cream.</li>
            <li>Gently massage into the skin using upward circular motions.</li>
            <li>Use twice daily, morning and night, for best results.</li>
          </ol>

          <h3 className="text-2xl font-bold text-black mb-6">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-lg text-black">Does Azeeora Beauty Cream contain harmful chemicals?</h4>
              <p className="text-gray-600">No, our beauty cream is free from harmful bleaching agents, mercury, and harsh chemicals. We prioritize safe, effective, and ethically sourced ingredients.</p>
            </div>
            <div>
              <h4 className="font-bold text-lg text-black">How long does it take to see results?</h4>
              <p className="text-gray-600">While individual results may vary, most of our customers notice a visible improvement in skin radiance and texture within 2 to 4 weeks of consistent use.</p>
            </div>
            <div>
              <h4 className="font-bold text-lg text-black">Can I use it under makeup?</h4>
              <p className="text-gray-600">Yes! The lightweight, non-greasy formula makes it an excellent hydrating base for your makeup application.</p>
            </div>
          </div>
        </div>

        {/* SEO FAQ Schema for Beauty Cream */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Does Azeeora Beauty Cream contain harmful chemicals?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "No, our beauty cream is free from harmful bleaching agents, mercury, and harsh chemicals. We prioritize safe, effective, and ethically sourced ingredients."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How long does it take to see results?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "While individual results may vary, most of our customers notice a visible improvement in skin radiance and texture within 2 to 4 weeks of consistent use."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can I use it under makeup?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes! The lightweight, non-greasy formula makes it an excellent hydrating base for your makeup application."
                  }
                }
              ]
            })
          }}
        />
      </div>
    );
  }

  if (slug === 'azeeora-radiance-face-wash' || slug === 'azeeora-face-wash') {
    return (
      <div className="mt-16 border-t border-gray-200 pt-16 pb-8">
        <div className="container mx-auto px-4 max-w-4xl prose prose-rose">
          <h2 className="text-3xl font-serif font-bold text-black mb-6">The Best Face Wash for Glowing, Clear Skin</h2>
          <p className="text-gray-600 mb-6 text-lg">
            Start and end your day right with the <strong>Azeeora Radiance Face Wash</strong>. Designed to deeply cleanse without stripping your skin of its natural moisture, this face wash is your first step towards a flawless complexion. It effectively removes dirt, oil, and makeup residue, leaving your face feeling fresh, balanced, and rejuvenated.
          </p>

          <div className="grid md:grid-cols-2 gap-8 my-10">
            <div className="bg-rose-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-black mb-4">Key Benefits</h3>
              <ul className="space-y-3 text-gray-700">
                <li>✨ Deeply cleanses pores and removes impurities</li>
                <li>✨ Balances oil production without overdrying</li>
                <li>✨ Prepares skin for better absorption of serums and creams</li>
                <li>✨ Soothes irritation and calms redness</li>
                <li>✨ Promotes a naturally radiant complexion</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-black mb-4">Who is it suitable for?</h3>
              <p className="text-gray-700">
                This face wash is ideal for all skin types, including sensitive and acne-prone skin. Its gentle formulation ensures a thorough clean without compromising your delicate skin barrier.
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-black mb-4">How to Use</h3>
          <ol className="list-decimal pl-5 space-y-2 text-gray-700 mb-10">
            <li>Dampen your face with lukewarm water.</li>
            <li>Take a small amount of Azeeora Radiance Face Wash and work into a lather.</li>
            <li>Gently massage onto your face in circular motions for 30-60 seconds.</li>
            <li>Rinse thoroughly and pat dry with a clean towel. Follow with your favorite Azeeora serum.</li>
          </ol>
        </div>
      </div>
    );
  }

  return null;
}
