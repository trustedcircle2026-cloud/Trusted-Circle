const googleFavicon = domain => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`

export const BRAND_ASSETS = {
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
}

export function getBrandAsset(name) {
  return BRAND_ASSETS[name] || { domain: '', logo: '' }
}
