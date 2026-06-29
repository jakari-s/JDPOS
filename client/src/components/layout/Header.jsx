import { Sun, Moon, Monitor, Wifi, WifiOff, Bell } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useSyncStore } from '../../store/syncStore';
import { useAuthStore } from '../../store/authStore';

export default function Header() {
  const { theme, setTheme } = useThemeStore();
  const isOnline = useSyncStore((s) => s.isOnline);
  const pendingTransactions = useSyncStore((s) => s.pendingTransactions);
  const user = useAuthStore((s) => s.user);

  const themeIcons = { light: Sun, dark: Moon, system: Monitor };
  const nextTheme = { light: 'dark', dark: 'system', system: 'light' };
  const ThemeIcon = themeIcons[theme];

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {user?.branch && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {user.branch.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {!isOnline && (
          <div className="flex items-center gap-1 text-amber-500 text-sm">
            <WifiOff className="h-4 w-4" />
            <span>Offline</span>
            {pendingTransactions > 0 && (
              <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
                {pendingTransactions}
              </span>
            )}
          </div>
        )}
        {isOnline && (
          <div className="flex items-center gap-1 text-green-500 text-sm">
            <Wifi className="h-4 w-4" />
          </div>
        )}

        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative">
          <Bell className="h-5 w-5 text-gray-500" />
        </button>

        <button
          onClick={() => setTheme(nextTheme[theme])}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="h-5 w-5 text-gray-500" />
        </button>
      </div>
    </header>
  );
}
