/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const discount = purchase.discount;
  const quantity = purchase.quantity;
  const salePrice = purchase.sale_price;

  const discountMultiplier = 1 - discount / 100;
  const revenue = salePrice * quantity * discountMultiplier;
  return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;

  if (index === 0) {
    return profit * 0.15;
  } else if (index === 1 || index === 2) {
    return profit * 0.1;
  } else if (index === total - 1) {
    return 0;
  } else {
    return profit * 0.05;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  if (!data) {
    throw new Error("Нет данных");
  }

  if (!Array.isArray(data.sellers) || data.sellers.length === 0) {
    throw new Error("Некорректные данные о продавцах");
  }

  if (!Array.isArray(data.products) || data.products.length === 0) {
    throw new Error("Некорректные данные о товарах");
  }

  if (
    !Array.isArray(data.purchase_records) ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные данные о продажах");
  }

  if (!options || typeof options !== "object") {
    throw new Error("Некорректные опции");
  }

  const { calculateRevenue, calculateBonus } = options;

  if (!calculateRevenue || !calculateBonus) {
    throw new Error("Не хватает функций для расчетов");
  }

  const sellerStats = data.sellers.map((seller) => {
    return {
      id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`,
      revenue: 0,
      profit: 0,
      sales_count: 0,
      products_sold: {},
    };
  });

  const sellerIndex = {};
  sellerStats.forEach((seller) => {
    sellerIndex[seller.id] = seller;
  });

  const productIndex = {};
  data.products.forEach((product) => {
    productIndex[product.sku] = product;
  });

  data.purchase_records.forEach((receipt) => {
    const seller = sellerIndex[receipt.seller_id];

    if (!seller) {
      return;
    }

    seller.sales_count += 1;
    seller.revenue += receipt.total_amount - receipt.total_discount;

    receipt.items.forEach((item) => {
      const product = productIndex[item.sku];

      if (!product) {
        return;
      }

      const itemRevenue = calculateRevenue(item, product);
      const cost = product.purchase_price * item.quantity;
      const itemProfit = itemRevenue - cost;

      seller.profit += itemProfit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  sellerStats.sort((sellerA, sellerB) => {
    return sellerB.profit - sellerA.profit;
  });

  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);
  });

  sellerStats.forEach((seller) => {
    const topProductsArray = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => {
        return { sku, quantity };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    seller.top_products = topProductsArray;
  });

  const result = sellerStats.map((seller) => {
    return {
      seller_id: seller.id,
      name: seller.name,
      revenue: +seller.revenue.toFixed(2),
      profit: +seller.profit.toFixed(2),
      sales_count: seller.sales_count,
      top_products: seller.top_products,
      bonus: +seller.bonus.toFixed(2),
    };
  });

  return result;
}
