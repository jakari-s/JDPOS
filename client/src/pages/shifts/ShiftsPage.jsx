import { useState, useEffect } from 'react';
import { Clock, Play, Square, DollarSign, FileText } from 'lucide-react';
import { shiftsApi } from '../../api';
import { formatKES, formatDateTime } from '../../lib/utils';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

export default function ShiftsPage() {
  const [activeShift, setActiveShift] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showCashMove, setShowCashMove] = useState(false);
  const [showXReport, setShowXReport] = useState(false);
  const [xReport, setXReport] = useState(null);
  const [openingFloat, setOpeningFloat] = useState('');
  const [closingCounted, setClosingCounted] = useState('');
  const [cashMoveData, setCashMoveData] = useState({ type: 'cash_drop', amount: '', description: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [activeRes, listRes] = await Promise.all([
        shiftsApi.getActive().catch(() => null),
        shiftsApi.list({ limit: '50' }),
      ]);
      setActiveShift(activeRes?.data || null);
      setShifts(listRes.data?.data || []);
    } catch { toast.error('Failed to load shifts'); }
    finally { setLoading(false); }
  };

  const openShift = async () => {
    try {
      await shiftsApi.open({ openingFloat: parseFloat(openingFloat) || 0 });
      toast.success('Shift opened');
      setShowOpen(false);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const closeShift = async () => {
    if (!activeShift) return;
    try {
      await shiftsApi.close(activeShift.id, { closingCashCounted: parseFloat(closingCounted) || 0 });
      toast.success('Shift closed');
      setShowClose(false);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const addCashMovement = async () => {
    if (!activeShift) return;
    try {
      await shiftsApi.addCashMovement(activeShift.id, {
        type: cashMoveData.type,
        amount: parseFloat(cashMoveData.amount),
        description: cashMoveData.description,
      });
      toast.success('Cash movement recorded');
      setShowCashMove(false);
      setCashMoveData({ type: 'cash_drop', amount: '', description: '' });
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const viewXReport = async () => {
    try {
      const { data } = await shiftsApi.getXReport();
      setXReport(data);
      setShowXReport(true);
    } catch { toast.error('Failed to generate X-Report'); }
  };

  const columns = [
    { accessorKey: 'user', header: 'Cashier', cell: ({ getValue }) => getValue()?.name },
    { accessorKey: 'startedAt', header: 'Started', cell: ({ getValue }) => formatDateTime(getValue()) },
    { accessorKey: 'endedAt', header: 'Ended', cell: ({ getValue }) => getValue() ? formatDateTime(getValue()) : '-' },
    { accessorKey: 'openingFloat', header: 'Float', cell: ({ getValue }) => formatKES(getValue()) },
    { accessorKey: 'closingCashExpected', header: 'Expected', cell: ({ getValue }) => getValue() ? formatKES(getValue()) : '-' },
    { accessorKey: 'closingCashCounted', header: 'Counted', cell: ({ getValue }) => getValue() ? formatKES(getValue()) : '-' },
    { accessorKey: 'variance', header: 'Variance', cell: ({ getValue }) => getValue() != null ? <span className={Number(getValue()) < 0 ? 'text-red-500' : 'text-green-500'}>{formatKES(getValue())}</span> : '-' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge variant={getValue() === 'open' ? 'success' : 'default'}>{getValue()}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shifts & Reconciliation</h1>
        <div className="flex gap-2">
          {activeShift ? (
            <>
              <Button variant="outline" onClick={() => setShowCashMove(true)}><DollarSign className="h-4 w-4 mr-2" /> Cash Drop/Payout</Button>
              <Button variant="outline" onClick={viewXReport}><FileText className="h-4 w-4 mr-2" /> X-Report</Button>
              <Button variant="danger" onClick={() => setShowClose(true)}><Square className="h-4 w-4 mr-2" /> Close Shift</Button>
            </>
          ) : (
            <Button onClick={() => setShowOpen(true)}><Play className="h-4 w-4 mr-2" /> Open Shift</Button>
          )}
        </div>
      </div>

      {activeShift && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-4">
            <Clock className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium">Active Shift</p>
              <p className="text-sm text-gray-500">Started: {formatDateTime(activeShift.startedAt)} | Float: {formatKES(activeShift.openingFloat)}</p>
            </div>
          </div>
        </Card>
      )}

      {loading ? <div className="flex justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div> : <DataTable data={shifts} columns={columns} />}

      <Modal isOpen={showOpen} onClose={() => setShowOpen(false)} title="Open Shift" size="sm">
        <Input label="Opening Float (KES)" type="number" step="0.01" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowOpen(false)}>Cancel</Button>
          <Button onClick={openShift}>Open Shift</Button>
        </div>
      </Modal>

      <Modal isOpen={showClose} onClose={() => setShowClose(false)} title="Close Shift" size="sm">
        <Input label="Counted Cash (KES)" type="number" step="0.01" value={closingCounted} onChange={(e) => setClosingCounted(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowClose(false)}>Cancel</Button>
          <Button variant="danger" onClick={closeShift}>Close Shift</Button>
        </div>
      </Modal>

      <Modal isOpen={showCashMove} onClose={() => setShowCashMove(false)} title="Cash Drop / Payout" size="sm">
        <div className="space-y-4">
          <div className="flex gap-2">
            {['cash_drop', 'payout'].map((t) => (
              <button key={t} onClick={() => setCashMoveData({ ...cashMoveData, type: t })} className={`flex-1 p-2 text-sm rounded-lg border-2 ${cashMoveData.type === t ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                {t === 'cash_drop' ? 'Cash Drop' : 'Payout'}
              </button>
            ))}
          </div>
          <Input label="Amount" type="number" step="0.01" value={cashMoveData.amount} onChange={(e) => setCashMoveData({ ...cashMoveData, amount: e.target.value })} />
          <Input label="Description" value={cashMoveData.description} onChange={(e) => setCashMoveData({ ...cashMoveData, description: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCashMove(false)}>Cancel</Button>
            <Button onClick={addCashMovement}>Record</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showXReport} onClose={() => setShowXReport(false)} title="X-Report (Interim)" size="md">
        {xReport && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>Total Sales: {formatKES(xReport.totalSales)}</div>
              <div>Transactions: {xReport.salesCount}</div>
              <div>Cash Sales: {formatKES(xReport.cashTotal)}</div>
              <div>M-Pesa Sales: {formatKES(xReport.mpesaTotal)}</div>
              <div>Refunds: {formatKES(xReport.totalRefunds)}</div>
              <div>Opening Float: {formatKES(xReport.openingFloat)}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
