import { useState } from 'react';
import { Banknote, Smartphone, CreditCard, Receipt, FileText } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { salesApi, mpesaApi, printerApi } from '../../api';
import { formatKES } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function PaymentModal({ isOpen, onClose, total, items, customer, discountAmount, onComplete }) {
  const [payments, setPayments] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [mpesaPending, setMpesaPending] = useState(false);
  const user = useAuthStore((s) => s.user);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);
  const canComplete = totalPaid >= total;

  const addPayment = () => {
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) return;

    setPayments([
      ...payments,
      {
        method: selectedMethod,
        amount: payAmount,
        mpesaPhone: selectedMethod === 'mpesa' ? mpesaPhone : undefined,
      },
    ]);
    setAmount('');
    setMpesaPhone('');
  };

  const removePayment = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleMpesaSTK = async () => {
    if (!mpesaPhone) {
      toast.error('Phone number required');
      return;
    }
    setMpesaPending(true);
    try {
      const { data } = await mpesaApi.stkPush({
        phone: mpesaPhone,
        amount: parseFloat(amount) || remaining,
      });
      toast.success('STK Push sent. Waiting for payment...');
      // Poll for result
      const checkoutId = data.checkoutRequestId;
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 30) {
          clearInterval(pollInterval);
          setMpesaPending(false);
          toast.error('M-Pesa payment timed out');
          return;
        }
        try {
          const { data: status } = await mpesaApi.checkStatus(checkoutId);
          if (status.ResultCode === '0' || status.ResultCode === 0) {
            clearInterval(pollInterval);
            setMpesaPending(false);
            setPayments([
              ...payments,
              {
                method: 'mpesa',
                amount: parseFloat(amount) || remaining,
                mpesaPhone,
                mpesaCode: status.MpesaReceiptNumber || checkoutId,
              },
            ]);
            toast.success('M-Pesa payment received');
          }
        } catch {
          // keep polling
        }
      }, 3000);
    } catch {
      setMpesaPending(false);
      toast.error('Failed to send STK Push');
    }
  };

  const completeSale = async () => {
    setLoading(true);
    try {
      const saleData = {
        customerId: customer?.id || null,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
        })),
        payments: payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          mpesaCode: p.mpesaCode,
          mpesaPhone: p.mpesaPhone,
          reference: p.reference,
        })),
        discountAmount: discountAmount || 0,
      };

      const { data: sale } = await salesApi.create(saleData);
      toast.success(`Sale completed: ${sale.receiptNumber}`);

      // Auto-print receipt
      try {
        const { data: receiptBlob } = await printerApi.getReceipt(sale.id);
        const url = URL.createObjectURL(receiptBlob);
        window.open(url, '_blank');
      } catch {
        // receipt printing optional
      }

      setPayments([]);
      setAmount('');
      onComplete();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { key: 'cash', label: 'Cash', icon: Banknote },
    { key: 'mpesa', label: 'M-Pesa', icon: Smartphone },
    { key: 'card', label: 'Card', icon: CreditCard },
    { key: 'credit', label: 'Credit', icon: FileText },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment" size="lg">
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Payment Methods */}
        <div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {paymentMethods.map((pm) => (
              <button
                key={pm.key}
                onClick={() => setSelectedMethod(pm.key)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  selectedMethod === pm.key
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <pm.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{pm.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={remaining.toFixed(2)}
            />

            {selectedMethod === 'mpesa' && (
              <Input
                label="Phone Number"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="0712345678"
              />
            )}

            <div className="flex gap-2">
              {selectedMethod === 'mpesa' ? (
                <Button className="flex-1" onClick={handleMpesaSTK} loading={mpesaPending}>
                  Send STK Push
                </Button>
              ) : (
                <Button className="flex-1" onClick={addPayment}>
                  Add Payment
                </Button>
              )}
            </div>

            {selectedMethod === 'cash' && (
              <div className="grid grid-cols-3 gap-2">
                {[50, 100, 200, 500, 1000, 5000].map((val) => (
                  <Button
                    key={val}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPayments([...payments, { method: 'cash', amount: val }]);
                    }}
                  >
                    {val.toLocaleString()}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary */}
        <div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-2xl font-bold">
              <span>Total</span>
              <span>{formatKES(total)}</span>
            </div>

            {payments.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500 mb-1">Payments:</p>
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="uppercase">{p.method}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatKES(p.amount)}</span>
                      <button onClick={() => removePayment(i)} className="text-red-400 hover:text-red-600 text-xs">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span>Paid</span>
                <span>{formatKES(totalPaid)}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-sm text-red-500 font-medium">
                  <span>Remaining</span>
                  <span>{formatKES(remaining)}</span>
                </div>
              )}
              {change > 0 && (
                <div className="flex justify-between text-lg font-bold text-green-600 mt-1">
                  <span>Change</span>
                  <span>{formatKES(change)}</span>
                </div>
              )}
            </div>
          </div>

          <Button
            className="w-full mt-4"
            size="lg"
            onClick={completeSale}
            disabled={!canComplete}
            loading={loading}
          >
            Complete Sale
          </Button>
        </div>
      </div>
    </Modal>
  );
}
