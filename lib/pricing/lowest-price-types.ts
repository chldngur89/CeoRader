export type PricingLowestInput = {
  productName?: string;
  productUrl?: string;
  category?: string;
};

export type PricingLowestOffer = {
  id: string;
  name: string;
  price: number;
  currency: string;
  shop: string;
  url: string;
  image: string;
  inStock: boolean;
  isLowest: boolean;
};

export type PricingLowestResult = {
  taskType: "pricing.lowest";
  taskVersion: string;
  input: {
    productName?: string;
    productUrl?: string;
    category?: string;
  };
  queryUsed?: string;
  offers: PricingLowestOffer[];
  lowestPrice: number | null;
  lowestOffer: PricingLowestOffer | null;
  collectedAt: string;
  currency: string;
  source: string;
};

export type PricingLowestResponse = {
  success: boolean;
  data?: PricingLowestResult;
  error?: string;
};
