import { useState } from 'react';
import { Building, Receipt, Printer, Globe, Bell } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useThemeStore } from '../../store/themeStore';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const [tab, setTab] = useState('general');

  const tabs = [
    { key: 'general', label: 'General', icon: Building },
    { key: 'receipt', label: 'Receipt', icon: Receipt },
    { key: 'printer', label: 'Printer', icon: Printer },
    { key: 'integrations', label: 'Integrations', icon: Globe },
    { key: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="flex gap-6">
        <div className="w-48 space-y-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${tab === t.key ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1">
          {tab === 'general' && (
            <Card title="General Settings">
              <div className="space-y-4 max-w-lg">
                <Input label="Company Name" placeholder="Kenya POS" />
                <Input label="Company PIN" placeholder="P000000000X" />
                <Input label="VAT Number" />
                <Input label="Phone" placeholder="+254 7XX XXX XXX" />
                <Input label="Address" />
                <Select label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]} />
                <Button onClick={() => toast.success('Settings saved')}>Save</Button>
              </div>
            </Card>
          )}

          {tab === 'receipt' && (
            <Card title="Receipt Settings">
              <div className="space-y-4 max-w-lg">
                <Input label="Receipt Header" placeholder="Company name at top of receipt" />
                <Input label="Receipt Footer" placeholder="Thank you for your purchase!" />
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="showQR" className="rounded" defaultChecked />
                  <label htmlFor="showQR" className="text-sm">Show eTIMS QR code on receipt</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="autoSms" className="rounded" />
                  <label htmlFor="autoSms" className="text-sm">Auto-send SMS receipt</label>
                </div>
                <Button onClick={() => toast.success('Saved')}>Save</Button>
              </div>
            </Card>
          )}

          {tab === 'printer' && (
            <Card title="Printer Settings">
              <div className="space-y-4 max-w-lg">
                <Select label="Paper Width" options={[{ value: '80', label: '80mm' }, { value: '58', label: '58mm' }]} />
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="autoPrint" className="rounded" defaultChecked />
                  <label htmlFor="autoPrint" className="text-sm">Auto-print after sale</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="cashDrawer" className="rounded" defaultChecked />
                  <label htmlFor="cashDrawer" className="text-sm">Open cash drawer on cash sale</label>
                </div>
                <Button onClick={() => toast.success('Saved')}>Save</Button>
              </div>
            </Card>
          )}

          {tab === 'integrations' && (
            <div className="space-y-4">
              <Card title="M-Pesa">
                <div className="space-y-4 max-w-lg">
                  <Input label="Consumer Key" type="password" placeholder="From Daraja portal" />
                  <Input label="Consumer Secret" type="password" />
                  <Input label="Shortcode" />
                  <Input label="Passkey" type="password" />
                  <Select label="Environment" options={[{ value: 'sandbox', label: 'Sandbox' }, { value: 'production', label: 'Production' }]} />
                  <Button onClick={() => toast.success('Saved')}>Save</Button>
                </div>
              </Card>
              <Card title="KRA eTIMS">
                <div className="space-y-4 max-w-lg">
                  <Input label="Device ID" />
                  <Input label="API Key" type="password" />
                  <Input label="TIN" />
                  <Button onClick={() => toast.success('Saved')}>Save</Button>
                </div>
              </Card>
            </div>
          )}

          {tab === 'notifications' && (
            <Card title="Notification Settings">
              <div className="space-y-4 max-w-lg">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="lowStockAlert" className="rounded" defaultChecked />
                  <label htmlFor="lowStockAlert" className="text-sm">Low stock alerts</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="expiryAlert" className="rounded" defaultChecked />
                  <label htmlFor="expiryAlert" className="text-sm">Expiry date alerts</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="etimsAlert" className="rounded" defaultChecked />
                  <label htmlFor="etimsAlert" className="text-sm">eTIMS submission failures</label>
                </div>
                <Button onClick={() => toast.success('Saved')}>Save</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
