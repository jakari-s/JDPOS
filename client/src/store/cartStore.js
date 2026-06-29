import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],
  customer: null,
  discountAmount: 0,
  notes: '',
  heldSales: [],

  addItem: (product, quantity = 1, variant = null) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.productId === product.id && item.variantId === (variant?.id || null)
      );

      if (existingIndex >= 0) {
        const updated = [...state.items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return { items: updated };
      }

      const priceForCustomer = getPriceForCustomer(product, state.customer);

      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            variantId: variant?.id || null,
            product,
            variant,
            quantity,
            unitPrice: priceForCustomer,
            discountAmount: 0,
          },
        ],
      };
    });
  },

  updateItemQuantity: (index, quantity) => {
    if (quantity <= 0) {
      return get().removeItem(index);
    }
    set((state) => {
      const updated = [...state.items];
      updated[index] = { ...updated[index], quantity };
      return { items: updated };
    });
  },

  updateItemDiscount: (index, discountAmount) => {
    set((state) => {
      const updated = [...state.items];
      updated[index] = { ...updated[index], discountAmount };
      return { items: updated };
    });
  },

  updateItemPrice: (index, unitPrice) => {
    set((state) => {
      const updated = [...state.items];
      updated[index] = { ...updated[index], unitPrice };
      return { items: updated };
    });
  },

  removeItem: (index) => {
    set((state) => ({
      items: state.items.filter((_, i) => i !== index),
    }));
  },

  setCustomer: (customer) => set({ customer }),

  setDiscount: (discountAmount) => set({ discountAmount }),

  setNotes: (notes) => set({ notes }),

  holdSale: () => {
    const state = get();
    if (state.items.length === 0) return;

    set((s) => ({
      heldSales: [
        ...s.heldSales,
        {
          id: Date.now().toString(),
          items: s.items,
          customer: s.customer,
          discountAmount: s.discountAmount,
          notes: s.notes,
          heldAt: new Date().toISOString(),
        },
      ],
      items: [],
      customer: null,
      discountAmount: 0,
      notes: '',
    }));
  },

  recallSale: (id) => {
    set((state) => {
      const sale = state.heldSales.find((s) => s.id === id);
      if (!sale) return state;

      return {
        items: sale.items,
        customer: sale.customer,
        discountAmount: sale.discountAmount,
        notes: sale.notes,
        heldSales: state.heldSales.filter((s) => s.id !== id),
      };
    });
  },

  clearCart: () =>
    set({
      items: [],
      customer: null,
      discountAmount: 0,
      notes: '',
    }),

  get subtotal() {
    return get().items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity - item.discountAmount,
      0
    );
  },

  getSubtotal: () => {
    return get().items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity - item.discountAmount,
      0
    );
  },

  getTax: () => {
    const items = get().items;
    return items.reduce((sum, item) => {
      const lineTotal = item.unitPrice * item.quantity - item.discountAmount;
      const taxClass = item.product?.taxClass || 'standard';
      const rate = taxClass === 'standard' ? 0.16 : 0;
      const tax = lineTotal - lineTotal / (1 + rate);
      return sum + tax;
    }, 0);
  },

  getTotal: () => {
    return get().getSubtotal() - get().discountAmount;
  },
}));

function getPriceForCustomer(product, customer) {
  if (!customer) return Number(product.retailPrice);
  switch (customer.customerType) {
    case 'wholesale':
      return Number(product.wholesalePrice || product.retailPrice);
    case 'vip':
      return Number(product.vipPrice || product.retailPrice);
    default:
      return Number(product.retailPrice);
  }
}
