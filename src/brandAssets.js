const googleFavicon = domain => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`

export const BRAND_ASSETS = {
  'Amazon Pay': { domain: 'amazon.in', logo: googleFavicon('amazon.in') },
  Goibibo: { domain: 'goibibo.com', logo: googleFavicon('goibibo.com') },
  MakeMyTrip: { domain: 'makemytrip.com', logo: googleFavicon('makemytrip.com') },
  AJIO: { domain: 'ajio.com', logo: googleFavicon('ajio.com') },
  Cleartrip: { domain: 'cleartrip.com', logo: googleFavicon('cleartrip.com') },
  Swiggy: { domain: 'swiggy.com', logo: googleFavicon('swiggy.com') },
  Zomato: { domain: 'zomato.com', logo: googleFavicon('zomato.com') },
  'Max Fashion': { domain: 'maxfashion.in', logo: googleFavicon('maxfashion.in') },
  Uber: { domain: 'uber.com', logo: googleFavicon('uber.com') },
  Decathlon: { domain: 'decathlon.in', logo: googleFavicon('decathlon.in') },
  Croma: { domain: 'croma.com', logo: googleFavicon('croma.com') },
  'Kalyan Jewellers': { domain: 'kalyanjewellers.net', logo: googleFavicon('kalyanjewellers.net') },
  Myntra: { domain: 'myntra.com', logo: googleFavicon('myntra.com') },
  Amazon: { domain: 'amazon.in', logo: googleFavicon('amazon.in') },
  Flipkart: { domain: 'flipkart.com', logo: googleFavicon('flipkart.com') },
  Nykaa: { domain: 'nykaa.com', logo: googleFavicon('nykaa.com') },
  "Domino's": { domain: 'dominos.co.in', logo: googleFavicon('dominos.co.in') },
  'PVR INOX': { domain: 'pvrcinemas.com', logo: googleFavicon('pvrcinemas.com') },
  'Reliance Digital': { domain: 'reliancedigital.in', logo: googleFavicon('reliancedigital.in') },
  Tanishq: { domain: 'tanishq.co.in', logo: googleFavicon('tanishq.co.in') },
  Starbucks: { domain: 'starbucks.in', logo: googleFavicon('starbucks.in') },
  BookMyShow: { domain: 'bookmyshow.com', logo: googleFavicon('bookmyshow.com') },
  Lifestyle: { domain: 'lifestylestores.com', logo: googleFavicon('lifestylestores.com') },
  'Shoppers Stop': { domain: 'shoppersstop.com', logo: googleFavicon('shoppersstop.com') },
  'Tata CLiQ': { domain: 'tatacliq.com', logo: googleFavicon('tatacliq.com') },
}

export function getBrandAsset(name) {
  return BRAND_ASSETS[name] || { domain: '', logo: '' }
}
