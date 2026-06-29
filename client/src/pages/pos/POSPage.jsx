import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, Pause, Play, User, Percent } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { productsApi, salesApi, customersApi } from '../../api';
import { formatKES } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PaymentModal from './PaymentModal';
import toast from 'react-hot-toast';

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const cart = useCartStore();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async (search = '') => {
    try {
      const { data } = await productsApi.list({ search, limit: '50', isActive: 'true' });
      setProducts(data.data || []);
    } catch {
      toast.error('Failed to load products');
    }
  };

  const handleSearch = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    loadProducts(query);
  }, []);

  const handleAddProduct = (product) => {
    cart.addItem(product);
  };

  const searchCustomers = async (query) => {
    setCustomerSearch(query);
    if (query.length < 2) return;
    try {
      const { data } = await customersApi.list({ search: query, limit: '10' });
      setCustomerResults(data.data || []);
    } catch {
      // ignore
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'F1') { e.preventDefault(); setShowPayment(true); }
      if (e.key === 'F2') { e.preventDefault(); cart.holdSale(); toast.success('Sale held'); }
      if (e.key === 'F3') { e.preventDefault(); setShowHeld(true); }
      if (e.key === 'F4') { e.preventDefault(); setShowCustomer(true); }
      if (e.key === 'Escape') { setShowPayment(false); setShowCustomer(false); setShowHeld(false); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cart]);

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4 -m-6">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              value={searchQuery}
              onChange={handleSearch}
              className="input pl-10"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddProduct(product)}
                className="flex flex-col items-start p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <span className="text-sm font-medium truncate w-full">{product.name}</span>
                <span className="text-xs text-gray-500 mt-1">{product.sku}</span>
                <span className="text-sm font-semibold text-primary-600 mt-1">
                  {formatKES(product.retailPrice)}
                </span>
                {product.stockLevels?.[0] && (
                  <span className={`text-xs mt-1 ${product.stockLevels[0].quantity <= product.minStockLevel ? 'text-red-500' : 'text-gray-400'}`}>
                    Stock: {product.stockLevels[0].quantity}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-96 flex flex-col bg-white dark:bg-gray-800">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Cart</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCustomer(true)} title="Add Customer (F4)">
                <User className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => { cart.holdSale(); toast.success('Sale held'); }} title="Hold Sale (F2)">
                <Pause className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowHeld(true)} title="Recall Sale (F3)">
                <Play className="h-4 w-4" />
                {cart.heldSales.length > 0 && (
                  <span className="ml-1 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {cart.heldSales.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
          {cart.customer && (
            <div className="mt-2 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{cart.customer.name}</span>
                <span className="text-xs text-gray-500 ml-2">
                  {cart.customer.customerType} | Points: {cart.customer.loyaltyPoints}
                </span>
              </div>
              <button onClick={() => cart.setCustomer(null)} className="text-gray-400 hover:text-gray-600">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.items.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-8">Cart is empty</p>
          )}
          {cart.items.map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product.name}</p>
                <p className="text-xs text-gray-500">{formatKES(item.unitPrice)} each</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => cart.updateItemQuantity(index, item.quantity - 1)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => cart.updateItemQuantity(index, parseInt(e.target.value) || 0)}
                  className="w-12 text-center text-sm border border-gray-200 dark:border-gray-700 rounded dark:bg-gray-800"
                />
                <button
                  onClick={() => cart.updateItemQuantity(index, item.quantity + 1)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatKES(item.unitPrice * item.quantity - item.discountAmount)}</p>
                <button onClick={() => cart.removeItem(index)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Totals */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatKES(cart.getSubtotal())}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>VAT (16%)</span>
            <span>{formatKES(cart.getTax())}</span>
          </div>
          {cart.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatKES(cart.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>Total</span>
            <span>{formatKES(cart.getTotal())}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={cart.clearCart}
              disabled={cart.items.length === 0}
            >
              Clear
            </Button>
            <Button
              className="flex-1"
              onClick={() => setShowPayment(true)}
              disabled={cart.items.length === 0}
            >
              Pay (F1)
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        total={cart.getTotal()}
        items={cart.items}
        customer={cart.customer}
        discountAmount={cart.discountAmount}
        onComplete={() => {
          cart.clearCart();
          setShowPayment(false);
        }}
      />

      {/* Customer Search Modal */}
      <Modal isOpen={showCustomer} onClose={() => setShowCustomer(false)} title="Select Customer">
        <Input
          placeholder="Search by name, phone, or account..."
          value={customerSearch}
          onChange={(e) => searchCustomers(e.target.value)}
          autoFocus
        />
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          {customerResults.map((customer) => (
            <button
              key={customer.id}
              onClick={() => {
                cart.setCustomer(customer);
                setShowCustomer(false);
                setCustomerResults([]);
                setCustomerSearch('');
              }}
              className="w-full text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <p className="text-sm font-medium">{customer.name}</p>
              <p className="text-xs text-gray-500">
                {customer.phone} | {customer.customerType} | Points: {customer.loyaltyPoints}
              </p>
            </button>
          ))}
        </div>
      </Modal>

      {/* Held Sales Modal */}
      <Modal isOpen={showHeld} onClose={() => setShowHeld(false)} title="Held Sales">
        {cart.heldSales.length === 0 ? (
          <p className="text-sm text-gray-500">No held sales</p>
        ) : (
          <div className="space-y-2">
            {cart.heldSales.map((sale) => (
              <div key={sale.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{sale.items.length} items</p>
                    <p className="text-xs text-gray-500">
                      Held at {new Date(sale.heldAt).toLocaleTimeString()}
                      {sale.customer && ` - ${sale.customer.name}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      cart.recallSale(sale.id);
                      setShowHeld(false);
                    }}
                  >
                    Recall
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
