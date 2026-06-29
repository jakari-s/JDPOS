import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Select = forwardRef(({ label, error, options, className, placeholder, ...props }, ref) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          'dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
