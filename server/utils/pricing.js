export const calculateOrderPrice = ({ pages, copies, printType, printSide }) => {
  const numPages = Number(pages) || 1;
  const numCopies = Number(copies) || 1;

  // 1. Determine base page rate based on total volume
  let baseRatePerPage = 3; // Default for < 10 pages
  if (printType === 'color') {
    baseRatePerPage = 10;
  }

  // Tiered Volume Discount: >10 pages gets an 80% multiplier (20% discount)
  if (numPages > 10) {
    baseRatePerPage = baseRatePerPage * 0.80;
  }

  let totalPerPage = baseRatePerPage;

  // 2. Adjust for Double-Sided vs Single-Sided
  if (printSide === 'double') {
    totalPerPage = totalPerPage * 0.85; // 15% sheet reduction discount
  }

  const finalAmount = Math.round(numPages * numCopies * totalPerPage);
  return finalAmount < 1 ? 1 : finalAmount;
};