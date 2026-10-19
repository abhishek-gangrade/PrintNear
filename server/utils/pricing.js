/**
 * Authoritative Pricing Service for Printania
 * Calculates exact quotes based on shop tariffs, paper formats, duplex factors, and discounts.
 */

export const COUPON_CATALOG = {
  CAMPUS10: { type: 'percent', value: 10, minOrder: 20, description: '10% off on campus orders above ₹20' },
  PRINT5: { type: 'flat', value: 5, minOrder: 15, description: 'Flat ₹5 off on orders above ₹15' },
  PRINTANIA20: { type: 'percent', value: 20, minOrder: 50, description: '20% off welcome discount above ₹50' }
};

export const PAPER_SIZE_MULTIPLIERS = {
  A4: 1.0,
  Letter: 1.0,
  Legal: 1.2,
  A3: 1.8
};

export const calculateAuthoritativeQuote = ({
  shopPricing = {},
  pages = 1,
  copies = 1,
  colorType = 'B&W',
  printSides = 'Single',
  paperSize = 'A4',
  binding = 'None',
  couponCode = ''
}) => {
  const numPages = Math.max(1, parseInt(pages, 10) || 1);
  const numCopies = Math.max(1, parseInt(copies, 10) || 1);
  const totalImpressions = numPages * numCopies;

  // 1. Determine base page rate from shop pricing
  const bwRate = Number(shopPricing.bwPerPage) || 3;
  const colorRate = Number(shopPricing.colorPerPage) || 10;
  const baseRate = colorType === 'Color' ? colorRate : bwRate;

  // 2. Paper size adjustment
  const sizeMultiplier = PAPER_SIZE_MULTIPLIERS[paperSize] || 1.0;
  const adjustedPageRate = baseRate * sizeMultiplier;

  // 3. Duplex (Double-Sided) Adjustment
  // In duplex printing, fewer physical paper sheets are consumed
  const duplexDiscountPercent = Number(shopPricing.duplexDiscountPercent ?? 15);
  const duplexFactor = printSides === 'Double' ? (1 - duplexDiscountPercent / 100) : 1.0;
  const duplexSavingsPerImpression = printSides === 'Double' ? (adjustedPageRate * (duplexDiscountPercent / 100)) : 0;
  const totalDuplexDiscount = Number((duplexSavingsPerImpression * totalImpressions).toFixed(2));

  // Base printing cost after duplex factor
  const rawPrintingCharges = Number((adjustedPageRate * duplexFactor * totalImpressions).toFixed(2));

  // 4. Finishing / Binding Cost
  const staplePrice = Number(shopPricing.stapleBindingPrice ?? 5);
  const spiralPrice = Number(shopPricing.spiralBindingPrice ?? 30);
  let bindingCharges = 0;
  if (binding === 'Staple') {
    bindingCharges = staplePrice * numCopies;
  } else if (binding === 'Spiral') {
    bindingCharges = spiralPrice * numCopies;
  }

  // Subtotal before promotional discounts
  const subtotal = Number((rawPrintingCharges + bindingCharges).toFixed(2));

  // 5. Volume Discount (Bulk Academic Workloads)
  let volumeDiscount = 0;
  if (totalImpressions >= 250) {
    volumeDiscount = Number((subtotal * 0.15).toFixed(2)); // 15% discount for bulk orders >= 250 pages
  } else if (totalImpressions >= 100) {
    volumeDiscount = Number((subtotal * 0.10).toFixed(2)); // 10% discount for orders >= 100 pages
  }

  // 6. Coupon Discount
  let couponDiscount = 0;
  let appliedCoupon = null;
  const normalizedCoupon = String(couponCode || '').trim().toUpperCase();

  if (normalizedCoupon && COUPON_CATALOG[normalizedCoupon]) {
    const coupon = COUPON_CATALOG[normalizedCoupon];
    if (subtotal >= coupon.minOrder) {
      if (coupon.type === 'percent') {
        couponDiscount = Number(((subtotal - volumeDiscount) * (coupon.value / 100)).toFixed(2));
      } else if (coupon.type === 'flat') {
        couponDiscount = Math.min(coupon.value, subtotal - volumeDiscount);
      }
      appliedCoupon = { code: normalizedCoupon, discount: couponDiscount, description: coupon.description };
    }
  }

  const totalDiscount = Number((volumeDiscount + couponDiscount).toFixed(2));
  const finalTotal = Math.max(1, Math.round(subtotal - totalDiscount));

  return {
    pages: numPages,
    copies: numCopies,
    totalImpressions,
    colorType,
    printSides,
    paperSize,
    binding,
    unitRate: adjustedPageRate,
    printingCharges: rawPrintingCharges,
    bindingCharges,
    duplexSavings: totalDuplexDiscount,
    subtotal,
    volumeDiscount,
    couponDiscount,
    totalDiscount,
    totalAmount: finalTotal,
    appliedCoupon,
    currency: 'INR'
  };
};

// Backwards-compatible export
export const calculateOrderPrice = ({ pages, copies, printType, printSide }) => {
  const result = calculateAuthoritativeQuote({
    pages,
    copies,
    colorType: printType === 'color' ? 'Color' : 'B&W',
    printSides: printSide === 'double' ? 'Double' : 'Single'
  });
  return result.totalAmount;
};